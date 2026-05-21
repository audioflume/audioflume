"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  type UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import GridViewIcon from "@/components/icons/GridViewIcon";
import ListViewIcon from "@/components/icons/ListViewIcon";
import type { ProjectAsset, ProjectFolder, Song } from "@/lib/types";
import ProjectFolderCard from "./project-browser/ProjectFolderCard";
import ProjectSongFileCard from "./project-browser/ProjectSongFileCard";
import "./project-browser/ProjectFileBrowser.module.css";
import "./project-browser/ProjectFileBrowserOverrides.css";

type ProjectFileView = "grid" | "list";

type ProjectSong = Song & {
  project_asset_id?: number;
  project_id?: number;
  project_position?: number;
  project_added_at?: string;
  project_notes?: string | null;
  project_folder_id?: number | null;
};

type ProjectFileBrowserProps = {
  folders: ProjectFolder[];
  assets: ProjectAsset[];
  songs: ProjectSong[];
  loading: boolean;
  error: string | null;
  activeFolderId: number | null;
  viewMode: ProjectFileView;
  onViewModeChange: (mode: ProjectFileView) => void;
  onOpenFolder: (folderId: number | null) => void;
  onMoveSong: (song: ProjectSong) => void;
  onCreateFolder: () => void;
};

type DragData =
  | { kind: "folder"; folderId: number }
  | { kind: "song"; assetId: number; songId: string };

const ROOT_DROP_ID = "drop-root";
const BREADCRUMB_ROOT_DROP_ID = "drop-breadcrumb-root";

function getFolderDragId(folderId: number) {
  return `folder:${folderId}`;
}

function getSongDragId(song: ProjectSong) {
  return `song:${song.project_asset_id ?? song.id}`;
}

function getFolderDropId(folderId: number) {
  return `drop-folder:${folderId}`;
}

function getBreadcrumbDropId(folderId: number | null) {
  return folderId == null ? BREADCRUMB_ROOT_DROP_ID : `drop-breadcrumb:${folderId}`;
}

function parseDropFolderId(value: UniqueIdentifier | null | undefined) {
  if (value == null) return undefined;

  const id = String(value);

  if (id === ROOT_DROP_ID || id === BREADCRUMB_ROOT_DROP_ID) return null;
  if (id.startsWith("drop-folder:")) return Number(id.replace("drop-folder:", ""));
  if (id.startsWith("drop-breadcrumb:")) return Number(id.replace("drop-breadcrumb:", ""));

  return undefined;
}

