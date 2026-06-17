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

const SYNC_OPERATIONS_POLL_MS = 900;

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
    let intervalId: number | null = null;

    async function loadSyncOperations() {
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(String(project.id))}/sync-operations`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as ProjectSyncOperationsResponse;

        if (!cancelled) {
          setHasActiveSyncOperations(Boolean(data.operations?.length));
        }
      } catch {
        if (!cancelled) setHasActiveSyncOperations(false);
      }
    }

    void loadSyncOperations();
    intervalId = window.setInterval(loadSyncOperations, SYNC_OPERATIONS_POLL_MS);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
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
