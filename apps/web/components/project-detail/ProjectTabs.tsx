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

function ProjectTabUtilityStatus() {
  const params = useParams();
  const projectId = String(params.projectId || "");
  const [readiness, setReadiness] = useState<LocalReadinessState>({
    totalFiles: null,
    readyFiles: null,
    sizeBytes: null,
    loading: true,
    error: false,
  });

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

  const { countLabel, meterProgress, sizeLabel } = useMemo(() => {
    if (readiness.loading) {
      return {
        countLabel: "Checking local files",
        meterProgress: 0,
        sizeLabel: "Calculating sync size",
      };
    }

    if (readiness.error || readiness.totalFiles == null || readiness.readyFiles == null) {
      return {
        countLabel: "Readiness unavailable",
        meterProgress: 0,
        sizeLabel: "Open desktop app to sync",
      };
    }

    const totalFiles = Math.max(0, readiness.totalFiles);
    const readyFiles = Math.min(Math.max(0, readiness.readyFiles), totalFiles);

    return {
      countLabel: `${readyFiles} / ${totalFiles} files ready`,
      meterProgress: totalFiles > 0 ? Math.round((readyFiles / totalFiles) * 100) : 0,
      sizeLabel: formatSyncSize(readiness.sizeBytes),
    };
  }, [readiness]);

  return (
    <div
      className="project-tab-utility"
      aria-label="Project local readiness"
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
        Local readiness
      </span>
      <span className="project-tab-utility-line">{countLabel}</span>
      <span className="project-tab-utility-line project-tab-utility-version">
        {sizeLabel}
      </span>
    </div>
  );
}

export default function ProjectTabs({ activeTab, tabs, onTabChange }: Props) {
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

      <ProjectTabUtilityStatus />
    </nav>
  );
}
