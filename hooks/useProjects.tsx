"use client";

import type { Project } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseProjectsValue = {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  loading: boolean;
  error: string | null;
  refetchProjects: () => Promise<void>;
};

const PROJECTS_UPDATED_EVENT = "filmwave-projects-updated";

let cachedUserId: string | null = null;
let cachedProjects: Project[] | null = null;
let pendingProjectsRequest: Promise<Project[]> | null = null;

function normalizeProjects(projects: Project[]) {
  const projectMap = new Map<number, Project>();

  projects.forEach((project) => {
    projectMap.set(project.id, project);
  });

  return [...projectMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

function notifyProjectsUpdated(projects: Project[]) {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<Project[]>(PROJECTS_UPDATED_EVENT, {
        detail: projects,
      }),
    );
  }, 0);
}

async function requestProjects() {
  const res = await fetch("/api/projects");
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || "Failed to load projects");
  }

  if (!Array.isArray(data)) {
    throw new Error("Invalid projects response");
  }

  return data as Project[];
}

export function useProjects(): UseProjectsValue {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;

  const [projects, setProjectsState] = useState<Project[]>(() =>
    cachedUserId === userId && cachedProjects ? cachedProjects : [],
  );
  const [loading, setLoading] = useState(() => !cachedProjects);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const setProjects = useCallback<
    React.Dispatch<React.SetStateAction<Project[]>>
  >(
    (nextValue) => {
      setProjectsState((current) => {
        const nextProjects =
          typeof nextValue === "function" ? nextValue(current) : nextValue;

        const normalizedProjects = normalizeProjects(nextProjects);

        cachedUserId = userId;
        cachedProjects = normalizedProjects;

        notifyProjectsUpdated(normalizedProjects);

        return normalizedProjects;
      });
    },
    [userId],
  );

  const fetchProjects = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!isLoaded) return;

      if (!userId) {
        cachedUserId = null;
        cachedProjects = null;
        pendingProjectsRequest = null;

        if (!mountedRef.current) return;

        setProjectsState([]);
        setLoading(false);
        setError(null);
        notifyProjectsUpdated([]);
        return;
      }

      if (!force && cachedUserId === userId && cachedProjects) {
        setProjectsState(cachedProjects);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (force || cachedUserId !== userId || !pendingProjectsRequest) {
          pendingProjectsRequest = requestProjects();
        }

        const nextProjects = normalizeProjects(await pendingProjectsRequest);

        cachedUserId = userId;
        cachedProjects = nextProjects;
        pendingProjectsRequest = null;

        if (!mountedRef.current) return;

        setProjectsState(nextProjects);
        notifyProjectsUpdated(nextProjects);
      } catch (err) {
        pendingProjectsRequest = null;

        if (!mountedRef.current) return;

        setError(
          err instanceof Error ? err.message : "Failed to load projects",
        );

        if (!cachedProjects || cachedUserId !== userId) {
          setProjectsState([]);
          notifyProjectsUpdated([]);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [isLoaded, userId],
  );

  const refetchProjects = useCallback(async () => {
    cachedProjects = null;
    pendingProjectsRequest = null;
    await fetchProjects({ force: true });
  }, [fetchProjects]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    function handleProjectsUpdated(event: Event) {
      const customEvent = event as CustomEvent<Project[]>;

      if (!Array.isArray(customEvent.detail)) return;

      setProjectsState(normalizeProjects(customEvent.detail));
    }

    window.addEventListener(PROJECTS_UPDATED_EVENT, handleProjectsUpdated);

    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, handleProjectsUpdated);
    };
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const value = useMemo(
    () => ({
      projects,
      setProjects,
      loading,
      error,
      refetchProjects,
    }),
    [projects, setProjects, loading, error, refetchProjects],
  );

  return value;
}
