"use client";

import DropdownShell from "@/components/DropdownShell";
import EditProjectModal from "@/components/EditProjectModal";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import SongRow from "@/components/SongRow";
import Toast from "@/components/Toast";
import DownloadIconSmall from "@/components/icons/DownloadIconSmall";
import EditIcon from "@/components/icons/EditIcon";
import {
  borderedIconButtonClass,
  quickFilterButtonClass,
  quickFilterButtonActiveClass,
} from "@/components/uiClasses";
import {
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import type { Project, Song } from "@/lib/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const TABS = [
  { label: "All Files", value: "overview" },
  { label: "Music", value: "music" },
  { label: "Sound FX", value: "sound-fx" },
  { label: "Visual FX", value: "visual-fx" },
  { label: "Colour Grading", value: "colour-grading" },
] as const;

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

type ProjectTab = (typeof TABS)[number]["value"];
type ProjectSort = (typeof SORT_OPTIONS)[number]["value"];

type ProjectSong = Song & {
  project_asset_id?: number;
  project_id?: number;
  project_position?: number;
  project_added_at?: string;
  project_notes?: string | null;
};

function isProjectTab(value: string | null): value is ProjectTab {
  return TABS.some((tab) => tab.value === value);
}

function getDownloadLabel(activeTab: ProjectTab) {
  if (activeTab === "sound-fx") return "Download all sound FX";
  if (activeTab === "visual-fx") return "Download all visual FX";
  if (activeTab === "colour-grading") return "Download all colour grading";

  return "Download all music";
}

