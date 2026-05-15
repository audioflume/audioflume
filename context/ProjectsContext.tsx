"use client";

import type { Project } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ProjectsContextValue = {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  loading: boolean;
  error: string | null;
  refetchProjects: () => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

let cachedUserId: string | null = null;
let cachedProjects: Project[] | null = null;
let pendingProjectsRequest: Promise<Project[]> | null = null;

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

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchProjects = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!isLoaded) return;

      if (!userId) {
        cachedUserId = null;
        cachedProjects = null;
        pendingProjectsRequest = null;

        if (!mountedRef.current) return;

        setProjects([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (!force && cachedUserId === userId && cachedProjects) {
        setProjects(cachedProjects);
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

        const nextProjects = await pendingProjectsRequest;

        cachedUserId = userId;
        cachedProjects = nextProjects;
        pendingProjectsRequest = null;

        if (!mountedRef.current) return;

        setProjects(nextProjects);
      } catch (err) {
        pendingProjectsRequest = null;

        if (!mountedRef.current) return;

        setError(
          err instanceof Error ? err.message : "Failed to load projects",
        );

        if (!cachedProjects || cachedUserId !== userId) {
          setProjects([]);
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
    [projects, loading, error, refetchProjects],
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjectsContext() {
  const context = useContext(ProjectsContext);

  if (!context) {
    throw new Error("useProjectsContext must be used inside ProjectsProvider");
  }

  return context;
}
