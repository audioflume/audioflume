"use client";

import SearchIcon from "@/components/icons/SearchIcon";
import type { ProjectSyncState } from "@/lib/project-detail/projectDetailUtils";
import type { Project } from "@/lib/types";
import { useEffect, useState } from "react";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    const projectPage = document.querySelector<HTMLElement>(
      ".project-detail-page",
    );

    if (!projectPage) return;

    function applySearchFilter() {
      const cleanQuery = searchQuery.trim().toLowerCase();
      const items = projectPage.querySelectorAll<HTMLElement>(
        ".project-browser-grid > div, .project-browser-list > :not(.project-browser-list-head)",
      );

      items.forEach((item) => {
        const itemText = item.textContent?.toLowerCase() ?? "";
        item.hidden = Boolean(cleanQuery) && !itemText.includes(cleanQuery);
      });
    }

    applySearchFilter();

    const observer = new MutationObserver(applySearchFilter);
    observer.observe(projectPage, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      projectPage
        .querySelectorAll<HTMLElement>(
          ".project-browser-grid > div, .project-browser-list > :not(.project-browser-list-head)",
        )
        .forEach((item) => {
          item.hidden = false;
        });
    };
  }, [searchQuery]);

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

      <div className="project-detail-controls">
        <label className="project-detail-search">
          <SearchIcon />
          <input
            type="text"
            value={searchQuery}
            placeholder="Search project files"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              className="project-detail-search-clear"
              aria-label="Clear project search"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </label>

        <div
          id="project-detail-toolbar-slot"
          className="project-detail-toolbar-slot"
        />
      </div>
    </section>
  );
}
