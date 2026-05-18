"use client";

import type { Playlist } from "@/lib/types";
import Link from "next/link";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import EditPlaylistModal from "@/components/EditPlaylistModal";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import Toast from "@/components/Toast";
import DropdownShell from "@/components/DropdownShell";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import GridViewIcon from "@/components/icons/GridViewIcon";
import ListViewIcon from "@/components/icons/ListViewIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import SortIcon from "@/components/icons/SortIcon";
import {
  iconButtonActiveClass,
  smallIconButtonClass,
} from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";
import {
  useUserPreferences,
  type PlaylistViewMode,
} from "@/context/UserPreferencesContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const GRADIENTS = [
  "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)",
  "linear-gradient(135deg,#1f3d3a 0%,#111111 52%,#4d8c7b 100%)",
  "linear-gradient(135deg,#4f3529 0%,#111111 50%,#b66c45 100%)",
  "linear-gradient(135deg,#25364f 0%,#111111 52%,#6287c4 100%)",
  "linear-gradient(135deg,#45233d 0%,#111111 52%,#b75d91 100%)",
  "linear-gradient(135deg,#0f172a 0%,#111111 52%,#1e3a5f 100%)",
  "linear-gradient(135deg,#003344 0%,#111111 52%,#00516b 100%)",
  "linear-gradient(135deg,#3d2800 0%,#111111 52%,#6b4500 100%)",
  "linear-gradient(135deg,#1a0a2e 0%,#111111 52%,#2d1554 100%)",
  "linear-gradient(135deg,#0a2e0a 0%,#111111 52%,#145214 100%)",
];

const PLAYLIST_SKELETON_VIEW_MODE_KEY = "filmwave-playlist-skeleton-view-mode";

type PlaylistStats = {
  songCount: number;
  topGenres: string[];
};

function getPlaylistCover(playlist: Playlist) {
  return typeof playlist.cover_image_url === "string" &&
    playlist.cover_image_url.trim()
    ? playlist.cover_image_url
    : null;
}

function formatSongCount(count: number) {
  return `${count} track${count === 1 ? "" : "s"}`;
}

function formatGenres(genres: string[]) {
  return genres.length > 0 ? genres.join(" · ") : "No genres yet";
}

function ReorderHandleIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden>
      <circle cx="2" cy="2.5" r="1" fill="currentColor" />
      <circle cx="8" cy="2.5" r="1" fill="currentColor" />
      <circle cx="2" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="2" cy="13.5" r="1" fill="currentColor" />
      <circle cx="8" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

function PlaylistArtwork({
  playlist,
  index,
  className,
}: {
  playlist: Playlist;
  index: number;
  className: string;
}) {
  const cover = getPlaylistCover(playlist);

  return (
    <div
      className={className}
      style={{
        background: cover
          ? "var(--media-overlay-solid)"
          : GRADIENTS[index % GRADIENTS.length],
      }}
    >
      {cover && <img src={cover} alt={playlist.name} />}
    </div>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`playlist-skeleton-block ${className}`} />;
}

