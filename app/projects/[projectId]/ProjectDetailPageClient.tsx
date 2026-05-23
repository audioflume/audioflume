"use client";

import DropdownShell from "@/components/DropdownShell";
import EditProjectModal from "@/components/EditProjectModal";
import FooterBottom from "@/components/FooterBottom";
import ModalShell from "@/components/ModalShell";
import ProjectFileBrowser from "@/components/ProjectFileBrowser";
import ProjectFolderPickerModal from "@/components/ProjectFolderPickerModal";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import Toast from "@/components/Toast";
import DownloadIconSmall from "@/components/icons/DownloadIconSmall";
import EditIcon from "@/components/icons/EditIcon";
import FolderIcon from "@/components/icons/FolderIcon";
import GridViewIcon from "@/components/icons/GridViewIcon";
import ListViewIcon from "@/components/icons/ListViewIcon";
import {
  borderedIconButton9Class,
  modalPrimaryButtonClass,
  quickFilterButtonActiveClass,
  quickFilterButtonClass,
} from "@/components/uiClasses";
import {
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { Project, ProjectAsset, ProjectFolder, Song } from "@/lib/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
type ProjectFileView = "grid" | "list";

type ProjectSong = Song & {
  project_asset_id?: number;
  project_id?: number;
  project_position?: number;
  project_added_at?: string;
  project_notes?: string | null;
  project_folder_id?: number | null;
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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
          <div key={tab.value} className="project-tab-skeleton project-skeleton-block" />
        ))}
      </div>
      <section className="project-tab-panel">
        <div className="project-file-browser">
          <div className="project-file-browser-top">
            <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
            <div className="project-tab-skeleton project-skeleton-block" />
          </div>
          <div className="project-folder-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="project-folder-card skeleton-card">
                <div className="project-folder-icon project-skeleton-block" />
                <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
              </div>
            ))}
          </div>
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
      <p>This section will hold the {tab?.label.toLowerCase() || "project"} media connected to this project.</p>
    </div>
  );
}

function MusicTabState({
  projectId, songs, loading, error, showEditPointMarkers, onRemoveFromProject,
}: {
  projectId: string;
  songs: ProjectSong[];
  loading: boolean;
  error: string | null;
  showEditPointMarkers: boolean;
  onRemoveFromProject: (songId: string) => void;
}) {
  if (loading) return <SkeletonSongList />;
  if (error) return <div className="project-empty"><h2>Couldn&apos;t load project songs</h2><p>{error}</p></div>;
  if (songs.length === 0) return <div className="project-empty"><h2>No songs yet</h2><p>Add songs from the music library, then they will appear here in this project.</p></div>;
  return (
    <div>
      {songs.map((song, index) => (
        <SongCard
          key={song.id}
          song={song}
          isFirst={index === 0}
          isLast={index === songs.length - 1}
          projectId={projectId}
          showEditPointMarkers={showEditPointMarkers}
          onRemoveFromProject={onRemoveFromProject}
        />
      ))}
    </div>
  );
}

