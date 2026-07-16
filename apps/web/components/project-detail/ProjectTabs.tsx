"use client";

import {
  TABS,
  type ProjectTab,
} from "@/lib/project-detail/projectDetailUtils";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type ProjectTabItem = (typeof TABS)[number];

type Props = {
  activeTab: ProjectTab;
  tabs: readonly ProjectTabItem[];
  onTabChange: (tab: ProjectTab) => void;
  syncSizeBytes?: number | null;
};

type LocalReadinessProjectSummary = {
  id: string | number;
  totalFiles?: number;
  readyFiles?: number;
  sizeBytes?: number;
  updatedAt?: string | null;
};

type LocalReadinessState = {
  totalFiles: number | null;
  readyFiles: number | null;
  sizeBytes: number | null;
  loading: boolean;
  error: boolean;
};

type ProjectSyncSizeState = {
  sizeBytes: number | null;
  loading: boolean;
  error: boolean;
};

type ProjectSyncSizeResponse = {
  sizeBytes?: number | string | null;
};

type ProjectSyncOperationsResponse = {
  operations?: Array<{ id: string }>;
};

const SYNC_OPERATIONS_IDLE_POLL_MS = 15000;
const SYNC_OPERATIONS_ACTIVE_POLL_MS = 3000;

function ProjectTabChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.6 5.3a1.3 1.3 0 0 1 1.84.04l5.5 5.76a1.3 1.3 0 0 1 0 1.8l-5.5 5.76a1.3 1.3 0 0 1-1.88-1.8L13.2 12 8.56 7.14a1.3 1.3 0 0 1 .04-1.84Z"
      />
    </svg>
  );
}

function formatSyncSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return "Sync size pending";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]} sync size`;
}

function getProjectTotalFiles(project: LocalReadinessProjectSummary | null) {
  return Number.isFinite(project?.totalFiles) ? Number(project?.totalFiles) : null;
}

function getProjectReadyFiles(project: LocalReadinessProjectSummary | null) {
  return Number.isFinite(project?.readyFiles) ? Number(project?.readyFiles) : null;
}

function getProjectSizeBytes(project: LocalReadinessProjectSummary | null) {
  return Number.isFinite(project?.sizeBytes) ? Number(project?.sizeBytes) : null;
}

function getPositiveSizeBytes(value: number | string | null | undefined) {
  const sizeBytes = Number(value || 0);
  return Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : null;
}

function ProjectTabUtilityStatus({ syncSizeBytes }: { syncSizeBytes?: number | null }) {
  const params = useParams();
  const projectId = String(params.projectId || "");
  const [hasActiveSyncOperations, setHasActiveSyncOperations] = useState(false);
  const [readiness, setReadiness] = useState<LocalReadinessState>({
    totalFiles: null,
    readyFiles: null,
    sizeBytes: null,
    loading: true,
    error: false,
  });
  const [projectSyncSize, setProjectSyncSize] = useState<ProjectSyncSizeState>({
    sizeBytes: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    if (!projectId) {
      setHasActiveSyncOperations(false);
      return;
    }

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
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/sync-operations`,
          { cache: "no-store", signal: abortController.signal },
        );
        const data = (await response.json()) as ProjectSyncOperationsResponse;
        const hasActiveOperations = Boolean(data.operations?.length);

        if (cancelled) return;

        setHasActiveSyncOperations(hasActiveOperations);
        scheduleNextPoll(
          hasActiveOperations
            ? SYNC_OPERATIONS_ACTIVE_POLL_MS
            : SYNC_OPERATIONS_IDLE_POLL_MS,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (cancelled) return;

        setHasActiveSyncOperations(false);
        scheduleNextPoll(SYNC_OPERATIONS_IDLE_POLL_MS);
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
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setReadiness({
        totalFiles: null,
        readyFiles: null,
        sizeBytes: null,
        loading: false,
        error: true,
      });
      return;
    }

    let cancelled = false;

    async function loadLocalReadiness() {
      setReadiness((current) => ({ ...current, loading: true, error: false }));

      try {
        const response = await fetch(
          `/api/desktop/projects/local-readiness?projectId=${encodeURIComponent(projectId)}`,
          { cache: "no-store" },
        );
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (!response.ok) throw new Error(data?.error || "Failed to load local readiness");

        const projects = Array.isArray(data?.projects)
          ? (data.projects as LocalReadinessProjectSummary[])
          : [];
        const project =
          projects.find((item) => String(item.id) === projectId) ?? null;

        if (cancelled) return;

        setReadiness({
          totalFiles: getProjectTotalFiles(project),
          readyFiles: getProjectReadyFiles(project),
          sizeBytes: getProjectSizeBytes(project),
          loading: false,
          error: !project,
        });
      } catch {
        if (cancelled) return;

        setReadiness({
          totalFiles: null,
          readyFiles: null,
          sizeBytes: null,
          loading: false,
          error: true,
        });
      }
    }

    void loadLocalReadiness();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const providedSizeBytes = getPositiveSizeBytes(syncSizeBytes);

    if (providedSizeBytes || !projectId) {
      setProjectSyncSize({
        sizeBytes: providedSizeBytes,
        loading: false,
        error: false,
      });
      return;
    }

    let cancelled = false;

    async function loadProjectSyncSize() {
      setProjectSyncSize((current) => ({ ...current, loading: true, error: false }));

      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/sync-size`,
          { cache: "no-store" },
        );
        const text = await response.text();
        const data = text ? (JSON.parse(text) as ProjectSyncSizeResponse) : null;

        if (!response.ok) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load project sync size",
          );
        }

        const sizeBytes = getPositiveSizeBytes(data?.sizeBytes);

        if (cancelled) return;

        setProjectSyncSize({
          sizeBytes,
          loading: false,
          error: false,
        });
      } catch {
        if (cancelled) return;

        setProjectSyncSize({
          sizeBytes: null,
          loading: false,
          error: true,
        });
      }
    }

    void loadProjectSyncSize();

    return () => {
      cancelled = true;
    };
  }, [projectId, syncSizeBytes]);

  const { countLabel, meterProgress, sizeLabel } = useMemo(() => {
    const propSizeBytes = getPositiveSizeBytes(syncSizeBytes);
    const pageSizeBytes = getPositiveSizeBytes(projectSyncSize.sizeBytes);
    const fallbackSizeBytes = propSizeBytes ?? pageSizeBytes;
    const readinessSizeBytes = getPositiveSizeBytes(readiness.sizeBytes);
    const resolvedSizeBytes = readinessSizeBytes ?? fallbackSizeBytes;

    if (readiness.loading) {
      return {
        countLabel: "Checking desktop sync",
        meterProgress: 0,
        sizeLabel: resolvedSizeBytes
          ? formatSyncSize(resolvedSizeBytes)
          : projectSyncSize.loading
            ? "Calculating sync size"
            : "Sync size pending",
      };
    }

    if (readiness.error || readiness.totalFiles == null || readiness.readyFiles == null) {
      return {
        countLabel: "Desktop sync unavailable",
        meterProgress: 0,
        sizeLabel: resolvedSizeBytes
          ? formatSyncSize(resolvedSizeBytes)
          : projectSyncSize.loading
            ? "Calculating sync size"
            : projectSyncSize.error
              ? "Sync size unavailable"
              : "Sync size pending",
      };
    }

    const totalFiles = Math.max(0, readiness.totalFiles);
    const readyFiles = Math.min(Math.max(0, readiness.readyFiles), totalFiles);

    return {
      countLabel: `${readyFiles} / ${totalFiles} files synced`,
      meterProgress: totalFiles > 0 ? Math.round((readyFiles / totalFiles) * 100) : 0,
      sizeLabel: resolvedSizeBytes
        ? formatSyncSize(resolvedSizeBytes)
        : projectSyncSize.loading
          ? "Calculating sync size"
          : "Sync size pending",
    };
  }, [projectSyncSize, readiness, syncSizeBytes]);

  return (
    <div
      className="project-tab-utility"
      aria-label="Project desktop sync"
      style={
        {
          "--project-tab-utility-meter-progress": `${meterProgress}%`,
        } as CSSProperties
      }
    >
      <div className="project-tab-utility-meter" aria-hidden="true">
        <span className="project-tab-utility-meter-bar" />
      </div>
      <span className="project-tab-utility-line project-tab-utility-heading">
        Desktop sync
      </span>
      {hasActiveSyncOperations ? (
        <span className="project-tab-utility-line" aria-live="polite">
          <span className="project-sync-status is-syncing">
            <span>Syncing</span>
            <span className="project-sync-status-dot" aria-hidden="true" />
          </span>
        </span>
      ) : (
        <span className="project-tab-utility-line">{countLabel}</span>
      )}
      <span className="project-tab-utility-line project-tab-utility-version">
        {sizeLabel}
      </span>
    </div>
  );
}

export default function ProjectTabs({
  activeTab,
  tabs,
  onTabChange,
  syncSizeBytes,
}: Props) {
  return (
    <nav className="project-tabs-row fw-filter-rail" aria-label="Project sections">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={`fw-filter-rail-item${isActive ? " is-active" : ""}`}
            aria-current={isActive}
          >
            <span className="fw-filter-rail-label">{tab.label}</span>
            <span className="fw-filter-rail-chevron" aria-hidden="true">
              <ProjectTabChevronIcon />
            </span>
          </button>
        );
      })}

      <ProjectTabUtilityStatus syncSizeBytes={syncSizeBytes} />
    </nav>
  );
}
