"use client";

import { useEffect, useState } from "react";
import type { ProjectSyncState } from "@/lib/project-detail/projectDetailUtils";
import type { Project } from "@/lib/types";

type ProjectDetailHeaderProps = {
  assetsLoaded: boolean;
  project: Project;
  syncLabel: string;
  syncState: ProjectSyncState;
  totalFileCount: number;
};

type ProjectSyncOperationsResponse = {
  operations?: Array<{ id: string }>;
};

const SYNC_OPERATIONS_IDLE_POLL_MS = 15000;
const SYNC_OPERATIONS_ACTIVE_POLL_MS = 3000;

function formatCompactSyncLabel(label: string) {
  if (label === "Syncing" || label === "Sync error") return label;
  return label.replace(/^Last synced at /, "Synced ");
}

export default function ProjectDetailHeader({
  assetsLoaded,
  project,
  syncLabel,
  syncState,
  totalFileCount,
}: ProjectDetailHeaderProps) {
  const [hasActiveSyncOperations, setHasActiveSyncOperations] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let abortController: AbortController | null = null;

    function clearPollTimer() {
      if (!timeoutId) return;
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    function scheduleNextPoll(delay: number) {
      clearPollTimer();

      if (cancelled || document.hidden) return;

      timeoutId = window.setTimeout(() => {
        void loadSyncOperations();
      }, delay);
    }

    async function loadSyncOperations() {
      if (cancelled || document.hidden) return;

      abortController?.abort();
      abortController = new AbortController();

      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(String(project.id))}/sync-operations`,
          { cache: "no-store", signal: abortController.signal },
        );
        const data = (await res.json()) as ProjectSyncOperationsResponse;
        const hasActiveOperations = Boolean(data.operations?.length);

        if (!cancelled) {
          setHasActiveSyncOperations(hasActiveOperations);
          scheduleNextPoll(
            hasActiveOperations
              ? SYNC_OPERATIONS_ACTIVE_POLL_MS
              : SYNC_OPERATIONS_IDLE_POLL_MS,
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        if (!cancelled) {
          setHasActiveSyncOperations(false);
          scheduleNextPoll(SYNC_OPERATIONS_IDLE_POLL_MS);
        }
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearPollTimer();
        abortController?.abort();
        return;
      }

      void loadSyncOperations();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void loadSyncOperations();

    return () => {
      cancelled = true;
      clearPollTimer();
      abortController?.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [project.id]);

  const visibleSyncState: ProjectSyncState = hasActiveSyncOperations
    ? "syncing"
    : syncState;
  const visibleSyncLabel = hasActiveSyncOperations
    ? "Syncing"
    : formatCompactSyncLabel(syncLabel);

  return (
    <section className="project-detail-hero">
      <div className="project-detail-header-row">
        <h1 className="project-detail-title">{project.name}</h1>
        <div className="project-detail-meta" aria-label="Project details">
          <span>Workspace</span>
          {assetsLoaded && (
            <>
              <span className="project-detail-dot">·</span>
              <span>
                {totalFileCount} {totalFileCount === 1 ? "file" : "files"}
              </span>
            </>
          )}
          <span className="project-detail-dot">·</span>
          <span className={`project-sync-status is-${visibleSyncState}`}>
            <span>{visibleSyncLabel}</span>
            <span className="project-sync-status-dot" />
          </span>
        </div>
      </div>
      {project.description && (
        <p className="project-detail-description">{project.description}</p>
      )}
    </section>
  );
}
