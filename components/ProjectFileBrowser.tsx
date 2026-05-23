"use client";

import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  type UniqueIdentifier,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import DropdownShell from "@/components/DropdownShell";
import ProjectFolderPickerModal from "@/components/ProjectFolderPickerModal";
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
  onOpenFolder: (folderId: number | null) => void;
  onMoveSong: (song: ProjectSong) => void;
  downloadSlot?: ReactNode;
};

type DragData =
  | { kind: "folder"; folderId: number }
  | { kind: "song"; assetId: number; songId: string };

type ContextMenuState =
  | {
      type: "folder";
      folder: ProjectFolder;
      point: { x: number; y: number };
    }
  | {
      type: "song";
      song: ProjectSong;
      point: { x: number; y: number };
    };

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

  if (id === BREADCRUMB_ROOT_DROP_ID) return null;
  if (id.startsWith("drop-folder:")) return Number(id.replace("drop-folder:", ""));
  if (id.startsWith("drop-breadcrumb:")) return Number(id.replace("drop-breadcrumb:", ""));

  return undefined;
}

function getActivatorPoint(event: unknown) {
  const maybeEvent = event as MouseEvent | TouchEvent | PointerEvent | undefined;

  if (!maybeEvent) return null;

  if ("touches" in maybeEvent && maybeEvent.touches?.[0]) {
    return { x: maybeEvent.touches[0].clientX, y: maybeEvent.touches[0].clientY };
  }

  if ("changedTouches" in maybeEvent && maybeEvent.changedTouches?.[0]) {
    return {
      x: maybeEvent.changedTouches[0].clientX,
      y: maybeEvent.changedTouches[0].clientY,
    };
  }

  if ("clientX" in maybeEvent && "clientY" in maybeEvent) {
    return { x: maybeEvent.clientX, y: maybeEvent.clientY };
  }

  return null;
}

function isDefaultMediaFolder(folder: ProjectFolder) {
  return folder.parent_folder_id == null && folder.asset_type != null;
}

function defaultMediaFolderHasItems(folder: ProjectFolder) {
  return (folder.asset_count ?? 0) > 0 || (folder.child_count ?? 0) > 0;
}

function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const snapListOverlayToCursor = ({
  activatorEvent,
  activeNodeRect,
  transform,
}: any) => {
  const point = getActivatorPoint(activatorEvent);

  if (!point || !activeNodeRect) return transform;

  const startOffsetX = point.x - activeNodeRect.left;
  const startOffsetY = point.y - activeNodeRect.top;

  return {
    ...transform,
    x: transform.x + startOffsetX - 10,
    y: transform.y + startOffsetY - 10,
  };
};

