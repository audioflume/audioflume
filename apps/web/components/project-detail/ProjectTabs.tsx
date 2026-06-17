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

type ProjectSyncAsset = {
  id?: number | string;
  asset_type?: string | null;
  asset_id?: string | number | null;
  metadata?: Record<string, unknown> | null;
};

type ProjectSyncSong = {
  id?: string | number;
  sizeBytes?: number | string | null;
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

function getPositiveSizeBytes(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : null;
}

function getMetadataSizeBytes(metadata: ProjectSyncAsset["metadata"]) {
  const sizeBytes = Number(metadata?.sizeBytes || 0);
  return sizeBytes > 0 ? sizeBytes : 0;
}

function getSongSizeMap(songs: ProjectSyncSong[]) {
  return new Map(
    songs.flatMap((song) => {
      if (song.id == null) return [];
      const sizeBytes = Number(song.sizeBytes || 0);
      return sizeBytes > 0 ? [[String(song.id), sizeBytes] as const] : [];
    }),
  );
}

function getProjectSyncSizeBytes(assets: ProjectSyncAsset[], songs: ProjectSyncSong[]) {
  const songSizeById = getSongSizeMap(songs);

  return assets.reduce((total, asset) => {
    const metadataSizeBytes = getMetadataSizeBytes(asset.metadata);
    if (metadataSizeBytes > 0) return total + metadataSizeBytes;

    if (asset.asset_type === "song") {
      return total + (songSizeById.get(String(asset.asset_id || "")) ?? 0);
    }

    return total;
  }, 0);
}

function ProjectTabUtilityStatus({ syncSizeBytes }: { syncSizeBytes?: number | null }) {
  const params = useParams();
  const projectId = String(params.projectId || "");
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
        const [foldersResponse, songsResponse] = await Promise.all([
          fetch(`/api/projects/${encodeURIComponent(projectId)}/folders`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${encodeURIComponent(projectId)}/assets?type=song`, {
            cache: "no-store",
          }),
        ]);

        const [foldersText, songsText] = await Promise.all([
          foldersResponse.text(),
          songsResponse.text(),
        ]);
        const foldersData = foldersText ? JSON.parse(foldersText) : null;
        const songsData = songsText ? JSON.parse(songsText) : null;

        if (!foldersResponse.ok) {
          throw new Error(foldersData?.error || "Failed to load project folders");
        }
        if (!songsResponse.ok) {
          throw new Error(songsData?.error || "Failed to load project songs");
        }

        const folderAssets = Array.isArray(foldersData?.assets)
          ? (foldersData.assets as ProjectSyncAsset[])
          : [];
        const songAssets = Array.isArray(songsData?.assets)
          ? (songsData.assets as ProjectSyncAsset[])
          : [];
        const songs = Array.isArray(songsData?.songs)
          ? (songsData.songs as ProjectSyncSong[])
          : [];
        const assets = folderAssets.length > 0 ? folderAssets : songAssets;
        const sizeBytes = getProjectSyncSizeBytes(assets, songs);

        if (cancelled) return;

        setProjectSyncSize({
          sizeBytes: sizeBytes > 0 ? sizeBytes : null,
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
        countLabel: "Checking local files",
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
        countLabel: "Readiness unavailable",
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
      countLabel: `${readyFiles} / ${totalFiles} files ready`,
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
