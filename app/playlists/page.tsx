'use client';

import Footer from '@/components/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';
import EditPlaylistModal from '@/components/EditPlaylistModal';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import Toast from '@/components/Toast';
import DropdownShell from '@/components/DropdownShell';
import { usePlayer } from '@/context/PlayerContext';
import {
  useUserPreferences,
  type PlaylistViewMode,
} from '@/context/UserPreferencesContext';
import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Playlist {
  id: number;
  clerk_user_id: string;
  name: string;
  cover_image_url: string | null;
  position: number;
}

const GRADIENTS = [
  'linear-gradient(160deg,#1a3a2a,#2d5a3d)',
  'linear-gradient(160deg,#111827,#1f2937)',
  'linear-gradient(160deg,#7f1d1d,#b91c1c)',
  'linear-gradient(160deg,#1c1c2e,#2d2d44)',
  'linear-gradient(160deg,#003d40,#006064)',
  'linear-gradient(160deg,#4a0e0e,#7b1515)',
  'linear-gradient(160deg,#1a2535,#2c3e50)',
  'linear-gradient(160deg,#0f172a,#1e3a5f)',
  'linear-gradient(160deg,#2d0a3a,#4a1258)',
  'linear-gradient(160deg,#0f1a0f,#1a2e1a)',
  'linear-gradient(160deg,#1a0a2e,#2d1554)',
  'linear-gradient(160deg,#003344,#00516b)',
  'linear-gradient(160deg,#3d2800,#6b4500)',
  'linear-gradient(160deg,#121212,#2a2a2a)',
  'linear-gradient(160deg,#001a4d,#002b80)',
  'linear-gradient(160deg,#0a2e0a,#145214)',
  'linear-gradient(160deg,#3d1200,#6b2100)',
  'linear-gradient(160deg,#0a2233,#0d3352)',
  'linear-gradient(160deg,#1f0a3d,#36146b)',
];

function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.5 16.5L7 19L9.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 12H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 17H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.5 7H4.51" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M4.5 12H4.51" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M4.5 17H4.51" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ReorderHandleIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      <circle cx="2" cy="2.5" r="1" fill="currentColor" />
      <circle cx="8" cy="2.5" r="1" fill="currentColor" />
      <circle cx="2" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="2" cy="13.5" r="1" fill="currentColor" />
      <circle cx="8" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

function PlaylistCardContent({
  playlist,
  index,
  isOverlay = false,
}: {
  playlist: Playlist;
  index: number;
  isOverlay?: boolean;
}) {
  return (
    <div
      className="playlist-card-inner"
      style={{
        background: playlist.cover_image_url ? '#000' : GRADIENTS[index % GRADIENTS.length],
        opacity: isOverlay ? 0.95 : 1,
      }}
    >
      {playlist.cover_image_url && (
        <img src={playlist.cover_image_url} alt={playlist.name} className="playlist-card-img" />
      )}

      <div className="playlist-card-overlay">
        <div className="playlist-card-text-block">
          <div className="playlist-card-name">{playlist.name}</div>
          <div className="playlist-card-desc">0 songs</div>
        </div>
      </div>
    </div>
  );
}

function PlaylistListContent({
  playlist,
  index,
  isOverlay = false,
  showReorderHandle = false,
}: {
  playlist: Playlist;
  index: number;
  isOverlay?: boolean;
  showReorderHandle?: boolean;
}) {
  return (
    <div className="playlist-list-inner" style={{ opacity: isOverlay ? 0.95 : 1 }}>
      {showReorderHandle && (
        <div className="playlist-reorder-handle" aria-hidden="true">
          <ReorderHandleIcon />
        </div>
      )}

      <div
        className="playlist-list-cover"
        style={{
          background: playlist.cover_image_url ? '#000' : GRADIENTS[index % GRADIENTS.length],
        }}
      >
        {playlist.cover_image_url && (
          <img src={playlist.cover_image_url} alt={playlist.name} className="playlist-list-img" />
        )}
      </div>

      <div className="playlist-list-text-block">
        <div className="playlist-list-name">{playlist.name}</div>
        <div className="playlist-list-desc">0 songs</div>
      </div>
    </div>
  );
}

