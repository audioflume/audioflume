"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import Toast from "@/components/Toast";
import ModalShell from "@/components/ModalShell";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import { FolderGlyph } from "@/components/project-browser/ProjectBrowserGlyphs";
import "@/components/project-browser/ProjectFileBrowser.module.css";

const RECENT_PROJECT_IDS_KEY = "filmwaveRecentProjectIds";
const RECENT_PROJECT_LIMIT = 3;

type AddToProjectModalProps = {
  isOpen: boolean;
  song: Song | null;
  onClose: () => void;
};

type ProjectResponseBody = {
  error?: string;
  selected_project_ids?: Array<number | string>;
};

function readRecentProjectIds() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_PROJECT_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

function writeRecentProjectIds(ids: number[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(RECENT_PROJECT_IDS_KEY, JSON.stringify(ids));
}

async function readProjectResponse(res: Response): Promise<ProjectResponseBody | null> {
  const text = await res.text();

  if (!text.trim()) return null;

  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      res.ok ? "Invalid project response" : "Failed to update project",
    );
  }

  try {
    return JSON.parse(text) as ProjectResponseBody;
  } catch {
    throw new Error(
      res.ok ? "Invalid project response" : "Failed to update project",
    );
  }
}

function SongPreview({ song }: { song: Song }) {
  const cover = typeof song.coverArt === "string" && song.coverArt.trim()
    ? song.coverArt
    : null;

  return (
    <div className="flex flex-shrink-0 items-center justify-center px-5 pb-4 pt-0 text-center">
      <div className="flex min-w-0 items-center justify-center gap-2">
        <span className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-md bg-[var(--bg-secondary)]">
          {cover ? (
            <Image
              src={cover}
              alt={song.title}
              fill
              sizes="24px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
              <PlaylistIcon size={10} />
            </span>
          )}
        </span>

        <span className="block max-w-[300px] truncate text-[12px] font-medium tracking-[-0.015em] text-[var(--text-primary)]">
          {song.title} by {song.artist}
        </span>
      </div>
    </div>
  );
}

function ProjectThumbnail() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-visible">
      <span className="-translate-y-1 scale-[0.56]">
        <FolderGlyph />
      </span>
    </span>
  );
}

export default function AddToProjectModal({
  isOpen,
  song,
  onClose,
}: AddToProjectModalProps) {
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    refetchProjects,
  } = useProjectsContext();

  const [recentProjectIds, setRecentProjectIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [pendingProjectIds, setPendingProjectIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setRecentProjectIds(readRecentProjectIds());
  }, [isOpen]);

  useEffect(() => {
    if (!toastMessage) return;

    const timeout = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!isOpen || !song) return;

    const activeSong = song;
    let cancelled = false;

    async function loadSelectedProjects() {
      setSelectedLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/songs/${encodeURIComponent(activeSong.id)}/projects`,
        );
        const data = await readProjectResponse(res);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load project selections");
        }

        if (!Array.isArray(data?.selected_project_ids)) {
          throw new Error("Invalid project selections response");
        }

        if (cancelled) return;

        setSelectedIds(
          new Set<number>(
            data.selected_project_ids.map((id: number | string) => Number(id)),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load project selections",
          );
          setSelectedIds(new Set());
        }
      } finally {
        if (!cancelled) {
          setSelectedLoading(false);
        }
      }
    }

    loadSelectedProjects();

    return () => {
      cancelled = true;
    };
  }, [isOpen, song]);

  const displayedProjects = useMemo(() => {
    const recentIdSet = new Set(recentProjectIds);

    const recent = projects
      .filter((project) => recentIdSet.has(project.id))
      .sort(
        (a, b) =>
          recentProjectIds.indexOf(a.id) - recentProjectIds.indexOf(b.id),
      );

    const remaining = projects
      .filter((project) => !recentIdSet.has(project.id))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );

    return [...recent, ...remaining];
  }, [projects, recentProjectIds]);

  function updateRecentProjects(projectId: number) {
    const current = readRecentProjectIds();

    const next = [
      projectId,
      ...current.filter((id) => id !== projectId),
    ].slice(0, RECENT_PROJECT_LIMIT);

    writeRecentProjectIds(next);
    setRecentProjectIds(next);
  }

  async function handleProjectClick(project: { id: number; name: string }) {
    if (!song || selectedLoading || pendingProjectIds.has(project.id)) return;

    const activeSong = song;
    const wasSelected = selectedIds.has(project.id);
    const nextSelected = !wasSelected;

    setPendingProjectIds((current) => new Set(current).add(project.id));
    setError(null);
    setSelectedIds((current) => {
      const next = new Set(current);

      if (nextSelected) next.add(project.id);
      else next.delete(project.id);

      return next;
    });

    try {
      const res = await fetch(
        `/api/songs/${encodeURIComponent(activeSong.id)}/projects`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_id: project.id,
            selected: nextSelected,
          }),
        },
      );

      const data = await readProjectResponse(res);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update project");
      }

      if (nextSelected) {
        updateRecentProjects(project.id);
        setToastMessage(`Added to "${project.name}"`);
      } else {
        setToastMessage(`Removed from "${project.name}"`);
      }
    } catch (err) {
      setSelectedIds((current) => {
        const next = new Set(current);

        if (wasSelected) next.add(project.id);
        else next.delete(project.id);

        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setPendingProjectIds((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  }

  if (!song) return null;

  const loading = projectsLoading || selectedLoading;
  const displayedError = error || projectsError;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        title="Add to Project"
        onClose={onClose}
        closeLabel="Close add to project modal"
        maxWidth="max-w-[430px]"
        maxHeight="420px"
        centerTitle
        bodyClassName="flex min-h-0 flex-1 flex-col px-5 pb-0"
        contentClassName="h-[420px] max-h-[calc(100vh-64px)] [&>div:first-child]:h-[58px] [&>div:first-child]:items-end [&>div:first-child]:pb-2"
      >
        <SongPreview song={song} />

        <div className="-mx-5 flex min-h-0 flex-1 flex-col border-t border-[var(--border)]">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading && (
              <div className="grid gap-0.5 pt-1">
                {Array.from({ length: projects.length || 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex min-h-[52px] items-center gap-3 rounded-xl p-2"
                  >
                    <div className="h-9 w-9 animate-pulse rounded-lg bg-[var(--bg-tertiary)]" />
                    <div className="h-3 w-32 animate-pulse rounded bg-[var(--bg-tertiary)]" />
                  </div>
                ))}
              </div>
            )}

            {!loading && displayedError && (
              <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="text-xs font-medium text-[var(--danger)]">
                  {displayedError}
                </div>

                {projectsError && (
                  <button
                    type="button"
                    onClick={refetchProjects}
                    className="h-8 rounded-md bg-[var(--text-primary)] px-3.5 text-xs font-semibold text-[var(--bg-primary)] transition hover:opacity-80"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}

            {!loading && !displayedError && displayedProjects.length === 0 && (
              <div className="flex min-h-full items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
                You don&apos;t have any projects yet.
              </div>
            )}

            {!loading &&
              !displayedError &&
              displayedProjects.length > 0 &&
              displayedProjects.map((project) => {
                const isSelected = selectedIds.has(project.id);
                const isPending = pendingProjectIds.has(project.id);

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleProjectClick(project)}
                    disabled={isPending}
                    className="group flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-60"
                  >
                    <ProjectThumbnail />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                        {project.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                        {isSelected ? "Added" : "Click to add"}
                      </span>
                    </span>

                    {isSelected && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-primary)]">
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </ModalShell>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "96px" : "24px"}
      />
    </>
  );
}
