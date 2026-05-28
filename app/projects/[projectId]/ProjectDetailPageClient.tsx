"use client";

import EditProjectModal from "@/components/EditProjectModal";
import FooterBottom from "@/components/FooterBottom";
import ProjectFileBrowser from "@/components/ProjectFileBrowser";
import ProjectFolderPickerModal from "@/components/ProjectFolderPickerModal";
import Toast from "@/components/Toast";
import CreateFolderModal from "@/components/project-detail/CreateFolderModal";
import EmptyTabState from "@/components/project-detail/EmptyTabState";
import MusicTabState from "@/components/project-detail/MusicTabState";
import ProjectDetailHeader from "@/components/project-detail/ProjectDetailHeader";
import ProjectPageSkeleton from "@/components/project-detail/ProjectPageSkeleton";
import ProjectSortRow from "@/components/project-detail/ProjectSortRow";
import ProjectTabs from "@/components/project-detail/ProjectTabs";
import ProjectToolbar from "@/components/project-detail/ProjectToolbar";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import type { Project, ProjectAsset, ProjectFolder } from "@/lib/types";
import type { ProjectSong } from "@/lib/project-detail/projectDetailTypes";
import {
  formatSyncTime,
  getTimestamp,
  getVisibleProjectTabs,
  isProjectTab,
  isReservedProjectFolderName,
  type ProjectFileView,
  type ProjectSort,
  type ProjectTab,
} from "@/lib/project-detail/projectDetailUtils";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./ProjectDetailPage.css";

