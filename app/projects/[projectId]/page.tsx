"use client";

import DropdownShell from "@/components/DropdownShell";
import EditProjectModal from "@/components/EditProjectModal";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import Toast from "@/components/Toast";
import { borderedIconButtonClass } from "@/components/uiClasses";
import {
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useProjects } from "@/hooks/useProjects";
import type { Project, Song } from "@/lib/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const TABS = [
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

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20H8.25L19.5 8.75C20.3284 7.92157 20.3284 6.57843 19.5 5.75L18.25 4.5C17.4216 3.67157 16.0784 3.67157 15.25 4.5L4 15.75V20Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 5.75L18.25 10"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7.5 10.5L12 15L16.5 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
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
        <div className="project-empty">
          <div className="project-empty-skeleton-title project-skeleton-block" />
          <div className="project-empty-skeleton-copy project-skeleton-block" />
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
  const { projects, setProjects, loading, error } = useProjects();

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
  const activeTab: ProjectTab = isProjectTab(tabParam) ? tabParam : "music";

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
    if (activeTab !== "music") return;

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

  function handleDownloadAllMusic() {
    downloadFiles(projectSongs, "No music files to download");
  }

  function handleDownloadAllProjectFiles() {
    downloadFiles(projectSongs, "No project files to download yet");
  }

  function openEdit() {
    if (!project) return;

    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
  }

  async function handleSaveEdit() {
    if (!editingProject || isSavingProject) return;

    setIsSavingProject(true);

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error("Failed to save project:", data || res.statusText);
        return;
      }

      setProjects((prev) =>
        prev.map((item) =>
          item.id === editingProject.id
            ? data || {
                ...item,
                name: editName,
                description: editDescription.trim() || null,
              }
            : item,
        ),
      );

      showToast("Changes saved");
      setEditingProject(null);
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleDelete() {
    if (!editingProject || deletingProjectId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${editingProject.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

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
      }
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

        .project-sort-pill {
          cursor: pointer;
          border-radius: 6px;
          background: var(--bg-elevated);
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          transition:
            background-color 0.15s ease,
            color 0.15s ease;
        }

        .project-sort-pill:hover,
        .project-sort-pill.is-active {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .project-tab-panel {
          margin-left: -32px;
          margin-right: -32px;
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

        .project-empty-skeleton-title {
          width: 120px;
          height: 10px;
        }

        .project-empty-skeleton-copy {
          width: 260px;
          height: 8px;
          margin-top: 12px;
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
                        <DownloadArrowIcon />
                      </button>
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        handleDownloadAllMusic();
                      }}
                    >
                      Download all music
                    </button>

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

              {activeTab === "music" && (
                <div className="project-sort-row">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProjectSort(option.value)}
                      className={`project-sort-pill ${
                        projectSort === option.value ? "is-active" : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              <section className="project-tab-panel">
                {activeTab === "music" ? (
                  <MusicTabState
                    projectId={projectId}
                    songs={displayedProjectSongs}
                    loading={projectSongsLoading}
                    error={projectSongsError}
                    onRemoveFromProject={(songId) => {
                      setProjectSongs((current) =>
                        current.filter((song) => song.id !== songId),
                      );
                      showToast("Song removed from project");
                    }}
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
