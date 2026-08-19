"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import DragIconSmall from "@/components/icons/DragIconSmall";
import PlusIcon from "@/components/icons/PlusIcon";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistPlaylist = {
  id: string;
  artist_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  song_ids: string[];
};

type PlaylistSong = {
  id: string;
  title: string;
  status: string;
  duration: number;
  bpm: number | null;
  key: string | null;
  cover_url: string | null;
  created_at: string;
};

type PlaylistsResponse = {
  playlists?: ArtistPlaylist[];
  playlist?: ArtistPlaylist | (Partial<ArtistPlaylist> & { id: string });
  songs?: PlaylistSong[];
  playlist_ids?: string[];
  error?: string;
};

type ArtistPlaylistManagerProps = {
  artist: ArtistDashboardProfile;
  onPlaylistCreated: () => void;
};

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span className="filmwave-backend-status-badge bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
      {isPublic ? "Public" : "Private"}
    </span>
  );
}

function SortablePlaylistRow({
  playlist,
  canManage,
  disabled,
  onEdit,
}: {
  playlist: ArtistPlaylist;
  canManage: boolean;
  disabled: boolean;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id, disabled: !canManage || disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 2 : "auto",
      }}
      className={`grid gap-4 px-5 py-3 sm:items-center ${
        canManage
          ? "sm:grid-cols-[28px_52px_minmax(0,1fr)_100px_auto]"
          : "sm:grid-cols-[52px_minmax(0,1fr)_100px_auto]"
      }`}
    >
      {canManage ? (
        <button
          type="button"
          disabled={disabled}
          className="flex h-8 w-7 cursor-grab items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Drag ${playlist.name} to reorder`}
          {...attributes}
          {...listeners}
        >
          <span className="inline-flex scale-x-[1.45]">
            <DragIconSmall />
          </span>
        </button>
      ) : null}

      <div className="h-[52px] w-[52px] overflow-hidden rounded-[7px] bg-[var(--bg-tertiary)]">
        {playlist.cover_image_url ? (
          <img
            src={playlist.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
          {playlist.name}
        </div>
        <div className="mt-1 text-[11px] text-[var(--text-muted)]">
          {playlist.song_ids.length} {playlist.song_ids.length === 1 ? "track" : "tracks"}
        </div>
      </div>

      <div>
        <VisibilityBadge isPublic={playlist.is_public} />
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onEdit}
          className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
        >
          {canManage ? "Edit" : "View"}
        </button>
      </div>
    </div>
  );
}