function SortableFolderItem({
  folder,
  viewMode,
  onOpen,
}: {
  folder: ProjectFolder;
  viewMode: ProjectFileView;
  onOpen: (folderId: number) => void;
}) {
  const sortable = useSortable({
    id: getFolderDragId(folder.id),
    data: { kind: "folder", folderId: folder.id } satisfies DragData,
  });
  const droppable = useDroppable({
    id: getFolderDropId(folder.id),
    data: { kind: "folder-drop", folderId: folder.id },
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={(node) => {
        sortable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      style={style}
      className={droppable.isOver ? "project-drag-over-folder" : ""}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <ProjectFolderCard folder={folder} viewMode={viewMode} onOpen={onOpen} />
    </div>
  );
}

function SortableSongItem({
  song,
  viewMode,
  queueSongs,
  onMove,
}: {
  song: ProjectSong;
  viewMode: ProjectFileView;
  queueSongs: ProjectSong[];
  onMove: (song: ProjectSong) => void;
}) {
  const sortable = useSortable({
    id: getSongDragId(song),
    data: {
      kind: "song",
      assetId: Number(song.project_asset_id),
      songId: song.id,
    } satisfies DragData,
    disabled: !Number.isFinite(song.project_asset_id),
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <ProjectSongFileCard song={song} viewMode={viewMode} queueSongs={queueSongs} onMove={onMove} />
    </div>
  );
}

function BreadcrumbDropButton({
  folderId,
  active,
  children,
  onClick,
}: {
  folderId: number | null;
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: getBreadcrumbDropId(folderId),
    data: { kind: "breadcrumb-drop", folderId },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`${active ? "is-current" : ""} ${isOver ? "is-drag-over" : ""}`}
    >
      {children}
    </button>
  );
}

export default function ProjectFileBrowser({
  folders,
  assets: _assets,
  songs,
  loading,
  error,
  activeFolderId,
  viewMode,
  onViewModeChange,
  onOpenFolder,
  onMoveSong,
  onCreateFolder,
}: ProjectFileBrowserProps) {
  const [folderParentOverrides, setFolderParentOverrides] = useState<Map<number, number | null>>(
    () => new Map(),
  );
  const [songFolderOverrides, setSongFolderOverrides] = useState<Map<number, number | null>>(
    () => new Map(),
  );
  const lastBreadcrumbTargetRef = useRef<number | null | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const effectiveFolders = useMemo(
    () =>
      folders.map((folder) =>
        folderParentOverrides.has(folder.id)
          ? { ...folder, parent_folder_id: folderParentOverrides.get(folder.id) ?? null }
          : folder,
      ),
    [folders, folderParentOverrides],
  );

  const effectiveSongs = useMemo(
    () =>
      songs.map((song) => {
        const assetId = Number(song.project_asset_id);

        return Number.isFinite(assetId) && songFolderOverrides.has(assetId)
          ? { ...song, project_folder_id: songFolderOverrides.get(assetId) ?? null }
          : song;
      }),
    [songs, songFolderOverrides],
  );

  const foldersById = useMemo(() => new Map(effectiveFolders.map((folder) => [folder.id, folder])), [effectiveFolders]);

  const breadcrumbFolders = useMemo(() => {
    if (activeFolderId == null) return [];
    const chain: ProjectFolder[] = [];
    const visited = new Set<number>();
    let current = foldersById.get(activeFolderId) ?? null;
    while (current && !visited.has(current.id)) {
      chain.unshift(current);
      visited.add(current.id);
      current = current.parent_folder_id == null ? null : foldersById.get(current.parent_folder_id) ?? null;
    }
    return chain;
  }, [activeFolderId, foldersById]);

  const visibleFolders = useMemo(() => effectiveFolders.filter((folder) => folder.parent_folder_id === activeFolderId), [effectiveFolders, activeFolderId]);
  const visibleSongs = useMemo(() => effectiveSongs.filter((song) => (song.project_folder_id ?? null) === activeFolderId), [effectiveSongs, activeFolderId]);
  const itemCount = visibleFolders.length + visibleSongs.length;
  const nextViewMode: ProjectFileView = viewMode === "grid" ? "list" : "grid";
  const sortableIds = useMemo(
    () => [
      ...visibleFolders.map((folder) => getFolderDragId(folder.id)),
      ...visibleSongs.map(getSongDragId),
    ],
    [visibleFolders, visibleSongs],
  );

  function folderIsDescendant(targetFolderId: number, draggedFolderId: number) {
    let current = foldersById.get(targetFolderId) ?? null;
    const visited = new Set<number>();

    while (current && !visited.has(current.id)) {
      if (current.id === draggedFolderId) return true;
      visited.add(current.id);
      current = current.parent_folder_id == null ? null : foldersById.get(current.parent_folder_id) ?? null;
    }

    return false;
  }

  function getValidDropFolderId(event: DragOverEvent | DragEndEvent) {
    const targetFolderId = parseDropFolderId(event.over?.id);

    if (targetFolderId === undefined) return undefined;

    const dragData = event.active.data.current as DragData | undefined;

    if (dragData?.kind === "folder") {
      if (targetFolderId === dragData.folderId) return undefined;
      if (targetFolderId !== null && folderIsDescendant(targetFolderId, dragData.folderId)) return undefined;
    }

    return targetFolderId;
  }

  async function moveSongToFolder(song: ProjectSong, folderId: number | null) {
    const assetId = Number(song.project_asset_id);

    if (!Number.isFinite(assetId)) return;

    const previousFolderId = song.project_folder_id ?? null;

    setSongFolderOverrides((current) => {
      const next = new Map(current);
      next.set(assetId, folderId);
      return next;
    });

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(String(song.project_id))}/assets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, folder_id: folderId }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || "Failed to move file");
    } catch (err) {
      setSongFolderOverrides((current) => {
        const next = new Map(current);
        next.set(assetId, previousFolderId);
        return next;
      });
      console.error(err);
    }
  }

  async function moveFolderToFolder(folder: ProjectFolder, parentFolderId: number | null) {
    const previousParentFolderId = folder.parent_folder_id ?? null;

    setFolderParentOverrides((current) => {
      const next = new Map(current);
      next.set(folder.id, parentFolderId);
      return next;
    });

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(String(folder.project_id))}/folders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folder.id, parent_folder_id: parentFolderId }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || "Failed to move folder");
    } catch (err) {
      setFolderParentOverrides((current) => {
        const next = new Map(current);
        next.set(folder.id, previousParentFolderId);
        return next;
      });
      console.error(err);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const targetFolderId = getValidDropFolderId(event);
    const overId = event.over?.id == null ? "" : String(event.over.id);

    if (!overId.startsWith("drop-breadcrumb")) return;
    if (targetFolderId === undefined) return;
    if (targetFolderId === activeFolderId) return;
    if (lastBreadcrumbTargetRef.current === targetFolderId) return;

    lastBreadcrumbTargetRef.current = targetFolderId;
    onOpenFolder(targetFolderId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const targetFolderId = getValidDropFolderId(event);
    const dragData = event.active.data.current as DragData | undefined;

    lastBreadcrumbTargetRef.current = undefined;

    if (targetFolderId === undefined || !dragData) return;

    if (dragData.kind === "song") {
      const song = effectiveSongs.find((item) => Number(item.project_asset_id) === dragData.assetId);
      if (!song || (song.project_folder_id ?? null) === targetFolderId) return;
      moveSongToFolder(song, targetFolderId);
      return;
    }

    const folder = effectiveFolders.find((item) => item.id === dragData.folderId);
    if (!folder || (folder.parent_folder_id ?? null) === targetFolderId) return;
    moveFolderToFolder(folder, targetFolderId);
  }

  function handleDragCancel() {
    lastBreadcrumbTargetRef.current = undefined;
  }

  if (loading) {
    return (
      <div className="project-file-browser">
        <div className="project-file-browser-top">
          <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
          <div className="project-tab-skeleton project-skeleton-block" />
        </div>
        <div className="project-browser-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="project-folder-card skeleton-card">
              <div className="project-skeleton-block h-[58px] w-[82px] rounded-[10px]" />
              <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-empty">
        <h2>Couldn&apos;t load project folders</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="project-file-browser">
        <div className="project-file-browser-top">
          <div className="project-file-browser-title-wrap">
            <div className="project-breadcrumbs project-path">
              <BreadcrumbDropButton
                folderId={null}
                active={breadcrumbFolders.length === 0}
                onClick={() => onOpenFolder(null)}
              >
                All Files
              </BreadcrumbDropButton>
              {breadcrumbFolders.map((folder, index) => {
                const isCurrent = index === breadcrumbFolders.length - 1;

                return (
                  <span key={folder.id}>
                    <span className="project-path-separator">/</span>
                    <BreadcrumbDropButton
                      folderId={folder.id}
                      active={isCurrent}
                      onClick={() => onOpenFolder(folder.id)}
                    >
                      {folder.name}
                    </BreadcrumbDropButton>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="project-file-browser-actions">
            <button
              type="button"
              className="project-view-toggle-button"
              aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
              title={viewMode === "grid" ? "List view" : "Grid view"}
              onClick={() => onViewModeChange(nextViewMode)}
            >
              {viewMode === "grid" ? <ListViewIcon /> : <GridViewIcon />}
            </button>
            <button type="button" className="project-new-folder-button" onClick={onCreateFolder} aria-label="New folder" title="New folder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
        <div className="project-file-browser-section">
          {itemCount > 0 ? (
            <SortableContext
              items={sortableIds}
              strategy={viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
            >
              {viewMode === "grid" ? (
                <div className="project-browser-grid">
                  {visibleFolders.map((folder) => (
                    <SortableFolderItem key={`folder-${folder.id}`} folder={folder} viewMode={viewMode} onOpen={onOpenFolder} />
                  ))}
                  {visibleSongs.map((song) => (
                    <SortableSongItem key={`song-${song.project_asset_id ?? song.id}`} song={song} viewMode={viewMode} queueSongs={visibleSongs} onMove={onMoveSong} />
                  ))}
                </div>
              ) : (
                <div className="project-browser-list">
                  <div className="project-browser-list-head">
                    <span>Name</span>
                    <span>Info</span>
                    <span>Kind</span>
                    <span />
                  </div>
                  {visibleFolders.map((folder) => (
                    <SortableFolderItem key={`folder-${folder.id}`} folder={folder} viewMode={viewMode} onOpen={onOpenFolder} />
                  ))}
                  {visibleSongs.map((song) => (
                    <SortableSongItem key={`song-${song.project_asset_id ?? song.id}`} song={song} viewMode={viewMode} queueSongs={visibleSongs} onMove={onMoveSong} />
                  ))}
                </div>
              )}
            </SortableContext>
          ) : (
            <div className="project-file-empty-inline">No files in this folder yet.</div>
          )}
        </div>
      </div>
    </DndContext>
  );
}