export default function ProjectDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSong, setQueue } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { projects, setProjects, loading, error } = useProjectsContext();

  const projectId = String(params.projectId || "");
  const playerVisible = !!currentSong;

  const [projectSongs, setProjectSongs] = useState<ProjectSong[]>([]);
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [projectFolders, setProjectFolders] = useState<ProjectFolder[]>([]);
  const [projectSort, setProjectSort] = useState<ProjectSort>("newest");
  const [fileViewMode, setFileViewMode] = useState<ProjectFileView>("grid");
  const [projectSongsLoading, setProjectSongsLoading] = useState(true);
  const [projectSongsError, setProjectSongsError] = useState<string | null>(
    null,
  );
  const [projectFoldersLoading, setProjectFoldersLoading] = useState(true);
  const [projectFoldersError, setProjectFoldersError] = useState<string | null>(
    null,
  );
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(
    null,
  );
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [movingSong, setMovingSong] = useState<ProjectSong | null>(null);
  const [projectMoreOpen, setProjectMoreOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const folderParam = searchParams.get("folder");
  const activeTab: ProjectTab = isProjectTab(tabParam) ? tabParam : "overview";
  const activeFolderId =
    folderParam && Number.isFinite(Number(folderParam))
      ? Number(folderParam)
      : null;

  const project = useMemo(
    () => projects.find((item) => String(item.id) === projectId) ?? null,
    [projects, projectId],
  );

  const totalFileCount = projectAssets.length;
  const assetsLoaded = !projectSongsLoading && !projectFoldersLoading;
  const syncState =
    projectSongsLoading || projectFoldersLoading
      ? "syncing"
      : projectSongsError || projectFoldersError
        ? "error"
        : "success";

  const latestSyncDate = useMemo(() => {
    const projectFolderTimestamps = projectFolders.map((folder) => {
      const folderDates = folder as {
        created_at?: string | null;
        updated_at?: string | null;
      };

      return getTimestamp(folderDates.updated_at ?? folderDates.created_at);
    });
    const projectAssetTimestamps = projectAssets.map((asset) => {
      const assetDates = asset as {
        created_at?: string | null;
        updated_at?: string | null;
      };

      return getTimestamp(assetDates.updated_at ?? assetDates.created_at);
    });
    const projectSongTimestamps = projectSongs.map((song) =>
      getTimestamp(song.project_added_at),
    );
    const timestamps = [
      getTimestamp(project?.created_at),
      ...projectFolderTimestamps,
      ...projectAssetTimestamps,
      ...projectSongTimestamps,
    ].filter((time): time is number => time != null);

    if (timestamps.length === 0) return null;

    return new Date(Math.max(...timestamps));
  }, [project?.created_at, projectAssets, projectFolders, projectSongs]);

  const syncLabel = formatSyncTime(latestSyncDate, syncState);

  const { availableTabValues, visibleTabs } = useMemo(
    () =>
      getVisibleProjectTabs({
        projectAssets,
        projectSongsLength: projectSongs.length,
      }),
    [projectAssets, projectSongs.length],
  );

  const activeProjectTab: ProjectTab = availableTabValues.has(activeTab)
    ? activeTab
    : "overview";

  const displayedProjectSongs = useMemo(() => {
    const indexedSongs = projectSongs.map((song, index) => ({ song, index }));
    const filteredSongs =
      projectSort === "liked"
        ? indexedSongs.filter(({ song }) => favoriteIdSet.has(song.id))
        : indexedSongs;
    const sortedSongs = [...filteredSongs].sort((a, b) => {
      if (projectSort === "alphabetical")
        return a.song.title.localeCompare(b.song.title, undefined, {
          sensitivity: "base",
        });
      const aDate = a.song.project_added_at
        ? new Date(a.song.project_added_at).getTime()
        : 0;
      const bDate = b.song.project_added_at
        ? new Date(b.song.project_added_at).getTime()
        : 0;
      if (projectSort === "oldest") return aDate - bDate || a.index - b.index;
      return bDate - aDate || b.index - a.index;
    });
    return sortedSongs.map(({ song }) => song);
  }, [projectSongs, projectSort, favoriteIdSet]);

  const loadProjectSongs = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!projectId) return;
      if (!silent) setProjectSongsLoading(true);
      setProjectSongsError(null);
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/assets?type=song`,
          { cache: "no-store" },
        );
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok)
          throw new Error(data?.error || "Failed to load project songs");
        const nextSongs = Array.isArray(data?.songs)
          ? (data.songs as ProjectSong[])
          : [];
        const nextAssets = Array.isArray(data?.assets)
          ? (data.assets as ProjectAsset[])
          : [];
        setProjectSongs(nextSongs.filter((song) => song.id));
        setProjectAssets(
          nextAssets.filter((asset) => Number.isFinite(asset.id)),
        );
      } catch (err) {
        setProjectSongs([]);
        setProjectAssets([]);
        setProjectSongsError(
          err instanceof Error ? err.message : "Failed to load project songs",
        );
      } finally {
        if (!silent) setProjectSongsLoading(false);
      }
    },
    [projectId],
  );

  const loadProjectFolders = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!projectId) return;
      if (!silent) setProjectFoldersLoading(true);
      setProjectFoldersError(null);
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/folders`,
          { cache: "no-store" },
        );
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok)
          throw new Error(data?.error || "Failed to load project folders");
        setProjectFolders(Array.isArray(data?.folders) ? data.folders : []);
        setProjectAssets(Array.isArray(data?.assets) ? data.assets : []);
      } catch (err) {
        setProjectFolders([]);
        setProjectFoldersError(
          err instanceof Error ? err.message : "Failed to load project folders",
        );
      } finally {
        if (!silent) setProjectFoldersLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await loadProjectSongs();
      if (cancelled) return;
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [loadProjectSongs]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await loadProjectFolders();
      if (cancelled) return;
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [loadProjectFolders]);

  // Realtime sync: connect to the server-side SSE events endpoint.
  // This uses supabaseServer (service role) on the server, which correctly
  // receives postgres_changes regardless of RLS — fixing the issue where
  // the client-side anon supabase connection silently received no events.
  useEffect(() => {
    if (!projectId) return;

    let refreshTimer: ReturnType<typeof window.setTimeout> | null = null;
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof window.setTimeout> | null = null;

    function scheduleRefresh() {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void Promise.all([
          loadProjectSongs({ silent: true }),
          loadProjectFolders({ silent: true }),
        ]);
      }, 250);
    }

    function connect() {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      const source = new EventSource(
        `/api/projects/${encodeURIComponent(projectId)}/events`,
      );

      source.addEventListener("changed", scheduleRefresh);

      source.onerror = () => {
        source.close();
        eventSource = null;
        retryTimer = window.setTimeout(connect, 5000);
      };

      eventSource = source;
    }

    connect();

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [loadProjectFolders, loadProjectSongs, projectId]);

  useEffect(() => {
    if (activeProjectTab !== "music" && activeProjectTab !== "overview") return;
    setQueue(displayedProjectSongs.filter((song) => song.audioUrl));
  }, [activeProjectTab, displayedProjectSongs, setQueue]);

  function setActiveTab(nextTab: ProjectTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    if (nextTab !== "overview") params.delete("folder");
    router.replace(`/projects/${projectId}?${params.toString()}`, {
      scroll: false,
    });
  }

  function setActiveFolder(nextFolderId: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "overview");
    if (nextFolderId == null) params.delete("folder");
    else params.set("folder", String(nextFolderId));
    router.replace(`/projects/${projectId}?${params.toString()}`, {
      scroll: false,
    });
  }

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function toggleFileViewMode() {
    setFileViewMode((current) => (current === "grid" ? "list" : "grid"));
  }

  function handleRemoveFromProject(songId: string) {
    setProjectSongs((current) => current.filter((song) => song.id !== songId));
    setProjectAssets((current) =>
      current.filter(
        (asset) => !(asset.asset_type === "song" && asset.asset_id === songId),
      ),
    );
    showToast("Song removed from project");
  }

  async function handleMoveSong(song: ProjectSong, folderId: number | null) {
    if (!song.project_asset_id) return;
    const previousFolderId = song.project_folder_id ?? null;
    setProjectSongs((current) =>
      current.map((item) =>
        item.id === song.id ? { ...item, project_folder_id: folderId } : item,
      ),
    );
    setProjectAssets((current) =>
      current.map((asset) =>
        asset.id === song.project_asset_id
          ? { ...asset, folder_id: folderId }
          : asset,
      ),
    );
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/assets`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_id: song.project_asset_id,
            folder_id: folderId,
          }),
        },
      );
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || "Failed to move file");
      showToast(folderId == null ? "Moved to root" : "Moved file");
    } catch (err) {
      setProjectSongs((current) =>
        current.map((item) =>
          item.id === song.id
            ? { ...item, project_folder_id: previousFolderId }
            : item,
        ),
      );
      setProjectAssets((current) =>
        current.map((asset) =>
          asset.id === song.project_asset_id
            ? { ...asset, folder_id: previousFolderId }
            : asset,
        ),
      );
      showToast(err instanceof Error ? err.message : "Couldn't move file");
    } finally {
      setMovingSong(null);
    }
  }

  async function handleCreateFolder() {
    const cleanName = newFolderName.trim();

    if (!cleanName || creatingFolder) return;

    if (isReservedProjectFolderName(cleanName)) {
      showToast(
        `"${cleanName}" is reserved for Filmwave media sections. Choose a different folder name.`,
      );
      return;
    }

    setCreatingFolder(true);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/folders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName,
            parent_folder_id: activeFolderId,
            asset_type: null,
          }),
        },
      );
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
        body: JSON.stringify({
          name: cleanName,
          description: editDescription.trim() || null,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        showToast("Couldn't save project");
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
      setEditingProject(null);
      showToast("Project saved");
    } catch {
      showToast("Couldn't save project");
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleDeleteProject(targetProject: Project | null) {
    if (!targetProject || deletingProjectId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${targetProject.name}"? This cannot be undone.`,
    );

    if (!confirmed) return showToast("Delete cancelled");

    const projectIdToDelete = targetProject.id;

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
        showToast("Couldn't delete project");
      }
    } catch {
      showToast("Couldn't delete project");
    } finally {
      setDeletingProjectId(null);
    }
  }

  async function handleDelete() {
    await handleDeleteProject(editingProject);
  }

  return (
    <>
      <main className="project-detail-page">
        <div className="project-detail-shell">
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
              <ProjectDetailHeader
                assetsLoaded={assetsLoaded}
                project={project}
                syncLabel={syncLabel}
                syncState={syncState}
                totalFileCount={totalFileCount}
              />

              <ProjectTabs
                activeTab={activeProjectTab}
                tabs={visibleTabs}
                onTabChange={setActiveTab}
              />

              {activeProjectTab !== "overview" && (
                <ProjectSortRow
                  projectSort={projectSort}
                  onProjectSortChange={setProjectSort}
                />
              )}

              <section className="project-tab-panel">
                {activeProjectTab === "overview" ? (
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
                      <ProjectToolbar
                        fileViewMode={fileViewMode}
                        project={project}
                        projectMoreOpen={projectMoreOpen}
                        onCreateFolder={() => setCreateFolderOpen(true)}
                        onDeleteProject={(targetProject) => {
                          void handleDeleteProject(targetProject);
                        }}
                        onOpenEdit={openEdit}
                        onProjectMoreOpenChange={setProjectMoreOpen}
                        onToggleFileViewMode={toggleFileViewMode}
                        onToast={showToast}
                      />
                    }
                  />
                ) : activeProjectTab === "music" ? (
                  <MusicTabState
                    projectId={projectId}
                    songs={displayedProjectSongs}
                    loading={projectSongsLoading}
                    error={projectSongsError}
                    onRemoveFromProject={handleRemoveFromProject}
                  />
                ) : (
                  <EmptyTabState activeTab={activeProjectTab} />
                )}
              </section>
            </>
          )}

          {!loading && (
            <div
              className="project-footer-wrap"
              style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
            >
              <FooterBottom />
            </div>
          )}
        </div>
      </main>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "88px" : "24px"}
      />

      <ProjectFolderPickerModal
        isOpen={!!movingSong}
        folders={projectFolders}
        initialFolderId={movingSong?.project_folder_id ?? null}
        title={movingSong ? `Move ${movingSong.title}` : "Move File"}
        confirmLabel="Move Here"
        movingSong={movingSong}
        moveItemType="song"
        onClose={() => setMovingSong(null)}
        onConfirm={(folderId) => {
          if (!movingSong) return;
          void handleMoveSong(movingSong, folderId);
        }}
      />

      <CreateFolderModal
        creatingFolder={creatingFolder}
        isOpen={createFolderOpen}
        newFolderName={newFolderName}
        onClose={() => {
          setCreateFolderOpen(false);
          setNewFolderName("");
        }}
        onCreateFolder={handleCreateFolder}
        onNewFolderNameChange={setNewFolderName}
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
