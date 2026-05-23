"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import Toast from "@/components/Toast";
import ModalShell from "@/components/ModalShell";
import { modalPrimaryButtonClass } from "@/components/uiClasses";
import CheckIcon from "@/components/icons/CheckIcon";
import FolderIcon from "@/components/icons/FolderIcon";

const RECENT_PROJECT_IDS_KEY = "filmwaveRecentProjectIds";
const RECENT_PROJECT_LIMIT = 3;

type AddToProjectModalProps = {
  isOpen: boolean;
  song: Song | null;
  onClose: () => void;
};

function formatProjectNames(names: string[]) {
  return names.map((name) => `"${name}"`).join(", ");
}

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
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load project selections");
        }

        if (!Array.isArray(data?.selected_project_ids)) {
          throw new Error("Invalid project selections response");
        }

        if (cancelled) return;

        const selected = new Set<number>(
          data.selected_project_ids.map((id: number | string) => Number(id)),
        );

        setInitialSelectedIds(selected);
        setSelectedIds(new Set(selected));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load project selections",
          );
          setInitialSelectedIds(new Set());
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

  const hasChanges = useMemo(() => {
    if (initialSelectedIds.size !== selectedIds.size) return true;

    for (const id of selectedIds) {
      if (!initialSelectedIds.has(id)) return true;
    }

    return false;
  }, [initialSelectedIds, selectedIds]);

  function toggleProject(projectId: number) {
    if (selectedLoading) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }

      return next;
    });
  }

  function updateRecentProjects(addedProjectIds: number[]) {
    if (addedProjectIds.length === 0) return;

    const current = readRecentProjectIds();

    const next = [
      ...addedProjectIds,
      ...current.filter((id) => !addedProjectIds.includes(id)),
    ].slice(0, RECENT_PROJECT_LIMIT);

    writeRecentProjectIds(next);
    setRecentProjectIds(next);
  }

  async function handleSave() {
    if (!song || saving || selectedLoading) return;

    const activeSong = song;

    setSaving(true);
    setError(null);

    try {
      const addedProjectIds: number[] = [];
      const addedProjectNames: string[] = [];
      const removedProjectNames: string[] = [];

      const updates = projects
        .map((project) => {
          const wasSelected = initialSelectedIds.has(project.id);
          const isSelected = selectedIds.has(project.id);

          if (wasSelected === isSelected) return null;

          if (isSelected) {
            addedProjectIds.push(project.id);
            addedProjectNames.push(project.name);
          } else {
            removedProjectNames.push(project.name);
          }

          return {
            project_id: project.id,
            selected: isSelected,
          };
        })
        .filter(
          (update): update is { project_id: number; selected: boolean } =>
            update !== null,
        );

      for (const update of updates) {
        const res = await fetch(
          `/api/songs/${encodeURIComponent(activeSong.id)}/projects`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(update),
          },
        );

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to update project");
        }
      }

      setInitialSelectedIds(new Set(selectedIds));
      updateRecentProjects(addedProjectIds);

      if (addedProjectNames.length > 0 && removedProjectNames.length > 0) {
        setToastMessage(
          `Added to ${formatProjectNames(
            addedProjectNames,
          )} · Removed from ${formatProjectNames(removedProjectNames)}`,
        );
      } else if (addedProjectNames.length > 0) {
        setToastMessage(`Added to ${formatProjectNames(addedProjectNames)}`);
      } else if (removedProjectNames.length > 0) {
        setToastMessage(
          `Removed from ${formatProjectNames(removedProjectNames)}`,
        );
      }

      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save project changes",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!song) return null;

  const loading = projectsLoading;
  const displayedError = error || projectsError;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        title="Add to Project"
        onClose={onClose}
        closeLabel="Close add to project modal"
        centerTitle
        maxHeight="480px"
        bodyScroll
        bodyClassName="flex flex-col pb-0"
        footerClassName="justify-center"
        footer={
          <button
            type="button"
            onClick={handleSave}
            className={`${modalPrimaryButtonClass} w-full`}
            disabled={saving || loading || selectedLoading || !hasChanges}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        }
      >
        {/* Song strip — no bottom margin so scroll area starts flush at the border */}
        <div className="-mx-5 flex flex-shrink-0 items-center gap-3 border-b border-[var(--border)] pb-4 px-5">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-tertiary)]">
            {song.coverArt && (
              <Image
                src={song.coverArt}
                alt={song.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--text-primary)]">
              {song.title}
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {song.artist}
            </div>
          </div>
        </div>

        {/* Project rows — starts immediately at the border, clips flush */}
        <div className="-mx-5 min-h-[200px] flex-1 overflow-y-auto px-2 pb-2">
          {/* Loading skeleton */}
          {(loading || selectedLoading) && (
            <div className="grid gap-0.5 pt-2">
              {Array.from({ length: projects.length || 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex h-11 items-center gap-3 rounded-xl px-3"
                >
                  <div className="h-7 w-7 animate-pulse rounded-lg bg-[var(--bg-tertiary)]" />
                  <div className="h-2.5 w-28 animate-pulse rounded bg-[var(--bg-tertiary)]" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && !selectedLoading && displayedError && (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 text-center">
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

          {/* Empty state */}
          {!loading &&
            !selectedLoading &&
            !displayedError &&
            displayedProjects.length === 0 && (
              <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
                You don&apos;t have any projects yet.
              </div>
            )}

          {/* Project rows */}
          {!loading &&
            !selectedLoading &&
            !displayedError &&
            displayedProjects.length > 0 &&
            displayedProjects.map((project) => {
              const isSelected = selectedIds.has(project.id);

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => toggleProject(project.id)}
                  disabled={selectedLoading}
                  className={`group flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-70 ${
                    isSelected
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[var(--accent)] text-black"
                        : "bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--bg-hover-strong)] group-hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {isSelected ? (
                      <CheckIcon size={13} />
                    ) : (
                      <FolderIcon size={13} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                </button>
              );
            })}
        </div>
      </ModalShell>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "96px" : "24px"}
      />
    </>
  );
}