export default function ArtistPlaylistManager({
  artist,
  onPlaylistCreated,
}: ArtistPlaylistManagerProps) {
  const canManage =
    artist.status === "approved" && artist.permissions.includes("playlist:manage");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [playlists, setPlaylists] = useState<ArtistPlaylist[]>([]);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [creating, setCreating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setPlaylists([]);
    setSongs([]);
    setSelectedPlaylistId("");
    setCreating(false);
    setLoadState("loading");
    setLoadError("");
    setListError("");

    async function loadPlaylists() {
      try {
        const response = await fetch(`/api/artists/${artist.id}/playlists`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => ({}))) as PlaylistsResponse;

        if (!response.ok) {
          throw new Error(body.error || "Failed to load playlists");
        }

        if (!cancelled) {
          setPlaylists(Array.isArray(body.playlists) ? body.playlists : []);
          setSongs(Array.isArray(body.songs) ? body.songs : []);
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load playlists",
          );
          setLoadState("error");
        }
      }
    }

    void loadPlaylists();

    return () => {
      cancelled = true;
    };
  }, [artist.id]);

  const selectedPlaylist = playlists.find(
    (playlist) => playlist.id === selectedPlaylistId,
  );

  async function handlePlaylistDragEnd(event: DragEndEvent) {
    if (!canManage || reordering) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = playlists.findIndex((playlist) => playlist.id === active.id);
    const newIndex = playlists.findIndex((playlist) => playlist.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = playlists;
    const reordered = arrayMove(playlists, oldIndex, newIndex).map(
      (playlist, position) => ({ ...playlist, position }),
    );
    setPlaylists(reordered);
    setListError("");

    try {
      setReordering(true);
      const response = await fetch(`/api/artists/${artist.id}/playlists`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlist_ids: reordered.map((playlist) => playlist.id),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as PlaylistsResponse;

      if (!response.ok) {
        throw new Error(body.error || "Failed to reorder playlists");
      }
    } catch (error) {
      setPlaylists(previous);
      setListError(
        error instanceof Error ? error.message : "Failed to reorder playlists",
      );
    } finally {
      setReordering(false);
    }
  }

  if (selectedPlaylist) {
    return (
      <PlaylistEditor
        artist={artist}
        canManage={canManage}
        playlist={selectedPlaylist}
        songs={songs}
        onBack={() => setSelectedPlaylistId("")}
        onUpdated={(updatedPlaylist) =>
          setPlaylists((current) =>
            current.map((playlist) =>
              playlist.id === updatedPlaylist.id ? updatedPlaylist : playlist,
            ),
          )
        }
      />
    );
  }

  if (creating) {
    return (
      <CreatePlaylist
        artist={artist}
        canManage={canManage}
        onBack={() => setCreating(false)}
        onCreated={(playlist) => {
          setPlaylists((current) => [...current, playlist]);
          setCreating(false);
          setSelectedPlaylistId(playlist.id);
          onPlaylistCreated();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        {canManage ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="filmwave-backend-button filmwave-backend-button-primary"
          >
            <PlusIcon size={13} />
            New Playlist
          </button>
        ) : null}
      </div>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Playlists</h2>
        </div>

        {listError ? (
          <div className="px-5 pb-3 text-xs text-[var(--danger)]">{listError}</div>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => void handlePlaylistDragEnd(event)}
        >
          <SortableContext
            items={playlists.map((playlist) => playlist.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y divide-[var(--border-subtle)]">
              {loadState === "loading" ? (
                <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
                  Loading playlists...
                </div>
              ) : null}

              {loadState === "error" ? (
                <div className="px-5 py-5 text-xs text-[var(--danger)]">
                  {loadError || "Playlists could not be loaded."}
                </div>
              ) : null}

              {loadState === "ready" && playlists.length === 0 ? (
                <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
                  No playlists created yet.
                </div>
              ) : null}

              {playlists.map((playlist) => (
                <SortablePlaylistRow
                  key={playlist.id}
                  playlist={playlist}
                  canManage={canManage}
                  disabled={reordering}
                  onEdit={() => setSelectedPlaylistId(playlist.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}

type CreatePlaylistProps = {
  artist: ArtistDashboardProfile;
  canManage: boolean;
  onBack: () => void;
  onCreated: (playlist: ArtistPlaylist) => void;
};

function CreatePlaylist({
  artist,
  canManage,
  onBack,
  onCreated,
}: CreatePlaylistProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving || !name.trim()) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/artists/${artist.id}/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          is_public: isPublic,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as PlaylistsResponse;

      if (!response.ok || !body.playlist) {
        throw new Error(body.error || "Failed to create playlist");
      }

      onCreated(body.playlist as ArtistPlaylist);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create playlist",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={createPlaylist} className="grid gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={saving}
        className="filmwave-backend-button filmwave-backend-button-secondary w-fit"
      >
        Back to Playlists
      </button>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">New playlist</h2>
        </div>

        <div className="grid gap-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
              Playlist name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={180}
              disabled={!canManage || saving}
              className="filmwave-backend-input"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={4}
              disabled={!canManage || saving}
              className="filmwave-backend-textarea"
            />
          </label>

          <label className="flex h-10 items-center gap-2 rounded-[7px] border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              disabled={!canManage || saving}
            />
            Public
          </label>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div className="min-h-5 text-xs text-[var(--danger)]">{error}</div>
        <button
          type="submit"
          disabled={!canManage || saving || !name.trim()}
          className="filmwave-backend-button filmwave-backend-button-primary"
        >
          {saving ? "Creating..." : "Create Playlist"}
        </button>
      </div>
    </form>
  );
}

type PlaylistEditorProps = {
  artist: ArtistDashboardProfile;
  canManage: boolean;
  playlist: ArtistPlaylist;
  songs: PlaylistSong[];
  onBack: () => void;
  onUpdated: (playlist: ArtistPlaylist) => void;
};

function PlaylistEditor({
  artist,
  canManage,
  playlist,
  songs,
  onBack,
  onUpdated,
}: PlaylistEditorProps) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description ?? "");
  const [isPublic, setIsPublic] = useState(playlist.is_public);
  const [songIds, setSongIds] = useState<string[]>(playlist.song_ids);
  const [songToAdd, setSongToAdd] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkInputKey, setArtworkInputKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [message, setMessage] = useState("");
  const [playlistSavedVisible, setPlaylistSavedVisible] = useState(false);
  const [error, setError] = useState("");

  const songsById = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs],
  );
  const orderedSongs = songIds
    .map((songId) => songsById.get(songId))
    .filter((song): song is PlaylistSong => Boolean(song));
  const availableSongs = songs.filter((song) => !songIds.includes(song.id));

  useEffect(() => {
    if (message !== "Playlist saved.") return;

    const fadeTimer = window.setTimeout(() => {
      setPlaylistSavedVisible(false);
    }, 2500);
    const clearTimer = window.setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [message]);

  function addTrack() {
    if (!songToAdd || !canManage) return;
    setSongIds((current) => [...current, songToAdd]);
    setSongToAdd("");
    setPlaylistSavedVisible(false);
    setMessage("");
    setError("");
  }

  function removeTrack(songId: string) {
    setSongIds((current) => current.filter((id) => id !== songId));
    setPlaylistSavedVisible(false);
    setMessage("");
    setError("");
  }

  function moveTrack(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= songIds.length) return;

    setSongIds((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setPlaylistSavedVisible(false);
    setMessage("");
    setError("");
  }

  async function savePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving || !name.trim()) return;

    try {
      setSaving(true);
      setError("");
      setPlaylistSavedVisible(false);
      setMessage("");

      const response = await fetch(
        `/api/artists/${artist.id}/playlists/${playlist.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            is_public: isPublic,
            song_ids: songIds,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as PlaylistsResponse;

      if (!response.ok || !body.playlist) {
        throw new Error(body.error || "Failed to save playlist");
      }

      onUpdated(body.playlist as ArtistPlaylist);
      setPlaylistSavedVisible(true);
      setMessage("Playlist saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save playlist",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadArtwork() {
    if (!canManage || !artworkFile || uploadingArtwork) return;

    try {
      setUploadingArtwork(true);
      setError("");
      setPlaylistSavedVisible(false);
      setMessage("");

      const formData = new FormData();
      formData.append("file", artworkFile);

      const response = await fetch(
        `/api/artists/${artist.id}/playlists/${playlist.id}/artwork`,
        { method: "POST", body: formData },
      );
      const body = (await response.json().catch(() => ({}))) as PlaylistsResponse;

      if (!response.ok || !body.playlist?.cover_image_url) {
        throw new Error(body.error || "Failed to upload playlist artwork");
      }

      onUpdated({
        ...playlist,
        name,
        description: description.trim() || null,
        is_public: isPublic,
        song_ids: songIds,
        cover_image_url: body.playlist.cover_image_url,
        updated_at: body.playlist.updated_at ?? playlist.updated_at,
      });
      setArtworkFile(null);
      setArtworkInputKey((current) => current + 1);
      setMessage("Artwork updated.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload playlist artwork",
      );
    } finally {
      setUploadingArtwork(false);
    }
  }

  return (
    <form onSubmit={savePlaylist} className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={saving || uploadingArtwork}
          className="filmwave-backend-button filmwave-backend-button-secondary"
        >
          Back to Playlists
        </button>
        <VisibilityBadge isPublic={isPublic} />
      </div>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Playlist details</h2>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[160px_minmax(0,1fr)]">
          <div>
            <div className="aspect-square overflow-hidden rounded-[7px] bg-[var(--bg-tertiary)]">
              {playlist.cover_image_url ? (
                <img
                  src={playlist.cover_image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            {canManage ? (
              <div className="mt-3 grid gap-2">
                <input
                  key={artworkInputKey}
                  type="file"
                  accept="image/*"
                  disabled={uploadingArtwork}
                  onChange={(event) =>
                    setArtworkFile(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-[11px] text-[var(--text-muted)] file:mr-2 file:rounded-[7px] file:border file:border-[var(--border)] file:bg-[var(--bg-primary)] file:px-2.5 file:py-1.5 file:text-[11px] file:text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={() => void uploadArtwork()}
                  disabled={!artworkFile || uploadingArtwork}
                  className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
                >
                  {uploadingArtwork ? "Uploading..." : "Upload artwork"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid content-start gap-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
                Playlist name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={180}
                disabled={!canManage || saving}
                className="filmwave-backend-input"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                rows={4}
                disabled={!canManage || saving}
                className="filmwave-backend-textarea"
              />
            </label>

            <label className="flex h-10 items-center gap-2 rounded-[7px] border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                disabled={!canManage || saving}
              />
              Public
            </label>
          </div>
        </div>
      </section>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Track order</h2>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            <select
              value={songToAdd}
              onChange={(event) => setSongToAdd(event.target.value)}
              disabled={availableSongs.length === 0}
              className="filmwave-backend-select min-w-[240px] flex-1"
            >
              <option value="">Select a track</option>
              {availableSongs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title} · {formatStatus(song.status)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addTrack}
              disabled={!songToAdd}
              className="filmwave-backend-button filmwave-backend-button-secondary"
            >
              Add Track
            </button>
          </div>
        ) : null}

        <div className="divide-y divide-[var(--border-subtle)]">
          {orderedSongs.length === 0 ? (
            <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
              No tracks added yet.
            </div>
          ) : (
            orderedSongs.map((song, index) => (
              <div
                key={song.id}
                className="grid gap-3 px-5 py-3 sm:grid-cols-[44px_minmax(0,1fr)_70px_70px_70px_auto] sm:items-center"
              >
                <div className="h-10 w-10 overflow-hidden rounded-[6px] bg-[var(--bg-tertiary)]">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {song.title}
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {formatDuration(Number(song.duration))}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {song.key || "—"}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {song.bpm ? `${song.bpm} BPM` : "—"}
                </div>
                {canManage ? (
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveTrack(index, -1)}
                      disabled={index === 0}
                      className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary min-w-8 px-2"
                      aria-label={`Move ${song.title} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTrack(index, 1)}
                      disabled={index === orderedSongs.length - 1}
                      className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary min-w-8 px-2"
                      aria-label={`Move ${song.title} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTrack(song.id)}
                      className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary-danger"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div className="min-h-5 text-xs">
          {error ? (
            <span className="text-[var(--danger)]">{error}</span>
          ) : message === "Playlist saved." ? (
            <span
              className={`transition-opacity duration-500 ${
                playlistSavedVisible ? "opacity-100" : "opacity-0"
              }`}
              style={{ color: "var(--status-success, #48b571)" }}
            >
              {message}
            </span>
          ) : message ? (
            <span className="text-[var(--text-muted)]">{message}</span>
          ) : null}
        </div>
        {canManage ? (
          <button
            type="submit"
            disabled={saving || uploadingArtwork || !name.trim()}
            className="filmwave-backend-button filmwave-backend-button-primary"
          >
            {saving ? "Saving..." : "Save Playlist"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
