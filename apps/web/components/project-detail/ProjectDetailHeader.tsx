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

function ProjectWorkspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        d="M3.75 6.75a2 2 0 0 1 2-2h4.1a2 2 0 0 1 1.42.59l1.38 1.38c.19.19.44.28.7.28h4.9a2 2 0 0 1 2 2v8.25a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2V6.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
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
    <section className="project-detail-hero" aria-label="Project workspace">
      <div className="project-workspace-toolbar">
        <div className="project-workspace-identity">
          <span className="project-workspace-icon" aria-hidden="true">
            <ProjectWorkspaceIcon />
          </span>
          <div className="project-workspace-copy">
            <div className="project-workspace-path">Workspace / Root</div>
            <h1 className="project-detail-title">{project.name}</h1>
          </div>
        </div>

        <div className="project-workspace-status" aria-label="Project details">
          <span className="project-workspace-status-item">Workspace</span>
          {assetsLoaded && (
            <span className="project-workspace-status-item">
              {totalFileCount} {totalFileCount === 1 ? "file" : "files"}
            </span>
          )}
          <span
            className={`project-workspace-status-item project-sync-status is-${visibleSyncState}`}
          >
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