function formatProjectDate(project: Project | null) {
  if (!project?.created_at) return "";

  const date = new Date(project.created_at);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProjectPageSkeleton() {
  return (
    <>
      <section className="project-detail-hero">
        <div className="project-detail-skeleton-kicker project-skeleton-block" />
        <div className="project-detail-skeleton-title project-skeleton-block" />

        <div className="project-detail-skeleton-meta">
          <div className="project-detail-skeleton-meta-line project-skeleton-block" />
          <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
        </div>
      </section>

      <div className="project-tabs-row">
        {TABS.map((tab) => (
          <div
            key={tab.value}
            className="project-tab-skeleton project-skeleton-block"
          />
        ))}
      </div>

      <section className="project-tab-panel">
        <div className="project-overview-grid">
          <ProjectAssetTableShell title="Music" isLoading />
          <ProjectAssetTableShell title="Sound FX" />
          <ProjectAssetTableShell title="Visual FX" />
          <ProjectAssetTableShell title="Colour Grading" />
        </div>
      </section>
    </>
  );
}

function EmptyTabState({ activeTab }: { activeTab: ProjectTab }) {
  const tab = TABS.find((item) => item.value === activeTab);

  return (
    <div className="project-empty">
      <h2>{tab?.label || "Project"} coming soon</h2>
      <p>
        This section will hold the {tab?.label.toLowerCase() || "project"} media
        connected to this project.
      </p>
    </div>
  );
}

function ProjectAssetTableShell({
  title,
  count = 0,
  children,
  emptyTitle,
  emptyCopy,
  isLoading = false,
}: {
  title: string;
  count?: number;
  children?: ReactNode;
  emptyTitle?: string;
  emptyCopy?: string;
  isLoading?: boolean;
}) {
  return (
    <section className="project-asset-table">
      <div className="project-asset-table-top">
        <div>
          <h2>{title}</h2>
          <p>
            {count} {count === 1 ? "asset" : "assets"}
          </p>
        </div>
      </div>

      <div className="project-asset-table-scroll">
        <div className="project-asset-table-inner">
          <div className="project-asset-table-head">
            <div />
            <div>Song</div>
            <div>Artist</div>
            <div>Waveform</div>
            <div className="pl-2">Genre</div>
            <div>Key</div>
            <div>BPM</div>
            <div />
          </div>

          {isLoading ? (
            <div className="grid gap-0">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="grid min-h-[46px] grid-cols-[48px_minmax(180px,240px)_minmax(150px,210px)_minmax(250px,1fr)_minmax(150px,190px)_64px_76px_92px] items-center gap-3 px-6"
                  style={{
                    borderBottom:
                      index === 4 ? "none" : "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="h-8 w-8 rounded bg-[var(--bg-tertiary)]" />
                  <div className="h-2 w-[60%] bg-[var(--bg-tertiary)]" />
                  <div className="h-2 w-[50%] bg-[var(--bg-tertiary)]" />
                  <div className="h-2 w-[88px] bg-[var(--bg-tertiary)]" />
                  <div className="h-2 w-[68px] bg-[var(--bg-tertiary)]" />
                  <div className="h-2 w-[32px] bg-[var(--bg-tertiary)]" />
                  <div className="h-2 w-[42px] bg-[var(--bg-tertiary)]" />
                  <div className="h-2 w-[18px] bg-[var(--bg-tertiary)]" />
                </div>
              ))}
            </div>
          ) : children ? (
            <div>{children}</div>
          ) : (
            <div className="project-asset-table-empty">
              <h3>{emptyTitle || `No ${title.toLowerCase()} yet`}</h3>
              <p>
                {emptyCopy ||
                  `Assets added to this project will appear in this table.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MusicAssetTable({
  projectId,
  songs,
  loading,
  error,
  onRemoveFromProject,
}: {
  projectId: string;
  songs: ProjectSong[];
  loading: boolean;
  error: string | null;
  onRemoveFromProject: (songId: string) => void;
}) {
  if (loading) {
    return <ProjectAssetTableShell title="Music" isLoading />;
  }

  if (error) {
    return (
      <ProjectAssetTableShell
        title="Music"
        emptyTitle="Couldn't load project songs"
        emptyCopy={error}
      />
    );
  }

  if (songs.length === 0) {
    return (
      <ProjectAssetTableShell
        title="Music"
        emptyTitle="No songs yet"
        emptyCopy="Add songs from the music library, then they will appear here in this project."
      />
    );
  }

  return (
    <ProjectAssetTableShell title="Music" count={songs.length}>
      {songs.map((song, index) => (
        <SongRow
          key={song.id}
          song={song}
          isLast={index === songs.length - 1}
          projectId={projectId}
          showWaveform
          onRemoveFromProject={onRemoveFromProject}
        />
      ))}
    </ProjectAssetTableShell>
  );
}

function OverviewTabState({
  projectId,
  songs,
  loading,
  error,
  onRemoveFromProject,
}: {
  projectId: string;
  songs: ProjectSong[];
  loading: boolean;
  error: string | null;
  onRemoveFromProject: (songId: string) => void;
}) {
  return (
    <div className="project-overview-grid">
      <MusicAssetTable
        projectId={projectId}
        songs={songs}
        loading={loading}
        error={error}
        onRemoveFromProject={onRemoveFromProject}
      />

      <ProjectAssetTableShell
        title="Sound FX"
        emptyTitle="No sound FX yet"
        emptyCopy="Sound effects connected to this project will appear here."
      />

      <ProjectAssetTableShell
        title="Visual FX"
        emptyTitle="No visual FX yet"
        emptyCopy="Visual effects connected to this project will appear here."
      />

      <ProjectAssetTableShell
        title="Colour Grading"
        emptyTitle="No colour grading assets yet"
        emptyCopy="Colour grading assets connected to this project will appear here."
      />
    </div>
  );
}

function MusicTabState({
  projectId,
  songs,
  loading,
  error,
  onRemoveFromProject,
}: {
  projectId: string;
  songs: ProjectSong[];
  loading: boolean;
  error: string | null;
  onRemoveFromProject: (songId: string) => void;
}) {
  if (loading) {
    return <SkeletonSongList />;
  }

  if (error) {
    return (
      <div className="project-empty">
        <h2>Couldn&apos;t load project songs</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="project-empty">
        <h2>No songs yet</h2>
        <p>
          Add songs from the music library, then they will appear here in this
          project.
        </p>
      </div>
    );
  }

  return (
    <div>
      {songs.map((song, index) => (
        <SongCard
          key={song.id}
          song={song}
          isFirst={index === 0}
          isLast={index === songs.length - 1}
          projectId={projectId}
          onRemoveFromProject={onRemoveFromProject}
        />
      ))}
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { currentSong, setQueue } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { projects, setProjects, loading, error } = useProjectsContext();

  const projectId = String(params.projectId || "");
  const playerVisible = !!currentSong;

  const [projectSongs, setProjectSongs] = useState<ProjectSong[]>([]);
  const [projectSort, setProjectSort] = useState<ProjectSort>("newest");
  const [projectSongsLoading, setProjectSongsLoading] = useState(true);
  const [projectSongsError, setProjectSongsError] = useState<string | null>(
    null,
  );
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(
    null,
  );
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const activeTab: ProjectTab = isProjectTab(tabParam) ? tabParam : "overview";
  const activeDownloadLabel = getDownloadLabel(activeTab);

  const project = useMemo(
    () => projects.find((item) => String(item.id) === projectId) ?? null,
    [projects, projectId],
  );

  const projectDate = formatProjectDate(project);

  const displayedProjectSongs = useMemo(() => {
    const indexedSongs = projectSongs.map((song, index) => ({
      song,
      index,
    }));

    const filteredSongs =
      projectSort === "liked"
        ? indexedSongs.filter(({ song }) => favoriteIdSet.has(song.id))
        : indexedSongs;

    const sortedSongs = [...filteredSongs].sort((a, b) => {
      if (projectSort === "alphabetical") {
        return a.song.title.localeCompare(b.song.title, undefined, {
          sensitivity: "base",
        });
      }

      const aDate = a.song.project_added_at
        ? new Date(a.song.project_added_at).getTime()
        : 0;
      const bDate = b.song.project_added_at
        ? new Date(b.song.project_added_at).getTime()
        : 0;

      if (projectSort === "oldest") {
        return aDate - bDate || a.index - b.index;
      }

      return bDate - aDate || b.index - a.index;
    });

    return sortedSongs.map(({ song }) => song);
  }, [projectSongs, projectSort, favoriteIdSet]);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    async function loadProjectSongs() {
      setProjectSongsLoading(true);
      setProjectSongsError(null);

      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/assets?type=song`,
          {
            cache: "no-store",
          },
        );

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load project songs");
        }

        const nextSongs = Array.isArray(data?.songs)
          ? (data.songs as ProjectSong[])
          : [];

        if (cancelled) return;

        setProjectSongs(nextSongs.filter((song) => song.id));
      } catch (err) {
        if (cancelled) return;

        setProjectSongs([]);
        setProjectSongsError(
          err instanceof Error ? err.message : "Failed to load project songs",
        );
      } finally {
        if (!cancelled) {
          setProjectSongsLoading(false);
        }
      }
    }

    loadProjectSongs();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (activeTab !== "music" && activeTab !== "overview") return;

    setQueue(displayedProjectSongs.filter((song) => song.audioUrl));
  }, [activeTab, displayedProjectSongs, setQueue]);

  function setActiveTab(nextTab: ProjectTab) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("tab", nextTab);

    router.replace(`/projects/${projectId}?${params.toString()}`, {
      scroll: false,
    });
  }

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function handleRemoveFromProject(songId: string) {
    setProjectSongs((current) => current.filter((song) => song.id !== songId));
    showToast("Song removed from project");
  }

  function downloadFiles(songs: ProjectSong[], emptyMessage: string) {
    const downloadableSongs = songs.filter((song) => song.audioUrl);

    if (downloadableSongs.length === 0) {
      showToast(emptyMessage);
      return;
    }

    downloadableSongs.forEach((song, index) => {
      window.setTimeout(() => {
        const link = document.createElement("a");
        link.href = song.audioUrl;
        link.download = `${song.title || "filmwave-song"}`;
        link.target = "_blank";
        link.rel = "noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, index * 150);
    });

    showToast(
      downloadableSongs.length === 1
        ? "Starting 1 download"
        : `Starting ${downloadableSongs.length} downloads`,
    );
  }

  function handleDownloadActiveTab() {
    if (activeTab === "music") {
      downloadFiles(projectSongs, "No music files to download");
      return;
    }

    if (activeTab === "sound-fx") {
      showToast("No sound FX files to download yet");
      return;
    }

    if (activeTab === "visual-fx") {
      showToast("No visual FX files to download yet");
      return;
    }

    if (activeTab === "colour-grading") {
      showToast("No colour grading files to download yet");
      return;
    }

    handleDownloadAllProjectFiles();
  }

  function handleDownloadAllProjectFiles() {
    downloadFiles(projectSongs, "No project files to download yet");
  }

  function openEdit() {
    if (!project) return;

    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    showToast("Editing project");
  }

  async function handleSaveEdit() {
    if (!editingProject || isSavingProject) return;

    const cleanName = editName.trim();

    if (!cleanName) {
      showToast("Project name required");
      return;
    }

    setIsSavingProject(true);

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          description: editDescription.trim() || null,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error("Failed to save project:", data || res.statusText);
        showToast("Couldn’t save project");
        return;
      }

      setProjects((prev) =>
        prev.map((item) =>
          item.id === editingProject.id
            ? data || {
                ...item,
                name: cleanName,
                description: editDescription.trim() || null,
              }
            : item,
        ),
      );

      showToast("Project saved");
      setEditingProject(null);
    } catch (err) {
      console.error("Failed to save project:", err);
      showToast("Couldn’t save project");
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleDelete() {
    if (!editingProject || deletingProjectId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${editingProject.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      showToast("Delete cancelled");
      return;
    }

    const projectIdToDelete = editingProject.id;

    setEditingProject(null);
    setDeletingProjectId(projectIdToDelete);

    try {
      const res = await fetch(`/api/projects/${projectIdToDelete}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProjects((prev) =>
          prev.filter((item) => item.id !== projectIdToDelete),
        );
        showToast("Project deleted");
        router.push("/music");
      } else {
        showToast("Couldn’t delete project");
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
      showToast("Couldn’t delete project");
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <>
      <style>{`
        .project-detail-page {
          position: relative;
          margin-left: var(--sidebar-width);
          margin-top: 56px;
          min-height: calc(100vh - 56px);
          overflow-x: clip;
          overflow-y: visible;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: margin-left 0.2s ease;
        }

        .project-detail-shell {
          position: relative;
          z-index: 1;
          padding: 0 32px;
        }

        .project-detail-edit-wrap {
          position: absolute;
          top: 24px;
          right: 32px;
          z-index: 3;
        }

        .project-detail-hero {
          display: block;
          padding: 88px 0 30px;
        }

        .project-detail-kicker {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .project-detail-title {
          margin-top: 8px;
          max-width: 640px;
          font-family: var(--font-instrument-sans);
          font-size: 56px;
          font-weight: 500;
          line-height: 0.94;
          letter-spacing: -0.055em;
          color: var(--text-primary);
        }

        .project-detail-meta {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .project-detail-dot {
          color: var(--text-muted);
        }

        .project-detail-description {
          margin-top: 16px;
          max-width: 520px;
          font-size: 12px;
          line-height: 1.65;
          color: var(--text-secondary);
        }

        .project-tabs-row {
          position: sticky;
          top: 56px;
          z-index: 90;
          display: flex;
          min-height: 49px;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-left: -32px;
          margin-right: -32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
          padding: 0 32px;
        }

        .project-download-wrap {
          margin-left: auto;
        }

        .project-download-trigger {
          gap: 7px;
        }

        .project-tab-skeleton {
          width: 86px;
          height: 28px;
          border-radius: 6px;
        }

        .project-sort-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-left: -32px;
          margin-right: -32px;
          background: var(--bg-primary);
          padding: 16px 32px;
        }

        .song-row-compact::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 1px;
          background: var(--border-subtle);
          pointer-events: none;
        }

        .song-row-compact.is-last::after {
          display: none;
        }

        .project-tab-panel {
          margin-left: -32px;
          margin-right: -32px;
        }

        .project-overview-grid {
          display: grid;
          gap: 32px;
          padding: 32px 32px 32px;
        }

        .project-asset-table {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-secondary);
        }

        .project-asset-table-top {
          display: flex;
          height: 58px;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid var(--border);
          padding: 0 16px;
        }

        .project-asset-table-top h2 {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .project-asset-table-top p {
          margin-top: 4px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .project-asset-table-scroll {
          overflow-x: auto;
          overflow-y: hidden;
        }

        .project-asset-table-inner {
          min-width: 1030px;
        }

        .project-asset-table-head {
          display: grid;
          height: 32px;
          grid-template-columns: 48px minmax(180px,240px) minmax(150px,210px) minmax(250px,1fr) minmax(150px,190px) 64px 76px 92px;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-align: left;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .project-asset-table-head > * {
          justify-self: start;
          text-align: left;
        }

        .project-asset-table-empty {
          display: flex;
          min-height: 120px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-secondary);
        }

        .project-asset-table-empty h3 {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .project-asset-table-empty p {
          margin-top: 6px;
          max-width: 320px;
          font-size: 12px;
          line-height: 1.6;
        }

        .project-empty {
          display: flex;
          min-height: 280px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-secondary);
        }

        .project-empty h2 {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .project-empty p {
          margin-top: 6px;
          max-width: 320px;
          font-size: 12px;
          line-height: 1.6;
        }

        .project-error {
          display: flex;
          min-height: 360px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-secondary);
        }

        .project-error h2 {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .project-error p {
          margin-top: 6px;
          max-width: 320px;
          font-size: 12px;
          line-height: 1.6;
        }

        .project-footer-wrap {
          padding-top: 40px;
        }

        .project-skeleton-block {
          position: relative;
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .project-skeleton-block::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--bg-hover) 72%, transparent),
            transparent
          );
          animation: project-skeleton-shimmer 1.6s ease-in-out infinite;
        }

        @keyframes project-skeleton-shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .project-detail-skeleton-kicker {
          width: 82px;
          height: 8px;
          margin-top: 2px;
        }

        .project-detail-skeleton-title {
          width: min(420px, 72%);
          height: 52px;
          margin-top: 13px;
        }

        .project-detail-skeleton-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
        }

        .project-detail-skeleton-meta-line {
          width: 72px;
          height: 8px;
        }

        .project-detail-skeleton-meta-line.short {
          width: 140px;
        }

        @media (max-width: 720px) {
          .project-detail-hero {
            padding-top: 88px;
          }
        }

        @media (max-width: 760px) {
          .project-detail-shell {
            padding: 0 18px;
          }

          .project-detail-edit-wrap {
            right: 18px;
          }

          .project-tabs-row,
          .project-sort-row,
          .project-tab-panel {
            margin-left: -18px;
            margin-right: -18px;
          }

          .project-tabs-row {
            padding: 0 18px;
          }

          .project-sort-row {
            padding: 16px 18px;
          }

          .project-overview-grid {
            padding: 18px 18px 18px;
          }

          .project-detail-skeleton-title {
            width: min(420px, 88%);
          }
        }
      `}</style>

      <main className="project-detail-page">
        <div className="project-detail-shell">
          {project && !loading && (
            <div className="project-detail-edit-wrap">
              <button
                type="button"
                onClick={openEdit}
                className={borderedIconButtonClass}
                aria-label={`Edit ${project.name}`}
              >
                <EditIcon />
              </button>
            </div>
          )}

          {loading ? (
            <ProjectPageSkeleton />
          ) : error ? (
            <div className="project-error">
              <h2>Couldn&apos;t load project</h2>
              <p>{error}</p>
            </div>
          ) : !project ? (
            <div className="project-error">
              <h2>Project not found</h2>
              <p>
                This project may have been deleted or is no longer available.
              </p>
            </div>
          ) : (
            <>
              <section className="project-detail-hero">
                <div className="project-detail-kicker">Project</div>

                <h1 className="project-detail-title">{project.name}</h1>

                <div className="project-detail-meta">
                  <span>Project workspace</span>

                  {projectDate && (
                    <>
                      <span className="project-detail-dot">·</span>
                      <span>Created {projectDate}</span>
                    </>
                  )}
                </div>

                {project.description && (
                  <p className="project-detail-description">
                    {project.description}
                  </p>
                )}
              </section>

              <div className="project-tabs-row">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={`${filterTriggerBaseClass} ${
                        isActive
                          ? filterTriggerActiveClass
                          : filterTriggerInactiveClass
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}

                <div className="project-download-wrap">
                  <DropdownShell
                    open={downloadMenuOpen}
                    onOpenChange={setDownloadMenuOpen}
                    placement="bottom-end"
                    offsetAmount={8}
                    flippedOffsetAmount={8}
                    collisionPadding={{
                      top: 70,
                      right: 32,
                      bottom: playerVisible ? 85 : 16,
                      left: 16,
                    }}
                    trigger={({ open }) => (
                      <button
                        type="button"
                        className={`${filterTriggerBaseClass} project-download-trigger ${
                          open
                            ? filterTriggerActiveClass
                            : filterTriggerInactiveClass
                        }`}
                        aria-label="Download project files"
                        aria-expanded={open}
                      >
                        <span>Download</span>
                        <DownloadIconSmall />
                      </button>
                    )}
                  >
                    {activeTab !== "overview" && (
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadMenuOpen(false);
                          handleDownloadActiveTab();
                        }}
                      >
                        {activeDownloadLabel}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        handleDownloadAllProjectFiles();
                      }}
                    >
                      Download all project files
                    </button>
                  </DropdownShell>
                </div>
              </div>

              {activeTab !== "overview" && (
                <div className="project-sort-row">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProjectSort(option.value)}
                      className={`${quickFilterButtonClass} ${
                        projectSort === option.value
                          ? quickFilterButtonActiveClass
                          : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              <section className="project-tab-panel">
                {activeTab === "overview" ? (
                  <OverviewTabState
                    projectId={projectId}
                    songs={displayedProjectSongs}
                    loading={projectSongsLoading}
                    error={projectSongsError}
                    onRemoveFromProject={handleRemoveFromProject}
                  />
                ) : activeTab === "music" ? (
                  <MusicTabState
                    projectId={projectId}
                    songs={displayedProjectSongs}
                    loading={projectSongsLoading}
                    error={projectSongsError}
                    onRemoveFromProject={handleRemoveFromProject}
                  />
                ) : (
                  <EmptyTabState activeTab={activeTab} />
                )}
              </section>
            </>
          )}

          {!loading && (
            <div
              className="project-footer-wrap"
              style={{
                paddingBottom: playerVisible ? "72px" : "8px",
              }}
            >
              <Footer />
            </div>
          )}
        </div>
      </main>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "88px" : "24px"}
      />

      <EditProjectModal
        isOpen={!!editingProject}
        project={editingProject}
        name={editName}
        description={editDescription}
        isSaving={isSavingProject}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        onClose={() => setEditingProject(null)}
      />
    </>
  );
}