function DraggableFolderItem({
  folder,
  viewMode,
  onOpen,
  onContextMenu,
}: {
  folder: ProjectFolder;
  viewMode: ProjectFileView;
  onOpen: (folderId: number) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>, folder: ProjectFolder) => void;
}) {
  const draggable = useDraggable({
    id: getFolderDragId(folder.id),
    data: { kind: "folder", folderId: folder.id } satisfies DragData,
  });
  const droppable = useDroppable({
    id: getFolderDropId(folder.id),
    data: { kind: "folder-drop", folderId: folder.id },
  });

  return (
    <div
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      className={droppable.isOver ? "project-drag-over-folder" : ""}
      style={{ opacity: draggable.isDragging ? 0.35 : 1 }}
      {...draggable.attributes}
      {...draggable.listeners}
    >
      <ProjectFolderCard
        folder={folder}
        viewMode={viewMode}
        onOpen={onOpen}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}

function DraggableSongItem({
  song,
  viewMode,
  queueSongs,
  onContextMenu,
}: {
  song: ProjectSong;
  viewMode: ProjectFileView;
  queueSongs: ProjectSong[];
  onContextMenu: (event: MouseEvent<HTMLElement>, song: ProjectSong) => void;
}) {
  const draggable = useDraggable({
    id: getSongDragId(song),
    data: {
      kind: "song",
      assetId: Number(song.project_asset_id),
      songId: song.id,
    } satisfies DragData,
    disabled: !Number.isFinite(song.project_asset_id),
  });

  return (
    <div
      ref={draggable.setNodeRef}
      style={{ opacity: draggable.isDragging ? 0.35 : 1 }}
      {...draggable.attributes}
      {...draggable.listeners}
    >
      <ProjectSongFileCard
        song={song}
        viewMode={viewMode}
        queueSongs={queueSongs}
        onContextMenu={onContextMenu}
      />
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

function DragPreview({
  dragData,
  folder,
  song,
  viewMode,
}: {
  dragData: DragData | null;
  folder: ProjectFolder | null;
  song: ProjectSong | null;
  viewMode: ProjectFileView;
}) {
  if (!dragData) return null;

  const modeClass = viewMode === "list" ? "is-list-preview" : "is-grid-preview";

  if (dragData.kind === "folder" && folder) {
    return (
      <div className={`project-file-browser project-drag-preview ${modeClass}`}>
        <ProjectFolderCard folder={folder} viewMode="grid" onOpen={() => {}} />
      </div>
    );
  }

  if (dragData.kind === "song" && song) {
    return (
      <div
        className={`project-file-browser project-drag-preview project-drag-preview-song ${modeClass}`}
      >
        <ProjectSongFileCard song={song} viewMode="grid" queueSongs={[song]} />
      </div>
    );
  }

  return null;
}

export default function ProjectFileBrowser({
  folders,
  assets: _assets,
  songs,
  loading,
  error,
  activeFolderId,
  viewMode,
  onOpenFolder,
  onMoveSong,
  downloadSlot,
}: ProjectFileBrowserProps) {
  const [folderParentOverrides, setFolderParentOverrides] = useState<
    Map<number, number | null>
  >(() => new Map());
  const [folderNameOverrides, setFolderNameOverrides] = useState<Map<number, string>>(
    () => new Map(),
  );
  const [deletedFolderIds, setDeletedFolderIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [deletedAssetIds, setDeletedAssetIds] = useState<Set<number>>(() => new Set());
  const [songFolderOverrides, setSongFolderOverrides] = useState<
    Map<number, number | null>
  >(() => new Map());
  const [dragPreviewFolderId, setDragPreviewFolderId] = useState<
    number | null | undefined
  >(undefined);
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [activeDragViewMode, setActiveDragViewMode] =
    useState<ProjectFileView>(viewMode);
  const [movingFolder, setMovingFolder] = useState<ProjectFolder | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const lastBreadcrumbTargetRef = useRef<number | null | undefined>(undefined);
  const originalFolderTargetRef = useRef<number | null | undefined>(undefined);
  const originalSongTargetRef = useRef<number | null | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const effectiveFolders = useMemo(
    () =>
      folders
        .filter((folder) => !deletedFolderIds.has(folder.id))
        .map((folder) => ({
          ...folder,
          name: folderNameOverrides.get(folder.id) ?? folder.name,
          parent_folder_id: folderParentOverrides.has(folder.id)
            ? folderParentOverrides.get(folder.id) ?? null
            : folder.parent_folder_id,
        })),
    [folders, folderNameOverrides, folderParentOverrides, deletedFolderIds],
  );

  const effectiveSongs = useMemo(
    () =>
      songs
        .filter((song) => {
          const assetId = Number(song.project_asset_id);
          return !Number.isFinite(assetId) || !deletedAssetIds.has(assetId);
        })
        .map((song) => {
          const assetId = Number(song.project_asset_id);

          return Number.isFinite(assetId) && songFolderOverrides.has(assetId)
            ? { ...song, project_folder_id: songFolderOverrides.get(assetId) ?? null }
            : song;
        }),
    [songs, songFolderOverrides, deletedAssetIds],
  );

  const foldersById = useMemo(
    () => new Map(effectiveFolders.map((folder) => [folder.id, folder])),
    [effectiveFolders],
  );
  const visibleFolderId =
    dragPreviewFolderId !== undefined ? dragPreviewFolderId : activeFolderId;

  const breadcrumbFolders = useMemo(() => {
    if (activeFolderId == null) return [];
    const chain: ProjectFolder[] = [];
    const visited = new Set<number>();
    let current = foldersById.get(activeFolderId) ?? null;
    while (current && !visited.has(current.id)) {
      chain.unshift(current);
      visited.add(current.id);
      current =
        current.parent_folder_id == null
          ? null
          : foldersById.get(current.parent_folder_id) ?? null;
    }
    return chain;
  }, [activeFolderId, foldersById]);

  const visibleFolders = useMemo(
    () =>
      effectiveFolders.filter((folder) => {
        if (folder.parent_folder_id !== visibleFolderId) return false;
        if (visibleFolderId == null && isDefaultMediaFolder(folder)) {
          return defaultMediaFolderHasItems(folder);
        }
        return true;
      }),
    [effectiveFolders, visibleFolderId],
  );
  const visibleSongs = useMemo(
    () => effectiveSongs.filter((song) => (song.project_folder_id ?? null) === visibleFolderId),
    [effectiveSongs, visibleFolderId],
  );
  const itemCount = visibleFolders.length + visibleSongs.length;
  const draggedFolder =
    activeDragData?.kind === "folder"
      ? effectiveFolders.find((folder) => folder.id === activeDragData.folderId) ?? null
      : null;
  const draggedSong =
    activeDragData?.kind === "song"
      ? effectiveSongs.find(
          (song) => Number(song.project_asset_id) === activeDragData.assetId,
        ) ?? null
      : null;
  const overlayModifiers = activeDragViewMode === "list" ? [snapListOverlayToCursor] : undefined;

  function folderIsDescendant(targetFolderId: number, draggedFolderId: number) {
    let current = foldersById.get(targetFolderId) ?? null;
    const visited = new Set<number>();

    while (current && !visited.has(current.id)) {
      if (current.id === draggedFolderId) return true;
      visited.add(current.id);
      current =
        current.parent_folder_id == null
          ? null
          : foldersById.get(current.parent_folder_id) ?? null;
    }

    return false;
  }

  const folderMoveDestinations = useMemo(() => {
    if (!movingFolder) return effectiveFolders;

    return effectiveFolders.filter(
      (folder) => folder.id !== movingFolder.id && !folderIsDescendant(folder.id, movingFolder.id),
    );
  }, [effectiveFolders, foldersById, movingFolder]);

  function getDescendantFolderIds(folderId: number) {
    const ids = new Set<number>([folderId]);
    let changed = true;

    while (changed) {
      changed = false;
      effectiveFolders.forEach((folder) => {
        if (
          folder.parent_folder_id != null &&
          ids.has(folder.parent_folder_id) &&
          !ids.has(folder.id)
        ) {
          ids.add(folder.id);
          changed = true;
        }
      });
    }

    return ids;
  }

  function getSongsInFolderTree(folderId: number) {
    const folderIds = getDescendantFolderIds(folderId);
    return effectiveSongs.filter((song) => {
      const songFolderId = song.project_folder_id ?? null;
      return songFolderId != null && folderIds.has(songFolderId);
    });
  }

  function getValidDropFolderId(event: DragOverEvent | DragEndEvent) {
    const targetFolderId = parseDropFolderId(event.over?.id);

    if (targetFolderId === undefined) return undefined;

    const dragData = event.active.data.current as DragData | undefined;

    if (dragData?.kind === "folder") {
      if (targetFolderId === dragData.folderId) return undefined;
      if (targetFolderId !== null && folderIsDescendant(targetFolderId, dragData.folderId)) {
        return undefined;
      }
    }

    return targetFolderId;
  }

  function previewDragMove(dragData: DragData | undefined, folderId: number | null) {
    if (!dragData) return;

    if (dragData.kind === "song") {
      setSongFolderOverrides((current) => {
        const next = new Map(current);
        next.set(dragData.assetId, folderId);
        return next;
      });
      return;
    }

    setFolderParentOverrides((current) => {
      const next = new Map(current);
      next.set(dragData.folderId, folderId);
      return next;
    });
  }

  async function moveSongToFolder(song: ProjectSong, folderId: number | null) {
    const assetId = Number(song.project_asset_id);

    if (!Number.isFinite(assetId)) return;

    const previousFolderId = originalSongTargetRef.current ?? song.project_folder_id ?? null;

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
    const previousParentFolderId = originalFolderTargetRef.current ?? folder.parent_folder_id ?? null;

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

  async function renameFolder(folder: ProjectFolder) {
    setContextMenu(null);
    const nextName = window.prompt("Rename folder", folder.name)?.trim();

    if (!nextName || nextName === folder.name) return;

    const previousName = folder.name;

    setFolderNameOverrides((current) => {
      const next = new Map(current);
      next.set(folder.id, nextName);
      return next;
    });

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(String(folder.project_id))}/folders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folder.id, name: nextName }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || "Failed to rename folder");
    } catch (err) {
      setFolderNameOverrides((current) => {
        const next = new Map(current);
        next.set(folder.id, previousName);
        return next;
      });
      console.error(err);
    }
  }

  async function deleteFolder(folder: ProjectFolder) {
    setContextMenu(null);

    const folderIds = getDescendantFolderIds(folder.id);

    setDeletedFolderIds((current) => new Set([...current, ...folderIds]));

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(String(folder.project_id))}/folders`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folder.id }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || "Failed to delete folder");

      if (folderIds.has(activeFolderId ?? -1)) onOpenFolder(folder.parent_folder_id ?? null);
    } catch (err) {
      setDeletedFolderIds((current) => {
        const next = new Set(current);
        folderIds.forEach((id) => next.delete(id));
        return next;
      });
      console.error(err);
    }
  }

  async function removeSongFromProject(song: ProjectSong) {
    setContextMenu(null);
    const assetId = Number(song.project_asset_id);

    if (!Number.isFinite(assetId)) return;

    setDeletedAssetIds((current) => new Set([...current, assetId]));

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(String(song.project_id))}/assets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || "Failed to remove file from project");
    } catch (err) {
      setDeletedAssetIds((current) => {
        const next = new Set(current);
        next.delete(assetId);
        return next;
      });
      console.error(err);
    }
  }

  function downloadSong(song: ProjectSong) {
    setContextMenu(null);
    if (!song.audioUrl) return;
    downloadUrl(song.audioUrl, song.title || "filmwave-song");
  }

  function downloadFolder(folder: ProjectFolder) {
    setContextMenu(null);
    const songsToDownload = getSongsInFolderTree(folder.id).filter((song) => song.audioUrl);

    songsToDownload.forEach((song, index) => {
      window.setTimeout(() => downloadUrl(song.audioUrl, song.title || "filmwave-song"), index * 150);
    });
  }

  function openFolderContextMenu(event: MouseEvent<HTMLElement>, folder: ProjectFolder) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ type: "folder", folder, point: { x: event.clientX, y: event.clientY } });
  }

  function openSongContextMenu(event: MouseEvent<HTMLElement>, song: ProjectSong) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ type: "song", song, point: { x: event.clientX, y: event.clientY } });
  }

  function handleDragStart(event: DragStartEvent) {
    setContextMenu(null);
    const dragData = event.active.data.current as DragData | undefined;
    lastBreadcrumbTargetRef.current = undefined;
    setDragPreviewFolderId(undefined);
    setActiveDragData(dragData ?? null);
    setActiveDragViewMode(viewMode);

    if (dragData?.kind === "song") {
      const song = effectiveSongs.find((item) => Number(item.project_asset_id) === dragData.assetId);
      originalSongTargetRef.current = song?.project_folder_id ?? null;
      originalFolderTargetRef.current = undefined;
      return;
    }

    if (dragData?.kind === "folder") {
      const folder = effectiveFolders.find((item) => item.id === dragData.folderId);
      originalFolderTargetRef.current = folder?.parent_folder_id ?? null;
      originalSongTargetRef.current = undefined;
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const targetFolderId = getValidDropFolderId(event);
    const overId = event.over?.id == null ? "" : String(event.over.id);

    if (!overId.startsWith("drop-breadcrumb")) return;
    if (targetFolderId === undefined) return;
    if (lastBreadcrumbTargetRef.current === targetFolderId) return;

    const dragData = event.active.data.current as DragData | undefined;

    lastBreadcrumbTargetRef.current = targetFolderId;
    previewDragMove(dragData, targetFolderId);
    setDragPreviewFolderId(targetFolderId);
  }

  function cleanupDragState() {
    lastBreadcrumbTargetRef.current = undefined;
    originalSongTargetRef.current = undefined;
    originalFolderTargetRef.current = undefined;
    setDragPreviewFolderId(undefined);
    setActiveDragData(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const targetFolderId = getValidDropFolderId(event) ?? lastBreadcrumbTargetRef.current;
    const dragData = event.active.data.current as DragData | undefined;

    if (targetFolderId === undefined || !dragData) {
      cleanupDragState();
      return;
    }

    if (dragData.kind === "song") {
      const song = effectiveSongs.find((item) => Number(item.project_asset_id) === dragData.assetId);
      if (song) moveSongToFolder(song, targetFolderId);
      onOpenFolder(targetFolderId);
      cleanupDragState();
      return;
    }

    const folder = effectiveFolders.find((item) => item.id === dragData.folderId);
    if (folder) moveFolderToFolder(folder, targetFolderId);
    onOpenFolder(targetFolderId);
    cleanupDragState();
  }

  function handleDragCancel() {
    if (activeDragData?.kind === "song" && originalSongTargetRef.current !== undefined) {
      previewDragMove(activeDragData, originalSongTargetRef.current);
    }

    if (activeDragData?.kind === "folder" && originalFolderTargetRef.current !== undefined) {
      previewDragMove(activeDragData, originalFolderTargetRef.current);
    }

    cleanupDragState();
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
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="project-file-browser" onContextMenu={() => setContextMenu(null)}>
          <div className="project-file-browser-top">
            <div className="project-file-browser-title-wrap">
              <div className="project-breadcrumbs project-path">
                <BreadcrumbDropButton
                  folderId={null}
                  active={activeFolderId == null}
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
            {downloadSlot && <div className="project-file-browser-actions">{downloadSlot}</div>}
          </div>
          <div className="project-file-browser-section">
            {itemCount > 0 ? (
              viewMode === "grid" ? (
                <div className="project-browser-grid">
                  {visibleFolders.map((folder) => (
                    <DraggableFolderItem
                      key={`folder-${folder.id}`}
                      folder={folder}
                      viewMode={viewMode}
                      onOpen={onOpenFolder}
                      onContextMenu={openFolderContextMenu}
                    />
                  ))}
                  {visibleSongs.map((song) => (
                    <DraggableSongItem
                      key={`song-${song.project_asset_id ?? song.id}`}
                      song={song}
                      viewMode={viewMode}
                      queueSongs={visibleSongs}
                      onContextMenu={openSongContextMenu}
                    />
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
                    <DraggableFolderItem
                      key={`folder-${folder.id}`}
                      folder={folder}
                      viewMode={viewMode}
                      onOpen={onOpenFolder}
                      onContextMenu={openFolderContextMenu}
                    />
                  ))}
                  {visibleSongs.map((song) => (
                    <DraggableSongItem
                      key={`song-${song.project_asset_id ?? song.id}`}
                      song={song}
                      viewMode={viewMode}
                      queueSongs={visibleSongs}
                      onContextMenu={openSongContextMenu}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="project-file-empty-inline">No files in this folder yet.</div>
            )}
          </div>
        </div>
        <DragOverlay dropAnimation={null} modifiers={overlayModifiers}>
          <DragPreview
            dragData={activeDragData}
            folder={draggedFolder}
            song={draggedSong}
            viewMode={activeDragViewMode}
          />
        </DragOverlay>
      </DndContext>

      <DropdownShell
        open={!!contextMenu}
        onOpenChange={(open) => {
          if (!open) setContextMenu(null);
        }}
        placement="bottom-start"
        className="project-context-menu"
        anchorPoint={contextMenu?.point ?? null}
        collisionPadding={{ top: 72, right: 16, bottom: 88, left: 16 }}
        offsetAmount={4}
        trigger={() => <span className="project-context-menu-anchor" aria-hidden="true" />}
      >
        {contextMenu?.type === "folder" ? (
          <>
            <button type="button" onClick={() => renameFolder(contextMenu.folder)}>
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setMovingFolder(contextMenu.folder);
                setContextMenu(null);
              }}
            >
              Move
            </button>
            <button type="button" onClick={() => downloadFolder(contextMenu.folder)}>
              Download
            </button>
            <button
              type="button"
              className="danger-hover"
              onClick={() => deleteFolder(contextMenu.folder)}
            >
              Delete
            </button>
          </>
        ) : contextMenu?.type === "song" ? (
          <>
            <button
              type="button"
              onClick={() => {
                onMoveSong(contextMenu.song);
                setContextMenu(null);
              }}
            >
              Move
            </button>
            <button type="button" onClick={() => downloadSong(contextMenu.song)}>
              Download
            </button>
            <button
              type="button"
              className="danger-hover"
              onClick={() => removeSongFromProject(contextMenu.song)}
            >
              Remove from Project
            </button>
          </>
        ) : null}
      </DropdownShell>

      <ProjectFolderPickerModal
        isOpen={!!movingFolder}
        folders={folderMoveDestinations}
        initialFolderId={movingFolder?.parent_folder_id ?? null}
        title={movingFolder ? `Move ${movingFolder.name}` : "Move Folder"}
        confirmLabel="Move Here"
        onClose={() => setMovingFolder(null)}
        onConfirm={(folderId) => {
          if (!movingFolder) return;
          moveFolderToFolder(movingFolder, folderId);
          setMovingFolder(null);
          onOpenFolder(folderId);
        }}
      />
    </>
  );
}