export default function ProjectDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSong, setQueue } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { projects, setProjects, loading, error } = useProjectsContext();
  const { showEditPointMarkers, setShowEditPointMarkers } = useUserPreferences();

  const projectId = String(params.projectId || "");
  const playerVisible = !!currentSong;

  const [projectSongs, setProjectSongs] = useState<ProjectSong[]>([]);
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [projectFolders, setProjectFolders] = useState<ProjectFolder[]>([]);
  const [projectSort, setProjectSort] = useState<ProjectSort>("newest");
  const [fileViewMode, setFileViewMode] = useState<ProjectFileView>("grid");
  const [projectSongsLoading, setProjectSongsLoading] = useState(true);
  const [projectSongsError, setProjectSongsError] = useState<string | null>(null);
  const [projectFoldersLoading, setProjectFoldersLoading] = useState(true);
  const [projectFoldersError, setProjectFoldersError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [movingSong, setMovingSong] = useState<ProjectSong | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const folderParam = searchParams.get("folder");
  const activeTab: ProjectTab = isProjectTab(tabParam) ? tabParam : "overview";
  const activeFolderId = folderParam && Number.isFinite(Number(folderParam)) ? Number(folderParam) : null;
  const activeDownloadLabel = getDownloadLabel(activeTab);

  const project = useMemo(
    () => projects.find((item) => String(item.id) === projectId) ?? null,
    [projects, projectId],
  );

  const projectDate = formatProjectDate(project);
  const totalFileCount = projectAssets.length;
  const assetsLoaded = !projectSongsLoading && !projectFoldersLoading;

  const displayedProjectSongs = useMemo(() => {
    const indexedSongs = projectSongs.map((song, index) => ({ song, index }));
    const filteredSongs = projectSort === "liked"
      ? indexedSongs.filter(({ song }) => favoriteIdSet.has(song.id))
      : indexedSongs;
    const sortedSongs = [...filteredSongs].sort((a, b) => {
      if (projectSort === "alphabetical") return a.song.title.localeCompare(b.song.title, undefined, { sensitivity: "base" });
      const aDate = a.song.project_added_at ? new Date(a.song.project_added_at).getTime() : 0;
      const bDate = b.song.project_added_at ? new Date(b.song.project_added_at).getTime() : 0;
      if (projectSort === "oldest") return aDate - bDate || a.index - b.index;
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
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets?type=song`, { cache: "no-store" });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(data?.error || "Failed to load project songs");
        const nextSongs = Array.isArray(data?.songs) ? (data.songs as ProjectSong[]) : [];
        const nextAssets = Array.isArray(data?.assets) ? (data.assets as ProjectAsset[]) : [];
        if (cancelled) return;
        setProjectSongs(nextSongs.filter((song) => song.id));
        setProjectAssets(nextAssets.filter((asset) => Number.isFinite(asset.id)));
      } catch (err) {
        if (cancelled) return;
        setProjectSongs([]);
        setProjectAssets([]);
        setProjectSongsError(err instanceof Error ? err.message : "Failed to load project songs");
      } finally {
        if (!cancelled) setProjectSongsLoading(false);
      }
    }
    loadProjectSongs();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    async function loadProjectFolders() {
      setProjectFoldersLoading(true);
      setProjectFoldersError(null);
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/folders`, { cache: "no-store" });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(data?.error || "Failed to load project folders");
        if (cancelled) return;
        setProjectFolders(Array.isArray(data?.folders) ? data.folders : []);
        setProjectAssets(Array.isArray(data?.assets) ? data.assets : []);
      } catch (err) {
        if (cancelled) return;
        setProjectFolders([]);
        setProjectFoldersError(err instanceof Error ? err.message : "Failed to load project folders");
      } finally {
        if (!cancelled) setProjectFoldersLoading(false);
      }
    }
    loadProjectFolders();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (activeTab !== "music" && activeTab !== "overview") return;
    setQueue(displayedProjectSongs.filter((song) => song.audioUrl));
  }, [activeTab, displayedProjectSongs, setQueue]);

  function setActiveTab(nextTab: ProjectTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    if (nextTab !== "overview") params.delete("folder");
    router.replace(`/projects/${projectId}?${params.toString()}`, { scroll: false });
  }

  function setActiveFolder(nextFolderId: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "overview");
    if (nextFolderId == null) params.delete("folder");
    else params.set("folder", String(nextFolderId));
    router.replace(`/projects/${projectId}?${params.toString()}`, { scroll: false });
  }

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function handleRemoveFromProject(songId: string) {
    setProjectSongs((current) => current.filter((song) => song.id !== songId));
    setProjectAssets((current) => current.filter((asset) => !(asset.asset_type === "song" && asset.asset_id === songId)));
    showToast("Song removed from project");
  }

  async function handleMoveSong(song: ProjectSong, folderId: number | null) {
    if (!song.project_asset_id) return;
    const previousFolderId = song.project_folder_id ?? null;
    setProjectSongs((current) => current.map((item) => (item.id === song.id ? { ...item, project_folder_id: folderId } : item)));
    setProjectAssets((current) => current.map((asset) => asset.id === song.project_asset_id ? { ...asset, folder_id: folderId } : asset));
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: song.project_asset_id, folder_id: folderId }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || "Failed to move file");
      showToast(folderId == null ? "Moved to root" : "Moved file");
    } catch (err) {
      setProjectSongs((current) => current.map((item) => item.id === song.id ? { ...item, project_folder_id: previousFolderId } : item));
      setProjectAssets((current) => current.map((asset) => asset.id === song.project_asset_id ? { ...asset, folder_id: previousFolderId } : asset));
      showToast(err instanceof Error ? err.message : "Couldn't move file");
    } finally {
      setMovingSong(null);
    }
  }

  async function handleCreateFolder() {
    const cleanName = newFolderName.trim();
    if (!cleanName || creatingFolder) return;
    setCreatingFolder(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, parent_folder_id: activeFolderId, asset_type: null }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || "Failed to create folder");
      setProjectFolders((current) => [...current, data]);
      setNewFolderName("");
      setCreateFolderOpen(false);
      showToast("Folder created");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  function downloadFiles(songs: ProjectSong[], emptyMessage: string) {
    const downloadableSongs = songs.filter((song) => song.audioUrl);
    if (downloadableSongs.length === 0) { showToast(emptyMessage); return; }
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
    showToast(downloadableSongs.length === 1 ? "Starting 1 download" : `Starting ${downloadableSongs.length} downloads`);
  }

  function handleDownloadActiveTab() {
    if (activeTab === "music") return downloadFiles(projectSongs, "No music files to download");
    if (activeTab === "sound-fx") return showToast("No sound FX files to download yet");
    if (activeTab === "visual-fx") return showToast("No visual FX files to download yet");
    if (activeTab === "colour-grading") return showToast("No colour grading files to download yet");
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
    const cleanName = editName.trim();
    if (!cleanName) return showToast("Project name required");
    setIsSavingProject(true);
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, description: editDescription.trim() || null }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) { showToast("Couldn't save project"); return; }
      setProjects((prev) => prev.map((item) => item.id === editingProject.id ? data || { ...item, name: cleanName, description: editDescription.trim() || null } : item));
      setEditingProject(null);
      showToast("Project saved");
    } catch {
      showToast("Couldn't save project");
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleDelete() {
    if (!editingProject || deletingProjectId) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${editingProject.name}"? This cannot be undone.`);
    if (!confirmed) return showToast("Delete cancelled");
    const projectIdToDelete = editingProject.id;
    setEditingProject(null);
    setDeletingProjectId(projectIdToDelete);
    try {
      const res = await fetch(`/api/projects/${projectIdToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((item) => item.id !== projectIdToDelete));
        showToast("Project deleted");
        router.push("/music");
      } else {
        showToast("Couldn't delete project");
      }
    } catch {
      showToast("Couldn't delete project");
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <>
      <style>{`
        .project-detail-page { position: relative; margin-left: var(--sidebar-width); margin-top: 56px; min-height: calc(100vh - 56px); overflow-x: visible; overflow-y: visible; background: var(--bg-primary); color: var(--text-primary); transition: margin-left 0.2s ease; }
        .project-detail-shell { position: relative; z-index: 1; padding: 0 32px; }
        .project-detail-hero { display: block; padding: 88px 0 30px; }
        .project-detail-kicker, .project-file-browser-kicker, .project-file-section-heading { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
        .project-detail-title { margin-top: 8px; max-width: 640px; font-family: var(--font-instrument-sans); font-size: 56px; font-weight: 500; line-height: 0.94; letter-spacing: -0.055em; color: var(--text-primary); }
        .project-detail-meta { margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11px; color: var(--text-secondary); }
        .project-detail-dot { color: var(--text-muted); }
        .project-detail-description { margin-top: 16px; max-width: 520px; font-size: 12px; line-height: 1.65; color: var(--text-secondary); }
        .project-tabs-row { position: sticky; top: 56px; z-index: 90; display: flex; min-height: 49px; flex-wrap: wrap; align-items: center; gap: 8px; margin-left: -32px; margin-right: -32px; border-bottom: 1px solid var(--border); background: var(--bg-primary); padding: 0 32px; }
        .project-tab-skeleton { width: 86px; height: 28px; border-radius: 6px; }
        .project-sort-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-left: -32px; margin-right: -32px; background: var(--bg-primary); padding: 16px 32px; }
        .project-tab-panel { margin-left: -32px; margin-right: -32px; }
        .project-file-browser { padding: 32px; }
        .project-file-browser-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
        .project-file-browser-title-wrap h2 { margin-top: 6px; font-size: 22px; font-weight: 500; letter-spacing: -0.03em; color: var(--text-primary); }
        .project-file-browser-actions { display: flex; align-items: center; gap: 8px; }
        .project-breadcrumbs { margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; font-size: 12px; color: var(--text-muted); }
        .project-breadcrumbs span { display: inline-flex; align-items: center; gap: 7px; }
        .project-breadcrumbs button { cursor: pointer; color: var(--text-secondary); transition: color 0.15s ease; }
        .project-breadcrumbs button:hover { color: var(--text-primary); }
        .project-file-browser-section { padding-top: 24px; }
        .project-file-section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .project-folder-grid, .project-file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(188px, 1fr)); gap: 12px; }
        .project-folder-card, .project-file-card { display: flex; min-height: 112px; cursor: pointer; flex-direction: column; justify-content: space-between; gap: 14px; border: 1px solid var(--border); border-radius: 16px; background: var(--bg-secondary); padding: 14px; text-align: left; transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease; }
        .project-folder-card:hover, .project-file-card:hover { border-color: color-mix(in srgb, var(--border) 72%, var(--text-primary)); background: var(--bg-hover); transform: translateY(-1px); }
        .project-folder-card { min-height: 104px; }
        .project-folder-card.skeleton-card { cursor: default; transform: none; }
        .project-folder-icon, .project-file-card-icon, .project-file-icon { display: flex; height: 36px; width: 36px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-tertiary); color: var(--text-secondary); font-size: 14px; }
        .project-folder-copy { min-width: 0; display: flex; flex-direction: column; }
        .project-folder-name, .project-file-card-title, .project-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .project-folder-meta, .project-file-card-meta, .project-file-meta, .project-file-list-meta { margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-secondary); }
        .project-file-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .project-file-action { height: 28px; cursor: pointer; border: 1px solid var(--border); border-radius: 8px; background: transparent; padding: 0 10px; font-size: 11px; color: var(--text-secondary); transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; }
        .project-file-action:hover { border-color: var(--text-muted); background: var(--bg-hover-strong); color: var(--text-primary); }
        .project-file-list { overflow: hidden; border: 1px solid var(--border); border-radius: 14px; background: var(--bg-secondary); }
        .project-file-row { display: grid; min-height: 58px; grid-template-columns: 38px minmax(0, 1fr) 88px 76px; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-subtle); padding: 0 14px; }
        .project-file-row:last-child { border-bottom: none; }
        .project-file-main { min-width: 0; }
        .project-file-empty-inline { display: flex; min-height: 84px; align-items: center; justify-content: center; border: 1px dashed var(--border); border-radius: 14px; background: var(--bg-secondary); padding: 18px; text-align: center; font-size: 12px; color: var(--text-secondary); }
        .project-empty, .project-error { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-secondary); }
        .project-empty h2, .project-error h2 { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .project-empty p, .project-error p { margin-top: 6px; max-width: 320px; font-size: 12px; line-height: 1.6; }
        .project-footer-wrap { padding: 40px 32px 8px; }
        .project-skeleton-block { position: relative; overflow: hidden; background: var(--bg-tertiary); }
        .project-skeleton-block::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--bg-hover) 72%, transparent), transparent); animation: project-skeleton-shimmer 1.6s ease-in-out infinite; }
        @keyframes project-skeleton-shimmer { 100% { transform: translateX(100%); } }
        .project-detail-skeleton-kicker { width: 82px; height: 8px; margin-top: 2px; }
        .project-detail-skeleton-title { width: min(420px, 72%); height: 52px; margin-top: 13px; }
        .project-detail-skeleton-meta { display: flex; align-items: center; gap: 8px; margin-top: 18px; }
        .project-detail-skeleton-meta-line { width: 72px; height: 8px; }
        .project-detail-skeleton-meta-line.short { width: 140px; }
        @media (max-width: 760px) {
          .project-detail-shell { padding: 0 18px; }
          .project-tabs-row, .project-sort-row, .project-tab-panel { margin-left: -18px; margin-right: -18px; }
          .project-tabs-row, .project-sort-row, .project-file-browser { padding-left: 18px; padding-right: 18px; }
          .project-file-browser-top, .project-file-browser-actions { flex-direction: column; align-items: stretch; }
          .project-file-row { grid-template-columns: 38px minmax(0, 1fr) 76px; }
          .project-file-list-meta { display: none; }
          .project-footer-wrap { padding-left: 18px; padding-right: 18px; }
        }
      `}</style>

      <main className="project-detail-page">
        <div className="project-detail-shell">
          {loading ? (
            <ProjectPageSkeleton />
          ) : error ? (
            <div className="project-error"><h2>Couldn&apos;t load project</h2><p>{error}</p></div>
          ) : !project ? (
            <div className="project-error"><h2>Project not found</h2><p>This project may have been deleted or is no longer available.</p></div>
          ) : (
            <>
              <section className="project-detail-hero">
                <div className="project-detail-kicker">Project</div>
                <h1 className="project-detail-title">{project.name}</h1>
                <div className="project-detail-meta">
                  <span>Project workspace</span>
                  {assetsLoaded && (
                    <>
                      <span className="project-detail-dot">·</span>
                      <span>{totalFileCount} {totalFileCount === 1 ? "file" : "files"}</span>
                    </>
                  )}
                  {projectDate && (
                    <>
                      <span className="project-detail-dot">·</span>
                      <span>Created {projectDate}</span>
                    </>
                  )}
                </div>
                {project.description && <p className="project-detail-description">{project.description}</p>}
              </section>

              <div className="project-tabs-row">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={`${filterTriggerBaseClass} ${isActive ? filterTriggerActiveClass : filterTriggerInactiveClass}`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}

                <div className="project-tabs-row-actions">
                  {activeTab === "overview" && (
                    <>
                      <button
                        type="button"
                        className="project-new-folder-button"
                        onClick={() => setCreateFolderOpen(true)}
                        aria-label="New folder"
                        title="New folder"
                      >
                        <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden="true">
                          <FolderIcon size={16} />
                          <span className="absolute -right-[2px] -top-[3px] flex h-[8px] w-[8px] items-center justify-center rounded-full bg-[var(--bg-primary)]">
                            <svg
                              width="6"
                              height="6"
                              viewBox="0 0 6 6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.25"
                              strokeLinecap="round"
                            >
                              <path d="M3 1.2v3.6" />
                              <path d="M1.2 3h3.6" />
                            </svg>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="project-view-toggle-button"
                        aria-label={fileViewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
                        title={fileViewMode === "grid" ? "List view" : "Grid view"}
                        onClick={() => setFileViewMode(fileViewMode === "grid" ? "list" : "grid")}
                      >
                        {fileViewMode === "grid" ? <ListViewIcon /> : <GridViewIcon />}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={openEdit}
                    className={borderedIconButton9Class}
                    aria-label={`Edit ${project.name}`}
                    title="Edit"
                  >
                    <EditIcon />
                  </button>
                </div>
              </div>

              {activeTab !== "overview" && (
                <div className="project-sort-row">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProjectSort(option.value)}
                      className={`${quickFilterButtonClass} ${projectSort === option.value ? quickFilterButtonActiveClass : ""}`}
                    >
                      {option.label}
                    </button>
                  ))}
                  {activeTab === "music" && (
                    <button
                      type="button"
                      onClick={() => setShowEditPointMarkers(!showEditPointMarkers)}
                      className={`${quickFilterButtonClass} ${showEditPointMarkers ? quickFilterButtonActiveClass : ""}`}
                      aria-pressed={showEditPointMarkers}
                    >
                      markers
                    </button>
                  )}
                </div>
              )}

              <section className="project-tab-panel">
                {activeTab === "overview" ? (
                  <ProjectFileBrowser
                    folders={projectFolders}
                    assets={projectAssets}
                    songs={displayedProjectSongs}
                    loading={projectFoldersLoading || projectSongsLoading}
                    error={projectFoldersError || projectSongsError}
                    activeFolderId={activeFolderId}
                    viewMode={fileViewMode}
                    onOpenFolder={setActiveFolder}
                    onMoveSong={setMovingSong}
                    downloadSlot={
                      <DropdownShell
                        open={downloadMenuOpen}
                        onOpenChange={setDownloadMenuOpen}
                        placement="bottom-end"
                        offsetAmount={8}
                        flippedOffsetAmount={8}
                        collisionPadding={{ top: 70, right: 32, bottom: playerVisible ? 85 : 16, left: 16 }}
                        trigger={({ open }) => (
                          <button
                            type="button"
                            className={`${filterTriggerBaseClass} project-download-trigger ${open ? filterTriggerActiveClass : filterTriggerInactiveClass}`}
                            aria-label="Download project files"
                            aria-expanded={open}
                          >
                            <span>Download</span>
                            <DownloadIconSmall />
                          </button>
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => { setDownloadMenuOpen(false); downloadFiles(projectSongs, "No project files to download yet"); }}
                        >
                          Download all project files
                        </button>
                      </DropdownShell>
                    }
                  />
                ) : activeTab === "music" ? (
                  <MusicTabState
                    projectId={projectId}
                    songs={displayedProjectSongs}
                    loading={projectSongsLoading}
                    error={projectSongsError}
                    showEditPointMarkers={showEditPointMarkers}
                    onRemoveFromProject={handleRemoveFromProject}
                  />
                ) : (
                  <EmptyTabState activeTab={activeTab} />
                )}
              </section>
            </>
          )}

          {!loading && (
            <div className="project-footer-wrap" style={{ paddingBottom: playerVisible ? "72px" : "8px" }}>
              <FooterBottom />
            </div>
          )}
        </div>
      </main>

      <Toast message={toastMessage} bottomOffset={playerVisible ? "88px" : "24px"} />

      <ProjectFolderPickerModal
        isOpen={!!movingSong}
        folders={projectFolders}
        initialFolderId={movingSong?.project_folder_id ?? null}
        title={movingSong ? `Move ${movingSong.title}` : "Move File"}
        confirmLabel="Move Here"
        onClose={() => setMovingSong(null)}
        onConfirm={(folderId) => { if (!movingSong) return; handleMoveSong(movingSong, folderId); }}
      />

      <ModalShell
        isOpen={createFolderOpen}
        title="New Folder"
        onClose={() => { setCreateFolderOpen(false); setNewFolderName(""); }}
        closeLabel="Close new folder modal"
        footer={
          <button type="button" onClick={handleCreateFolder} className={modalPrimaryButtonClass} disabled={creatingFolder || !newFolderName.trim()}>
            {creatingFolder ? "Creating..." : "Create Folder"}
          </button>
        }
      >
        <label className="block text-[11px] font-medium text-[var(--text-secondary)]">Folder name</label>
        <input
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleCreateFolder(); } }}
          autoFocus
          className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
          placeholder="Client Favorites"
        />
      </ModalShell>

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