function SkeletonLibrary({ viewMode }: { viewMode: PlaylistViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="playlist-skeleton-list">
        {Array.from({ length: 18 }, (_, index) => (
          <div key={index} className="playlist-skeleton-index-row">
            <SkeletonBlock className="playlist-skeleton-number" />
            <SkeletonBlock className="playlist-skeleton-row-cover" />

            <div className="playlist-skeleton-row-copy">
              <SkeletonBlock className="playlist-skeleton-row-title" />
              <SkeletonBlock className="playlist-skeleton-row-meta" />
            </div>

            <SkeletonBlock className="playlist-skeleton-row-count" />
            <SkeletonBlock className="playlist-skeleton-row-menu" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="playlist-skeleton-grid">
      {Array.from({ length: 18 }, (_, index) => (
        <div key={index} className="playlist-skeleton-gallery-card">
          <div className="playlist-skeleton-gallery-art">
            <div className="playlist-skeleton-gallery-arrow" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CreatePlaylistTile({
  viewMode,
  onClick,
}: {
  viewMode: PlaylistViewMode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        viewMode === "grid"
          ? "playlist-create-card"
          : "playlist-create-row playlist-index-row"
      }
      onClick={onClick}
    >
      <div className="playlist-create-mark">
        <PlusIcon size={16} />
      </div>

      <div className="playlist-create-copy">
        <span>Create Playlist</span>
        <small>Build a new collection</small>
      </div>
    </button>
  );
}

function PlaylistMenu({
  playlist,
  open,
  onOpenChange,
  onEdit,
  onReorder,
  onDelete,
  playerVisible,
  viewMode,
}: {
  playlist: Playlist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onReorder: () => void;
  onDelete: () => void;
  playerVisible: boolean;
  viewMode: PlaylistViewMode;
}) {
  return (
    <div data-playlist-menu className="playlist-card-menu-wrap">
      <DropdownShell
        open={open}
        onOpenChange={onOpenChange}
        placement="bottom-start"
        className="playlist-dropdown"
        strategy="fixed"
        usePortal
        offsetAmount={5}
        flippedOffsetAmount={5}
        crossAxisOffset={0}
        collisionPadding={{
          top: 68,
          right: 16,
          bottom: playerVisible ? 85 : 13,
          left: 16,
        }}
        trigger={({ open }) => (
          <button
            type="button"
            className={
              viewMode === "grid"
                ? `playlist-menu-btn playlist-menu-btn-grid ${
                    open ? "is-open" : ""
                  }`
                : `playlist-menu-btn ${smallIconButtonClass} ${
                    open ? `is-open ${iconButtonActiveClass}` : ""
                  }`
            }
            aria-label={`${playlist.name} options`}
          >
            <MoreIcon />
          </button>
        )}
      >
        <button type="button" onClick={onEdit}>
          Edit Details
        </button>

        <button type="button" onClick={onReorder}>
          Reorder
        </button>

        <button type="button" className="danger-hover" onClick={onDelete}>
          Delete
        </button>
      </DropdownShell>
    </div>
  );
}

function SortablePlaylistItem({
  playlist,
  index,
  isEditing,
  isDeleting,
  openMenuId,
  setOpenMenuId,
  startReorder,
  openEdit,
  handleDeletePlaylist,
  playerVisible,
  viewMode,
  playlistStats,
}: {
  playlist: Playlist;
  index: number;
  isEditing: boolean;
  isDeleting: boolean;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  startReorder: () => void;
  openEdit: (p: Playlist) => void;
  handleDeletePlaylist: (p: Playlist) => void;
  playerVisible: boolean;
  viewMode: PlaylistViewMode;
  playlistStats: Record<number, PlaylistStats>;
}) {
  const stats = playlistStats[playlist.id];
  const cover = getPlaylistCover(playlist);
  const playlistHref = `/playlists/${playlist.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: playlist.id,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: isEditing ? "grab" : "pointer",
  };

  if (viewMode === "list") {
    if (isEditing) {
      return (
        <div
          ref={setNodeRef}
          className="playlist-index-row is-reordering"
          style={style}
          {...attributes}
          {...listeners}
        >
          <div className="playlist-row-handle">
            <ReorderHandleIcon />
          </div>

          <div className="playlist-row-number">
            {String(index + 1).padStart(2, "0")}
          </div>

          <PlaylistArtwork
            playlist={playlist}
            index={index}
            className="playlist-row-cover"
          />

          <div className="playlist-row-main">
            <span>{playlist.name}</span>
            <small>{formatGenres(stats?.topGenres ?? [])}</small>
          </div>

          <div className="playlist-row-count">
            {formatSongCount(stats?.songCount ?? 0)}
          </div>
        </div>
      );
    }

    return (
      <div ref={setNodeRef} className="playlist-index-row-shell" style={style}>
        <Link href={playlistHref} className="playlist-index-row">
          <div className="playlist-row-number">
            {String(index + 1).padStart(2, "0")}
          </div>

          <PlaylistArtwork
            playlist={playlist}
            index={index}
            className="playlist-row-cover"
          />

          <div className="playlist-row-main">
            <span>{playlist.name}</span>
            <small>{formatGenres(stats?.topGenres ?? [])}</small>
          </div>

          <div className="playlist-row-count">
            {formatSongCount(stats?.songCount ?? 0)}
          </div>
        </Link>

        {isDeleting && (
          <div className="playlist-deleting-overlay">
            <LoadingSpinner
              size={24}
              stroke={7}
              color="var(--media-overlay-contrast)"
            />
          </div>
        )}

        <PlaylistMenu
          playlist={playlist}
          viewMode={viewMode}
          open={openMenuId === playlist.id}
          onOpenChange={(nextOpen) => {
            setOpenMenuId(nextOpen ? playlist.id : null);
          }}
          onEdit={() => openEdit(playlist)}
          onReorder={() => {
            setOpenMenuId(null);
            startReorder();
          }}
          onDelete={() => handleDeletePlaylist(playlist)}
          playerVisible={playerVisible}
        />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        className="playlist-gallery-card is-reordering"
        style={style}
        {...attributes}
        {...listeners}
      >
        <div className="playlist-gallery-art-wrap">
          <PlaylistArtwork
            playlist={playlist}
            index={index}
            className="playlist-gallery-art"
          />

          {!cover && (
            <div className="playlist-gallery-letters">
              {playlist.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="playlist-gallery-top-row">
            <div className="playlist-gallery-handle">
              <ReorderHandleIcon />
            </div>
          </div>

          <div className="playlist-gallery-content">
            <h3>{playlist.name}</h3>

            <p>{formatSongCount(stats?.songCount ?? 0)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`playlist-gallery-card ${
        openMenuId === playlist.id ? "is-menu-open" : ""
      }`}
      style={style}
    >
      <Link href={playlistHref} className="playlist-gallery-link">
        <div className="playlist-gallery-art-wrap">
          <PlaylistArtwork
            playlist={playlist}
            index={index}
            className="playlist-gallery-art"
          />

          {!cover && (
            <div className="playlist-gallery-letters">
              {playlist.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="playlist-gallery-top-row">
            <div className="playlist-gallery-arrow">
              <ArrowUpRightIcon />
            </div>
          </div>

          <div className="playlist-gallery-content">
            <h3>{playlist.name}</h3>

            <p>{formatSongCount(stats?.songCount ?? 0)}</p>
          </div>
        </div>
      </Link>

      {isDeleting && (
        <div className="playlist-deleting-overlay">
          <LoadingSpinner
            size={24}
            stroke={7}
            color="var(--media-overlay-contrast)"
          />
        </div>
      )}

      <PlaylistMenu
        playlist={playlist}
        viewMode={viewMode}
        open={openMenuId === playlist.id}
        onOpenChange={(nextOpen) => {
          setOpenMenuId(nextOpen ? playlist.id : null);
        }}
        onEdit={() => openEdit(playlist)}
        onReorder={() => {
          setOpenMenuId(null);
          startReorder();
        }}
        onDelete={() => handleDeletePlaylist(playlist)}
        playerVisible={playerVisible}
      />
    </div>
  );
}

function DragPreview({
  playlist,
  index,
  viewMode,
  stats,
}: {
  playlist: Playlist;
  index: number;
  viewMode: PlaylistViewMode;
  stats?: PlaylistStats;
}) {
  if (viewMode === "list") {
    return (
      <div className="playlist-index-row is-reordering drag-preview-row">
        <div className="playlist-row-handle">
          <ReorderHandleIcon />
        </div>

        <div className="playlist-row-number">
          {String(index + 1).padStart(2, "0")}
        </div>

        <PlaylistArtwork
          playlist={playlist}
          index={index}
          className="playlist-row-cover"
        />

        <div className="playlist-row-main">
          <span>{playlist.name}</span>
          <small>{formatGenres(stats?.topGenres ?? [])}</small>
        </div>

        <div className="playlist-row-count">
          {formatSongCount(stats?.songCount ?? 0)}
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-gallery-card drag-preview-card">
      <div className="playlist-gallery-art-wrap">
        <PlaylistArtwork
          playlist={playlist}
          index={index}
          className="playlist-gallery-art"
        />

        <div className="playlist-gallery-content">
          <div className="playlist-gallery-kicker">
            {formatGenres(stats?.topGenres ?? [])}
          </div>

          <h3>{playlist.name}</h3>

          <p>{formatSongCount(stats?.songCount ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}

export default function PlaylistsPage() {
  const { user } = useUser();
  const { currentSong } = usePlayer();

  const {
    playlistViewMode: viewMode,
    setPlaylistViewMode: setViewMode,
    playlistSortMode: sortMode,
    setPlaylistSortMode: setSortMode,
    preferencesLoaded,
  } = useUserPreferences();

  const {
    playlists,
    setPlaylists,
    loading,
    error: playlistsError,
    refetchPlaylists,
  } = usePlaylists();

  const playerVisible = !!currentSong;

  const [playlistStats, setPlaylistStats] = useState<
    Record<number, PlaylistStats>
  >({});
  const [reorderSnapshot, setReorderSnapshot] = useState<Playlist[] | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<number | null>(
    null,
  );
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [openSortMenu, setOpenSortMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);
  const [skeletonViewMode, setSkeletonViewMode] =
    useState<PlaylistViewMode>("grid");
  const [skeletonViewModeLoaded, setSkeletonViewModeLoaded] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const displayedPlaylists = useMemo(() => {
    if (sortMode === "alphabetical") {
      return [...playlists].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    }

    return playlists;
  }, [playlists, sortMode]);

  const playlistIdsKey = useMemo(
    () => playlists.map((playlist) => playlist.id).join(","),
    [playlists],
  );

  const totalSongs = useMemo(() => {
    return Object.values(playlistStats).reduce(
      (total, stats) => total + stats.songCount,
      0,
    );
  }, [playlistStats]);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();

    Object.values(playlistStats).forEach((stats) => {
      stats.topGenres.forEach((genre) => genres.add(genre));
    });

    return [...genres].slice(0, 4);
  }, [playlistStats]);

  useEffect(() => {
    const savedViewMode = window.localStorage.getItem(
      PLAYLIST_SKELETON_VIEW_MODE_KEY,
    );

    if (savedViewMode === "grid" || savedViewMode === "list") {
      setSkeletonViewMode(savedViewMode);
    }

    setSkeletonViewModeLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;

    setSkeletonViewMode(viewMode);
    setSkeletonViewModeLoaded(true);
    localStorage.setItem(PLAYLIST_SKELETON_VIEW_MODE_KEY, viewMode);
  }, [preferencesLoaded, viewMode]);

  useEffect(() => {
    if (!playlists.length) {
      setPlaylistStats({});
      return;
    }

    let cancelled = false;

    async function loadPlaylistStats() {
      try {
        const res = await fetch("/api/playlists/stats", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setPlaylistStats({});
          return;
        }

        const data = await res.json();

        if (!cancelled) {
          setPlaylistStats(data?.stats ?? {});
        }
      } catch {
        if (!cancelled) {
          setPlaylistStats({});
        }
      }
    }

    loadPlaylistStats();

    return () => {
      cancelled = true;
    };
  }, [playlistIdsKey, playlists.length]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  };

  const startReorder = () => {
    setOpenMenuId(null);
    setOpenSortMenu(false);
    setSortMode("custom");
    setReorderSnapshot(playlists);
    setIsEditing(true);
  };

  const handleCancelReorder = () => {
    if (reorderSnapshot) {
      setPlaylists(reorderSnapshot);
    }

    setActiveId(null);
    setOpenMenuId(null);
    setOpenSortMenu(false);
    setReorderSnapshot(null);
    setIsEditing(false);
    showToast("Reorder cancelled");
  };

  const handleSaveReorder = async () => {
    const reordered = playlists.map((playlist, index) => ({
      ...playlist,
      position: index,
    }));

    setPlaylists(reordered);

    try {
      const res = await fetch("/api/playlists/reorder", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlists: reordered.map((p) => ({
            id: p.id,
            position: p.position,
          })),
        }),
      });

      if (!res.ok) {
        console.error("Failed to save playlist order:", res.statusText);
        return;
      }

      setOpenMenuId(null);
      setOpenSortMenu(false);
      setReorderSnapshot(null);
      setIsEditing(false);
      showToast("Order saved");
    } catch (err) {
      console.error("Failed to save playlist order:", err);
    }
  };

  const openEdit = (playlist: Playlist) => {
    setOpenMenuId(null);
    setOpenSortMenu(false);
    setEditingPlaylist(playlist);
    setEditName(playlist.name);
    setEditCoverPreview(playlist.cover_image_url ?? null);
  };

  const handleSaveEdit = async () => {
    if (!editingPlaylist || isSavingPlaylist) return;

    setIsSavingPlaylist(true);

    try {
      const res = await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          cover_image_url: editCoverPreview,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error("Failed to save playlist:", data || res.statusText);
        return;
      }

      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === editingPlaylist.id
            ? data || {
                ...p,
                name: editName,
                cover_image_url: editCoverPreview,
              }
            : p,
        ),
      );

      showToast("Changes saved");
      setEditingPlaylist(null);
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPlaylist || deletingPlaylistId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${editingPlaylist.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    const playlistId = editingPlaylist.id;

    setEditingPlaylist(null);
    setDeletingPlaylistId(playlistId);

    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
        showToast("Playlist deleted");
      }
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (deletingPlaylistId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${playlist.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setOpenMenuId(null);
    setOpenSortMenu(false);
    setDeletingPlaylistId(playlist.id);

    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
        showToast("Playlist deleted");
      }
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user || isCreatingPlaylist) return;

    setIsCreatingPlaylist(true);

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
          cover_image_url: newCoverPreview,
          position: playlists.length,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error("Failed to create playlist:", data || res.statusText);
        return;
      }

      if (data) {
        setPlaylists((prev) => [...prev, data]);
        showToast("Playlist created");
      }

      setNewName("");
      setNewCoverPreview(null);
      setShowNewModal(false);
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = playlists.findIndex((p) => p.id === active.id);
    const newIndex = playlists.findIndex((p) => p.id === over.id);

    const reordered = arrayMove(playlists, oldIndex, newIndex).map((p, i) => ({
      ...p,
      position: i,
    }));

    setPlaylists(reordered);
  };

  const activePlaylist = playlists.find((p) => p.id === activeId);
  const activeIndex = playlists.findIndex((p) => p.id === activeId);
  const showSkeleton = loading || !preferencesLoaded;
  const resolvedSkeletonViewMode = preferencesLoaded
    ? viewMode
    : skeletonViewMode;

  return (
    <>
      <style>{`
        .playlists-page {
          position: relative;
          margin-left: var(--sidebar-width);
          margin-top: 56px;
          min-height: calc(100vh - 56px);
          overflow-x: hidden;
          overflow-y: visible;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: margin-left 0.2s ease;
        }

        .playlists-shell {
          position: relative;
          z-index: 1;
          padding: 0 32px;
        }

        .playlists-hero {
          display: block;
          padding: 88px 0 0;
        }

        .playlists-kicker {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .playlists-title {
          margin-top: 8px;
          max-width: 640px;
          font-family: var(--font-instrument-sans);
          font-size: 56px;
          font-weight: 500;
          line-height: 0.94;
          letter-spacing: -0.055em;
          color: var(--text-primary);
        }

        .playlists-meta {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .playlists-dot {
          color: var(--text-muted);
        }

        .playlists-control-bar {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: -34px;
          margin-bottom: 32px;
        }

        .playlists-control-left {
          display: none;
        }

        .playlists-control-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .playlists-control-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .playlist-action-btn {
          display: none;
        }

        .playlist-icon-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--icon-color);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .playlist-icon-btn:hover,
        .playlist-icon-btn.is-open {
          background: var(--icon-button-hover);
          border-color: var(--text-muted);
          color: var(--text-primary);
        }

        .playlist-edit-banner {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 16px;
          margin-bottom: 24px;
          padding: 0 16px;
          border: 1px dashed var(--border);
          border-radius: 16px;
          background: var(--bg-secondary);
        }

        .playlist-edit-banner span {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .playlist-edit-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .playlist-edit-actions button {
          height: 30px;
          border-radius: 999px;
          padding: 0 15px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease, background 0.15s ease;
        }

        .playlist-edit-cancel {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .playlist-edit-cancel:hover {
          background: var(--bg-hover);
        }

        .playlist-edit-save {
          background: var(--text-primary);
          color: var(--bg-primary);
        }

        .playlist-edit-save:hover {
          opacity: 0.82;
        }

        .playlist-library {
          padding-top: 0;
        }

        .playlist-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

        .playlist-gallery-card {
          position: relative;
          min-width: 0;
          cursor: pointer;
        }

        .playlist-gallery-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .playlist-gallery-art-wrap {
  position: relative;
  min-height: 210px;
  border-radius: 18px;
  overflow: hidden;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  transition: none;
}

        .playlist-gallery-card:hover .playlist-gallery-art-wrap,
.playlist-gallery-card.is-menu-open .playlist-gallery-art-wrap {
  border-color: var(--border);
}

        .playlist-gallery-art {
          position: absolute;
          inset: 0;
        }

        .playlist-gallery-art::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.18) 58%, transparent);
          pointer-events: none;
        }

        .playlist-gallery-art img,
        .playlist-row-cover img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .playlist-gallery-letters {
          position: absolute;
          left: 18px;
          bottom: 18px;
          z-index: 1;
          font-family: var(--font-instrument-sans);
          font-size: 44px;
          font-weight: 500;
          line-height: 0.9;
          letter-spacing: -0.07em;
          color: rgba(255, 255, 255, 0.12);
          pointer-events: none;
        }

        .playlist-gallery-top-row {
          position: relative;
          z-index: 4;
          display: flex;
          justify-content: flex-end;
          padding: 16px;
        }

        .playlist-gallery-arrow {
          display: flex;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: white;
          backdrop-filter: blur(12px);
          transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }

        .playlist-gallery-card:hover .playlist-gallery-arrow,
        .playlist-gallery-card.is-menu-open .playlist-gallery-arrow {
          background: white;
          color: black;
        }

        .playlist-gallery-content {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 16px;
          z-index: 4;
        }

        .playlist-gallery-kicker {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.52);
        }

        .playlist-gallery-content h3 {
          margin-top: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--font-instrument-sans);
          font-size: 25px;
          font-weight: 500;
          line-height: 0.95;
          letter-spacing: -0.055em;
          color: white;
        }

        .playlist-gallery-content p {
          margin-top: 12px;
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.58);
        }

        .playlist-gallery-handle {
          display: flex;
          width: 32px;
          height: 32px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(12px);
        }

        .playlist-gallery-card.is-reordering .playlist-gallery-art-wrap {
          border-style: dashed;
        }

        .playlist-index {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .playlist-index-row-shell {
          position: relative;
          cursor: pointer;
        }

        .playlist-index-row {
          position: relative;
          min-height: 76px;
          display: grid;
          grid-template-columns: 40px 50px minmax(0, 1fr) minmax(84px, 120px);
          gap: 14px;
          align-items: center;
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          background: var(--bg-card);
          padding: 11px 50px 11px 13px;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease;
        }

        .playlist-index-row.is-reordering {
          grid-template-columns: 16px 40px 50px minmax(0, 1fr) minmax(84px, 120px);
          padding-right: 18px;
        }

        .playlist-index-row:hover,
        .playlist-index-row-shell:hover .playlist-index-row {
          background: var(--bg-hover);
          border-color: var(--border);
          transform: translateY(-1px);
        }

        .playlist-row-handle {
          width: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .playlist-row-number {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .playlist-row-cover {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 10px;
          overflow: hidden;
          background: var(--bg-secondary);
        }

        .playlist-row-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .playlist-row-main span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .playlist-row-main small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          color: var(--text-muted);
        }

        .playlist-row-count {
          text-align: right;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .playlist-card-menu-wrap {
          position: absolute;
          z-index: 12;
          top: 16px;
          left: 16px;
        }

        .playlist-index-row-shell .playlist-card-menu-wrap {
          top: 50%;
          left: auto;
          right: 12px;
          transform: translateY(-50%);
        }

        .playlist-menu-btn {
          opacity: 0;
          transition:
            opacity 0.15s ease,
            background-color 0.15s ease,
            color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .playlist-menu-btn-grid {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background-color: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.72);
          cursor: pointer;
          backdrop-filter: blur(12px);
        }

        .playlist-gallery-card:hover .playlist-menu-btn-grid,
        .playlist-menu-btn-grid.is-open {
          opacity: 1;
        }

        .playlist-gallery-card:hover .playlist-menu-btn-grid:not(:hover):not(.is-open) {
          background-color: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.72);
          box-shadow: none;
        }

        .playlist-gallery-card [data-playlist-menu] .playlist-menu-btn-grid:hover,
        .playlist-gallery-card [data-playlist-menu] .playlist-menu-btn-grid.is-open {
          background-color: white;
          color: black;
        }

        .playlist-index-row-shell .playlist-menu-btn {
          background: transparent;
          color: var(--icon-color);
          backdrop-filter: none;
        }

        .playlist-index-row-shell:hover .playlist-menu-btn,
        .playlist-index-row-shell .playlist-menu-btn.is-open {
          opacity: 1;
        }

        .playlist-index-row-shell .playlist-menu-btn:hover,
        .playlist-index-row-shell .playlist-menu-btn.is-open {
          background: var(--icon-button-hover);
          color: var(--text-primary);
        }

        .playlist-dropdown,
        .playlist-sort-dropdown {
          z-index: 25;
          width: 146px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: var(--shadow-ui);
          backdrop-filter: blur(12px);
        }

        .playlist-dropdown button,
        .playlist-sort-dropdown button {
          display: block;
          width: 100%;
          padding: 9px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.1s, color 0.1s;
        }

        .playlist-dropdown button:hover,
        .playlist-sort-dropdown button:hover,
        .playlist-sort-dropdown button.is-active,
        .playlist-sort-dropdown button.is-active:hover {
          background: var(--bg-hover-strong);
          color: var(--text-primary);
        }

        .playlist-dropdown .danger-action {
          color: var(--danger);
        }

        .playlist-dropdown .danger-action:hover {
          color: var(--danger);
        }

        .playlist-create-card {
          position: relative;
          min-height: 210px;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 12px;
          border-radius: 18px;
          border: 1px dashed var(--border);
          background: var(--bg-card);
          padding: 16px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .playlist-create-card:hover {
          border-color: var(--border-hover);
          background: var(--bg-hover);
        }

        .playlist-create-row {
          grid-template-columns: 34px minmax(0, 1fr) 34px;
          padding: 11px 46px 11px 18px;
          border: 1px dashed var(--border);
          background: var(--bg-card);
        }

        .playlist-create-row .playlist-create-mark {
          width: 34px;
          height: 34px;
          grid-column: 1;
        }

        .playlist-create-row .playlist-create-copy {
          grid-column: 2;
          align-items: center;
          text-align: center;
        }

        .playlist-create-row:hover {
          border-color: var(--border-hover);
          background: var(--bg-hover);
          transform: translateY(-1px);
        }

        .playlist-create-mark {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          color: var(--text-primary);
          transition: background 0.15s ease;
        }

        .playlist-create-card:hover .playlist-create-mark,
        .playlist-create-row:hover .playlist-create-mark {
          background: var(--bg-hover-strong);
        }

        .playlist-create-copy {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .playlist-create-copy span {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .playlist-create-copy small {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .playlist-deleting-overlay {
          position: absolute;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: inherit;
          background: var(--media-overlay-strong);
          pointer-events: none;
        }

        .drag-preview-card {
  width: 320px;
  overflow: hidden;
  border-radius: 18px;
  transform: scale(1.04);
  box-shadow: 0 24px 80px var(--media-overlay-heavy);
}

.drag-preview-card .playlist-gallery-art-wrap {
  overflow: hidden;
  border-radius: 18px;
}

        .drag-preview-row {
          width: calc(100vw - var(--sidebar-width) - 64px);
          box-shadow: 0 24px 80px var(--media-overlay-heavy);
        }

        .playlist-skeleton-reserve {
          min-height: 280px;
        }

        .playlist-skeleton-block {
          position: relative;
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .playlist-skeleton-block::after {
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
          animation: playlist-skeleton-shimmer 1.6s ease-in-out infinite;
        }

        @keyframes playlist-skeleton-shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .playlist-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

        .playlist-skeleton-gallery-card {
          min-width: 0;
          animation: skeleton-fade-in 0.3s ease-out both;
        }

        .playlist-skeleton-gallery-art {
          position: relative;
          min-height: 210px;
          border-radius: 18px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-card);
          overflow: hidden;
        }

        .playlist-skeleton-gallery-art::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--bg-hover) 48%, transparent),
            transparent
          );
          animation: playlist-skeleton-shimmer 1.6s ease-in-out infinite;
        }

        .playlist-skeleton-gallery-arrow {
          position: absolute;
          right: 16px;
          top: 16px;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: var(--bg-tertiary);
        }

        .playlist-skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .playlist-skeleton-index-row {
          position: relative;
          min-height: 76px;
          display: grid;
          grid-template-columns: 40px 50px minmax(0, 1fr) minmax(84px, 120px) 28px;
          gap: 14px;
          align-items: center;
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          background: transparent;
          padding: 11px 13px;
          animation: skeleton-fade-in 0.3s ease-out both;
        }

        .playlist-skeleton-number {
          width: 22px;
          height: 8px;
        }

        .playlist-skeleton-row-cover {
          width: 50px;
          height: 50px;
          border-radius: 10px;
        }

        .playlist-skeleton-row-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 9px;
        }

        .playlist-skeleton-row-title {
          width: min(220px, 58%);
          height: 9px;
        }

        .playlist-skeleton-row-meta {
          width: min(300px, 42%);
          height: 8px;
        }

        .playlist-skeleton-row-count {
          justify-self: end;
          width: 58px;
          height: 8px;
        }

        .playlist-skeleton-row-menu {
          justify-self: end;
          width: 28px;
          height: 28px;
        }

        @media (max-width: 980px) {
          .playlists-control-bar {
            margin-top: -34px;
          }
        }

        @media (max-width: 720px) {
          .playlists-hero {
            padding-top: 88px;
          }

          .playlists-control-bar {
            margin-top: -34px;
            margin-bottom: 32px;
          }

          .playlist-gallery,
.playlist-skeleton-grid {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

          .playlist-gallery-art-wrap,
          .playlist-create-card,
          .playlist-skeleton-gallery-art {
            min-height: 188px;
          }

          .playlist-gallery-content h3 {
            font-size: 23px;
          }

          .drag-preview-row {
            width: calc(100vw - var(--sidebar-width) - 36px);
          }
        }

        @media (max-width: 520px) {
          .playlist-index-row {
            grid-template-columns: 18px 50px minmax(0, 1fr) minmax(70px, 96px);
            gap: 12px;
            padding: 11px 46px 11px 13px;
          }

          .playlist-index-row.is-reordering {
            grid-template-columns: 16px 34px 50px minmax(0, 1fr) minmax(70px, 96px);
            gap: 12px;
            padding-right: 18px;
          }

          .playlist-create-row {
            grid-template-columns: 50px minmax(0, 1fr) 50px;
            padding: 11px 18px;
          }

          .playlist-create-row .playlist-create-mark {
            grid-column: 1;
          }

          .playlist-create-row .playlist-create-copy {
            grid-column: 2;
            align-items: center;
            text-align: center;
          }

          .playlist-create-row .playlist-create-copy span,
          .playlist-create-row .playlist-create-copy small {
            white-space: normal;
          }

          .playlist-skeleton-index-row {
            grid-template-columns: 18px 50px minmax(0, 1fr) minmax(70px, 96px) 28px;
            gap: 12px;
            padding: 11px 13px;
          }

          .playlist-skeleton-row-title {
            width: 68%;
          }

          .playlist-skeleton-row-meta {
            width: 50%;
          }
        }
      `}</style>

      <main className="playlists-page">
        <div className="playlists-shell">
          <section className="playlists-hero">
            <div className="playlists-kicker">Playlist Library</div>

            <h1 className="playlists-title">Playlists</h1>

            <div className="playlists-meta">
              <span>{playlists.length} playlists</span>
              <span className="playlists-dot">·</span>
              <span>{formatSongCount(totalSongs)}</span>

              {allGenres.length > 0 && (
                <>
                  <span className="playlists-dot">·</span>
                  <span>{allGenres.join(" · ")}</span>
                </>
              )}
            </div>
          </section>

          <section className="playlists-control-bar">
            <div className="playlists-control-left">
              <span className="playlists-control-label">
                {isEditing ? "Reorder mode" : "Collection index"}
              </span>
            </div>

            {!isEditing && preferencesLoaded && (
              <div className="playlists-control-right">
                <button
                  type="button"
                  className="playlist-action-btn"
                  onClick={() => setShowNewModal(true)}
                >
                  <PlusIcon size={16} />
                  New Playlist
                </button>

                <button
                  type="button"
                  className="playlist-icon-btn"
                  aria-label={
                    viewMode === "grid"
                      ? "Switch to index view"
                      : "Switch to gallery view"
                  }
                  onClick={() => {
                    const nextViewMode = viewMode === "grid" ? "list" : "grid";

                    setViewMode(nextViewMode);
                    setSkeletonViewMode(nextViewMode);
                    localStorage.setItem(
                      PLAYLIST_SKELETON_VIEW_MODE_KEY,
                      nextViewMode,
                    );
                    setOpenSortMenu(false);
                  }}
                >
                  {viewMode === "grid" ? <ListViewIcon /> : <GridViewIcon />}
                </button>

                <DropdownShell
                  open={openSortMenu}
                  onOpenChange={setOpenSortMenu}
                  placement="bottom-end"
                  className="playlist-sort-dropdown"
                  offsetAmount={6}
                  flippedOffsetAmount={6}
                  collisionPadding={{
                    top: 112,
                    right: 16,
                    bottom: playerVisible ? 96 : 24,
                    left: 16,
                  }}
                  trigger={({ open }) => (
                    <button
                      type="button"
                      className={"playlist-icon-btn" + (open ? " is-open" : "")}
                      aria-label="Sort playlists"
                    >
                      <SortIcon />
                    </button>
                  )}
                >
                  <button
                    type="button"
                    className={sortMode === "custom" ? "is-active" : ""}
                    onClick={() => {
                      setSortMode("custom");
                      setOpenSortMenu(false);
                    }}
                  >
                    Custom
                  </button>

                  <button
                    type="button"
                    className={sortMode === "alphabetical" ? "is-active" : ""}
                    onClick={() => {
                      setSortMode("alphabetical");
                      setOpenSortMenu(false);
                    }}
                  >
                    Alphabetical
                  </button>
                </DropdownShell>
              </div>
            )}
          </section>

          {isEditing && (
            <div className="playlist-edit-banner">
              <span>Drag playlists into the order you want.</span>

              <div className="playlist-edit-actions">
                <button
                  type="button"
                  className="playlist-edit-cancel"
                  onClick={handleCancelReorder}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="playlist-edit-save"
                  onClick={handleSaveReorder}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {playlistsError && !showSkeleton ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                Couldn&apos;t load playlists
              </div>

              <div className="max-w-[320px] text-xs leading-5 text-[var(--text-secondary)]">
                {playlistsError}
              </div>

              <button
                type="button"
                onClick={refetchPlaylists}
                className="playlist-icon-btn"
              >
                Try
              </button>
            </div>
          ) : showSkeleton ? (
            skeletonViewModeLoaded ? (
              <SkeletonLibrary viewMode={resolvedSkeletonViewMode} />
            ) : (
              <div className="playlist-skeleton-reserve" />
            )
          ) : (
            <section className="playlist-library">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayedPlaylists.map((p) => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div
                    className={
                      viewMode === "grid"
                        ? "playlist-gallery"
                        : "playlist-index"
                    }
                  >
                    {!isEditing && (
                      <CreatePlaylistTile
                        viewMode={viewMode}
                        onClick={() => setShowNewModal(true)}
                      />
                    )}

                    {displayedPlaylists.map((playlist, index) => (
                      <SortablePlaylistItem
                        key={playlist.id}
                        playlist={playlist}
                        index={index}
                        isEditing={isEditing}
                        isDeleting={deletingPlaylistId === playlist.id}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        startReorder={startReorder}
                        openEdit={openEdit}
                        handleDeletePlaylist={handleDeletePlaylist}
                        playerVisible={playerVisible}
                        viewMode={viewMode}
                        playlistStats={playlistStats}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activePlaylist && (
                    <DragPreview
                      playlist={activePlaylist}
                      index={Math.max(activeIndex, 0)}
                      viewMode={viewMode}
                      stats={playlistStats[activePlaylist.id]}
                    />
                  )}
                </DragOverlay>
              </DndContext>
            </section>
          )}

          <div
            className="pt-12 pb-1"
            style={{
              paddingBottom: playerVisible ? "72px" : "8px",
            }}
          >
            <Footer />
          </div>
        </div>
      </main>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "88px" : "24px"}
      />

      <EditPlaylistModal
        isOpen={!!editingPlaylist}
        playlist={editingPlaylist}
        name={editName}
        coverPreview={editCoverPreview}
        isSaving={isSavingPlaylist}
        onNameChange={setEditName}
        onCoverPreviewChange={setEditCoverPreview}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        onClose={() => setEditingPlaylist(null)}
      />

      <CreatePlaylistModal
        isOpen={showNewModal}
        name={newName}
        coverPreview={newCoverPreview}
        isCreating={isCreatingPlaylist}
        onNameChange={setNewName}
        onCoverPreviewChange={setNewCoverPreview}
        onCreate={handleCreate}
        onClose={() => setShowNewModal(false)}
      />
    </>
  );
}