function SortableCard({
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
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: playlist.id,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: isEditing ? 'grab' : 'pointer',
    ...(viewMode === 'grid'
      ? {
          background: playlist.cover_image_url
            ? '#000'
            : GRADIENTS[index % GRADIENTS.length],
        }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      className={viewMode === 'grid' ? 'playlist-card' : 'playlist-list-item'}
      style={style}
      {...(isEditing ? { ...attributes, ...listeners } : {})}
    >
      {viewMode === 'grid' ? (
        <PlaylistCardContent playlist={playlist} index={index} />
      ) : (
        <PlaylistListContent
          playlist={playlist}
          index={index}
          showReorderHandle={isEditing}
        />
      )}

      {isDeleting && (
        <div className="playlist-deleting-overlay">
          <LoadingSpinner size={24} stroke={7} color="#fff" />
        </div>
      )}

      {!isEditing && (
        <div className={viewMode === 'grid' ? 'playlist-card-menu-wrap' : 'playlist-list-menu-wrap'}>
          <DropdownShell
            open={openMenuId === playlist.id}
            onOpenChange={(nextOpen) => {
              setOpenMenuId(nextOpen ? playlist.id : null);
            }}
            placement="bottom-end"
            className="playlist-dropdown"
            offsetAmount={5}
            flippedOffsetAmount={5}
            crossAxisOffset={-5}
            collisionPadding={{
              top: 112,
              right: 16,
              bottom: playerVisible ? 96 : 24,
              left: 16,
            }}
            trigger={({ open }) => (
              <button
                type="button"
                className={'playlist-menu-btn' + (open ? ' is-open' : '')}
                aria-label="Playlist options"
              >
                <MoreIcon />
              </button>
            )}
          >
            <button type="button" onClick={() => openEdit(playlist)}>
              Edit Details
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null);
                startReorder();
              }}
            >
              Reorder
            </button>

            <button
              type="button"
              className="danger"
              onClick={() => handleDeletePlaylist(playlist)}
            >
              Delete
            </button>
          </DropdownShell>
        </div>
      )}
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
  } = useUserPreferences();

  const playerVisible = !!currentSong;

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [reorderSnapshot, setReorderSnapshot] = useState<Playlist[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [openSortMenu, setOpenSortMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const displayedPlaylists = useMemo(() => {
    if (sortMode === 'alphabetical') {
      return [...playlists].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    }

    return playlists;
  }, [playlists, sortMode]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadPlaylists() {
      try {
        const res = await fetch('/api/playlists');
        const data = await res.json();

        if (!cancelled && res.ok) {
          setPlaylists(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPlaylists();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  };

  const startReorder = () => {
    setOpenMenuId(null);
    setOpenSortMenu(false);
    setSortMode('custom');
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
    showToast('Reorder cancelled');
  };

  const handleSaveReorder = async () => {
    const reordered = playlists.map((playlist, index) => ({
      ...playlist,
      position: index,
    }));

    setPlaylists(reordered);

    try {
      const res = await fetch('/api/playlists/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlists: reordered.map(p => ({
            id: p.id,
            position: p.position,
          })),
        }),
      });

      if (!res.ok) {
        console.error('Failed to save playlist order:', res.statusText);
        return;
      }

      setOpenMenuId(null);
      setOpenSortMenu(false);
      setReorderSnapshot(null);
      setIsEditing(false);
      showToast('Order saved');
    } catch (err) {
      console.error('Failed to save playlist order:', err);
    }
  };

  const openEdit = (playlist: Playlist) => {
    setOpenMenuId(null);
    setOpenSortMenu(false);
    setEditingPlaylist(playlist);
    setEditName(playlist.name);
    setEditCoverPreview(playlist.cover_image_url);
  };

  const handleSaveEdit = async () => {
    if (!editingPlaylist || isSavingPlaylist) return;

    setIsSavingPlaylist(true);

    try {
      const res = await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          cover_image_url: editCoverPreview,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error('Failed to save playlist:', data || res.statusText);
        return;
      }

      setPlaylists(prev => prev.map(p =>
        p.id === editingPlaylist.id
          ? data || {
              ...p,
              name: editName,
              cover_image_url: editCoverPreview,
            }
          : p
      ));

      showToast('Changes saved');
      setEditingPlaylist(null);
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPlaylist || deletingPlaylistId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${editingPlaylist.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    const playlistId = editingPlaylist.id;

    setEditingPlaylist(null);
    setDeletingPlaylistId(playlistId);

    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        showToast('Playlist deleted');
      }
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (deletingPlaylistId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${playlist.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setOpenMenuId(null);
    setOpenSortMenu(false);
    setDeletingPlaylistId(playlist.id);

    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
        showToast('Playlist deleted');
      }
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user || isCreatingPlaylist) return;

    setIsCreatingPlaylist(true);

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        console.error('Failed to create playlist:', data || res.statusText);
        return;
      }

      if (data) {
        setPlaylists(prev => [...prev, data]);
        showToast('Playlist created');
      }

      setNewName('');
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

    const oldIndex = playlists.findIndex(p => p.id === active.id);
    const newIndex = playlists.findIndex(p => p.id === over.id);

    const reordered = arrayMove(playlists, oldIndex, newIndex).map((p, i) => ({
      ...p,
      position: i,
    }));

    setPlaylists(reordered);
  };

  const activePlaylist = playlists.find(p => p.id === activeId);
  const activeIndex = playlists.findIndex(p => p.id === activeId);

  if (loading) {
    return (
      <>
        <style>{`
          .playlists-loading-page {
            margin-left: 0;
            margin-top: 56px;
            padding: 0 32px;
          }

          @media (min-width: 768px) {
            .playlists-loading-page {
              margin-left: 280px;
            }
          }
        `}</style>

        <div className="playlists-loading-page">
          <div
            style={{
              minHeight: 'calc(100vh - 56px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: playerVisible
                ? 'translateY(calc(-20px - 32px))'
                : 'translateY(-20px)',
            }}
          >
            <LoadingSpinner />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .playlists-page {
          margin-left: 0;
          margin-top: 56px;
          padding: 0 32px;
          min-height: calc(100vh - 56px);
          display: flex;
          flex-direction: column;
        }

        @media (min-width: 768px) {
          .playlists-page {
            margin-left: 280px;
          }
        }

        .playlist-header-actions {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .playlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
          width: 100%;
        }

        .playlist-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          width: calc(100% + 65px);
          margin-left: -33px;
          margin-right: -32px;
        }

        .playlist-list.is-reordering {
          width: calc(100% + 32px);
          margin-left: -16px;
          margin-right: -16px;
        }

        .playlist-card {
          position: relative;
          border-radius: 20px;
          overflow: visible;
          aspect-ratio: 1;
          background: #111;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .playlist-card:hover {
          transform: none;
        }

        .playlist-card-inner {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          overflow: hidden;
        }

        .playlist-card-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
        }

        .playlist-card:hover .playlist-card-img {
          transform: scale(1.05);
        }

        .playlist-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 12px;
          padding-bottom: 14px;
          box-sizing: border-box;
          min-height: 0;
        }

        .playlist-card-text-block {
          min-height: 32px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .playlist-card-name {
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }

        .playlist-card-desc {
          font-size: 10px;
          color: rgba(255,255,255,0.5);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .playlist-list-item {
          position: relative;
          height: 72px;
          overflow: visible;
          border-radius: 0;
          border-bottom: 1px solid var(--border-subtle);
          background: transparent;
          transition: background 0.15s ease;
        }

        .playlist-list-item:hover {
          background: var(--bg-hover);
        }

        .playlist-list-inner {
          height: 100%;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 46px 16px 32px;
          box-sizing: border-box;
        }

        .playlist-list.is-reordering .playlist-list-inner {
          padding-left: 22px;
        }

        .playlist-reorder-handle {
          width: 16px;
          flex: 0 0 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          pointer-events: none;
        }

        .playlist-list-cover {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .playlist-list-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .playlist-list-text-block {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .playlist-list-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }

        .playlist-list-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .playlist-card-menu-wrap {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10;
        }

        .playlist-list-menu-wrap {
          position: absolute;
          top: 50%;
          right: 18px;
          z-index: 10;
          transform: translateY(-50%);
        }

        .playlist-menu-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
        }

        .playlist-list-item .playlist-menu-btn {
          color: var(--icon-color);
        }

        .playlist-card:hover .playlist-menu-btn,
        .playlist-list-item:hover .playlist-menu-btn,
        .playlist-menu-btn.is-open {
          opacity: 1;
        }

        .playlist-menu-btn:hover {
          background: rgba(255,255,255,0.18);
          color: var(--text-primary);
        }

        .playlist-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--icon-color);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .playlist-icon-btn:hover,
        .playlist-icon-btn.is-open {
          background: rgba(255,255,255,0.18);
          color: var(--text-primary);
        }

        .playlist-dropdown,
        .playlist-sort-dropdown {
          z-index: 25;
          width: 138px;
          margin-left: 5px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 18px 50px rgba(0,0,0,0.45);
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
        .playlist-sort-dropdown button:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        .playlist-sort-dropdown button.is-active {
          color: var(--text-primary);
        }

        .playlist-dropdown button.danger {
          color: var(--accent-2);
        }

        .create-card {
          position: relative;
          border-radius: 20px;
          aspect-ratio: 1;
          border: 1.5px dashed var(--border);
          background: var(--bg-tertiary);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }

        .create-card:hover {
          border-color: var(--text-muted);
          background: var(--bg-tertiary-hover);
        }

        .create-list-item {
          height: 72px;
          border-radius: 0;
          border: none;
          border-bottom: 1px solid var(--border-subtle);
          background: transparent;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 32px;
          cursor: pointer;
          transition: background 0.15s ease;
          box-sizing: border-box;
        }

        .create-list-item:hover {
          background: var(--bg-hover);
        }

        .create-list-plus-wrap {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-hover);
          flex: 0 0 40px;
        }

        .create-card-plus {
          font-size: 22px;
          color: var(--text-muted);
          line-height: 1;
          transition: color 0.2s;
        }

        .create-card:hover .create-card-plus,
        .create-list-item:hover .create-card-plus {
          color: var(--text-secondary);
        }

        .create-card-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
          transition: color 0.2s;
        }

        .create-list-item .create-card-label {
          font-size: 14px;
          font-weight: 500;
        }

        .create-card:hover .create-card-label,
        .create-list-item:hover .create-card-label {
          color: var(--text-secondary);
        }

        .reorder-wrapper {
          border-radius: 16px;
          transition: padding 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;
        }

        .drag-overlay-card {
          border-radius: 10px;
          overflow: hidden;
          aspect-ratio: 1;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          transform: scale(1.06);
          cursor: grabbing;
        }

        .drag-overlay-list {
          height: 72px;
          border-radius: 0;
          overflow: hidden;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-hover);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          transform: scale(1.02);
          cursor: grabbing;
        }

        .playlist-deleting-overlay {
          position: absolute;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(0,0,0,0.45);
          pointer-events: none;
        }

        .playlist-list-item .playlist-deleting-overlay {
          border-radius: 0;
        }
      `}</style>

      <div className="playlists-page">
        <div className="flex items-center justify-between pt-8 pb-8">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium text-[var(--text-primary)]">
            Playlists
          </h1>

          {!isEditing && (
            <div className="playlist-header-actions">
              <button
                type="button"
                className="playlist-icon-btn"
                aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                onClick={() => {
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid');
                  setOpenSortMenu(false);
                }}
              >
                {viewMode === 'grid' ? <ListIcon /> : <GridIcon />}
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
                    className={'playlist-icon-btn' + (open ? ' is-open' : '')}
                    aria-label="Sort playlists"
                  >
                    <SortIcon />
                  </button>
                )}
              >
                <button
                  type="button"
                  className={sortMode === 'custom' ? 'is-active' : ''}
                  onClick={() => {
                    setSortMode('custom');
                    setOpenSortMenu(false);
                  }}
                >
                  Custom
                </button>

                <button
                  type="button"
                  className={sortMode === 'alphabetical' ? 'is-active' : ''}
                  onClick={() => {
                    setSortMode('alphabetical');
                    setOpenSortMenu(false);
                  }}
                >
                  Alphabetical
                </button>
              </DropdownShell>
            </div>
          )}
        </div>

        <div
          className="reorder-wrapper relative"
          style={{
            padding: isEditing
              ? viewMode === 'list'
                ? '16px 16px 0 16px'
                : '16px'
              : '0',
            border: isEditing ? '1.5px dashed var(--border)' : '1.5px dashed transparent',
            backgroundColor: isEditing ? 'var(--bg-tertiary)' : 'transparent',
          }}
        >
          {isEditing && (
            <div className="mb-4 flex items-center justify-between">
              <span className="pl-2 text-sm font-medium text-[var(--text-secondary)]">
                Drag to reorder
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCancelReorder}
                  className="font-[family-name:var(--font-instrument-sans)] cursor-pointer rounded-full bg-[var(--bg-tertiary)] px-5 py-2 text-xs font-[500] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary-hover)]"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSaveReorder}
                  className="font-[family-name:var(--font-instrument-sans)] cursor-pointer rounded-full bg-[var(--text-primary)] px-5 py-2 text-xs font-[600] text-[var(--bg-primary)] transition hover:opacity-80"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={displayedPlaylists.map(p => p.id)} strategy={rectSortingStrategy}>
              <div
                className={
                  viewMode === 'grid'
                    ? 'playlist-grid'
                    : 'playlist-list' + (isEditing ? ' is-reordering' : '')
                }
              >
                <AnimatePresence mode="popLayout">
                  {!isEditing && (
                    <motion.div
                      key="create-card"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={viewMode === 'grid' ? 'create-card' : 'create-list-item'}
                      onClick={() => setShowNewModal(true)}
                    >
                      {viewMode === 'grid' ? (
                        <>
                          <span className="create-card-plus">+</span>
                          <span className="create-card-label">Create Playlist</span>
                        </>
                      ) : (
                        <>
                          <div className="create-list-plus-wrap">
                            <span className="create-card-plus">+</span>
                          </div>
                          <span className="create-card-label">Create Playlist</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {displayedPlaylists.map((playlist, index) => (
                  <SortableCard
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
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activePlaylist && (
                viewMode === 'grid' ? (
                  <div
                    className="drag-overlay-card"
                    style={{
                      background: activePlaylist.cover_image_url
                        ? '#000'
                        : GRADIENTS[activeIndex % GRADIENTS.length],
                    }}
                  >
                    <PlaylistCardContent playlist={activePlaylist} index={activeIndex} isOverlay />
                  </div>
                ) : (
                  <div className="drag-overlay-list">
                    <PlaylistListContent
                      playlist={activePlaylist}
                      index={activeIndex}
                      isOverlay
                      showReorderHandle
                    />
                  </div>
                )
              )}
            </DragOverlay>
          </DndContext>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
          <Footer />
        </div>
      </div>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? '88px' : '24px'}
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