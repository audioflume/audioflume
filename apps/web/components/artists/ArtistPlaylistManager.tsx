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
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ArtistCollectionGrid,
  ArtistCollectionGridCard,
  ArtistCollectionViewToggle,
  type ArtistCollectionViewMode,
} from "@/components/artists/ArtistCollectionView";
import ArtistReleaseTrackPicker from "@/components/artists/ArtistReleaseTrackPicker";
import ArtistTrackOrderRow, {
  type ArtistTrackOrderSong,
} from "@/components/artists/ArtistTrackOrderRow";
import BackendArtworkUpload from "@/components/backend/BackendArtworkUpload";
import {
  BackendCheckbox,
  BackendInput,
  BackendStatusBadge,
  BackendTextarea,
} from "@/components/backend/BackendControls";
import BackendDragHandle from "@/components/backend/BackendDragHandle";
import { BackendMediaThumbnail, BackendRowTitle } from "@/components/backend/BackendRow";
import PlusIcon from "@/components/icons/PlusIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";
import { toSmartTitleCaseInput } from "@/lib/smartTitleCase";
import type { Song } from "@/lib/types";

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

type PlaylistSong = ArtistTrackOrderSong;

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

function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return <BackendStatusBadge>{isPublic ? "Public" : "Private"}</BackendStatusBadge>;
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
      className={`grid gap-4 px-5 py-3 min-[480px]:items-center ${
        canManage
          ? "min-[480px]:grid-cols-[28px_52px_minmax(0,1fr)_100px_auto]"
          : "min-[480px]:grid-cols-[52px_minmax(0,1fr)_100px_auto]"
      }`}
    >
      {canManage ? (
        <BackendDragHandle
          disabled={disabled}
          aria-label={`Drag ${playlist.name} to reorder`}
          {...attributes}
          {...listeners}
        />
      ) : null}

      <BackendMediaThumbnail
        src={playlist.cover_image_url}
        size={52}
        className="rounded-[7px]"
      />
      <BackendRowTitle
        secondary={`${playlist.song_ids.length} ${playlist.song_ids.length === 1 ? "track" : "tracks"}`}
      >
        {playlist.name}
      </BackendRowTitle>

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
  const [viewMode, setViewMode] = useState<ArtistCollectionViewMode>("grid");

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

        if (!response.ok) throw new Error(body.error || "Failed to load playlists");

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

      if (!response.ok) throw new Error(body.error || "Failed to reorder playlists");
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
        onDeleted={() => {
          setPlaylists((current) =>
            current.filter((playlist) => playlist.id !== selectedPlaylist.id),
          );
          setSelectedPlaylistId("");
        }}
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
      <div className="mb-4 flex items-center justify-end gap-2">
        <ArtistCollectionViewToggle viewMode={viewMode} onChange={setViewMode} />
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

      {viewMode === "grid" ? (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="filmwave-backend-section-title">Playlists</h2>
          </div>

          {listError ? (
            <div className="pb-3 text-xs text-[var(--danger)]">{listError}</div>
          ) : null}

          {loadState === "loading" ? (
            <div className="flex min-h-[144px] items-center justify-center text-xs text-[var(--text-muted)]">
              Loading playlists...
            </div>
          ) : null}
          {loadState === "error" ? (
            <div className="flex min-h-[144px] items-center justify-center text-center text-xs text-[var(--danger)]">
              {loadError || "Playlists could not be loaded."}
            </div>
          ) : null}
          {loadState === "ready" && playlists.length === 0 ? (
            <div className="flex min-h-[144px] items-center justify-center text-xs text-[var(--text-muted)]">
              No playlists created yet.
            </div>
          ) : null}
          {loadState === "ready" && playlists.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handlePlaylistDragEnd(event)}
            >
              <SortableContext
                items={playlists.map((playlist) => playlist.id)}
                strategy={rectSortingStrategy}
              >
                <ArtistCollectionGrid>
                  {playlists.map((playlist) => (
                    <ArtistCollectionGridCard
                      key={playlist.id}
                      sortableId={playlist.id}
                      artworkUrl={playlist.cover_image_url}
                      artworkShape="wide"
                      title={playlist.name}
                      meta={`${playlist.song_ids.length} ${
                        playlist.song_ids.length === 1 ? "track" : "tracks"
                      } · ${playlist.is_public ? "Published" : "Private"}`}
                      canDrag={canManage}
                      dragDisabled={reordering}
                      actionLabel={canManage ? "Edit" : "View"}
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                    />
                  ))}
                </ArtistCollectionGrid>
              </SortableContext>
            </DndContext>
          ) : null}
        </div>
      ) : (
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
                  <div className="flex min-h-[144px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
                    Loading playlists...
                  </div>
                ) : null}
                {loadState === "error" ? (
                  <div className="flex min-h-[144px] items-center justify-center px-5 text-center text-xs text-[var(--danger)]">
                    {loadError || "Playlists could not be loaded."}
                  </div>
                ) : null}
                {loadState === "ready" && playlists.length === 0 ? (
                  <div className="flex min-h-[144px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
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
      )}
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

        <div className="px-5 pb-1 text-[11px] text-[var(--text-muted)]">
          Cover artwork is required and can be added from Playlist details after creating the playlist.
        </div>

        <div className="grid gap-4 p-5">
          <label className="block">
            <span>Playlist name</span>
            <BackendInput
              type="text"
              value={name}
              onChange={(event) =>
                setName(toSmartTitleCaseInput(event.target.value))
              }
              maxLength={180}
              disabled={!canManage || saving}
            />
          </label>

          <label className="block">
            <span>Description</span>
            <BackendTextarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={4}
              disabled={!canManage || saving}
            />
          </label>

          <BackendCheckbox
            checked={isPublic}
            onChange={setIsPublic}
            disabled={!canManage || saving}
            label="Public"
            className="h-10 w-full rounded-[7px] border border-[var(--border)] px-3"
          />
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
  onDeleted: () => void;
};

function PlaylistEditor({
  artist,
  canManage,
  playlist,
  songs,
  onBack,
  onUpdated,
  onDeleted,
}: PlaylistEditorProps) {
  const trackSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const { setQueue } = usePlayer();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description ?? "");
  const [songIds, setSongIds] = useState<string[]>(playlist.song_ids);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const songsById = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs],
  );
  const orderedSongs = songIds
    .map((songId) => songsById.get(songId))
    .filter((song): song is PlaylistSong => Boolean(song));
  const trackOrderDisabled = saving || uploadingArtwork || deleting;

  useEffect(() => {
    setQueue(
      songIds
        .map((songId) => songsById.get(songId)?.player_song)
        .filter((song): song is Song => Boolean(song?.audioUrl)),
    );
  }, [setQueue, songIds, songsById]);

  useEffect(() => {
    if (!artworkFile) {
      setArtworkPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(artworkFile);
    setArtworkPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [artworkFile]);

  function removeTrack(songId: string) {
    setSongIds((current) => current.filter((id) => id !== songId));
    setMessage("");
    setError("");
  }

  function handleTrackDragEnd(event: DragEndEvent) {
    if (!canManage || trackOrderDisabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = songIds.findIndex((songId) => songId === active.id);
    const newIndex = songIds.findIndex((songId) => songId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setSongIds((current) => arrayMove(current, oldIndex, newIndex));
    setMessage("");
    setError("");
  }

  async function savePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving || !name.trim()) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/artists/${artist.id}/playlists/${playlist.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            is_public: playlist.is_public,
            song_ids: songIds,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as PlaylistsResponse;

      if (!response.ok || !body.playlist) {
        throw new Error(body.error || "Failed to save playlist");
      }

      let updatedPlaylist = body.playlist as ArtistPlaylist;

      if (artworkFile) {
        setUploadingArtwork(true);
        const formData = new FormData();
        formData.append("file", artworkFile);

        const artworkResponse = await fetch(
          `/api/artists/${artist.id}/playlists/${playlist.id}/artwork`,
          { method: "POST", body: formData },
        );
        const artworkBody = (await artworkResponse.json().catch(() => ({}))) as PlaylistsResponse;

        if (!artworkResponse.ok || !artworkBody.playlist?.cover_image_url) {
          throw new Error(artworkBody.error || "Failed to upload playlist artwork");
        }

        updatedPlaylist = {
          ...updatedPlaylist,
          cover_image_url: artworkBody.playlist.cover_image_url,
          updated_at: artworkBody.playlist.updated_at ?? updatedPlaylist.updated_at,
        };
        setArtworkFile(null);
      }

      onUpdated(updatedPlaylist);
      setMessage("Playlist saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save playlist",
      );
    } finally {
      setUploadingArtwork(false);
      setSaving(false);
    }
  }

  async function deletePlaylist() {
    if (!canManage || saving || uploadingArtwork || deleting) return;

    const confirmed = window.confirm(
      `Delete "${playlist.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/artists/${artist.id}/playlists/${playlist.id}`,
        { method: "DELETE" },
      );
      const body = (await response.json().catch(() => ({}))) as PlaylistsResponse;

      if (!response.ok) throw new Error(body.error || "Failed to delete playlist");
      onDeleted();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete playlist",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={savePlaylist} className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={trackOrderDisabled}
          className="filmwave-backend-button filmwave-backend-button-secondary"
        >
          Back to Playlists
        </button>
        <VisibilityBadge isPublic={playlist.is_public} />
      </div>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Playlist details</h2>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[180px_minmax(0,1fr)]">
          <BackendArtworkUpload
            file={artworkFile}
            previewUrl={artworkPreviewUrl ?? playlist.cover_image_url}
            onFileChange={setArtworkFile}
            onRemove={() => setArtworkFile(null)}
            disabled={!canManage || trackOrderDisabled}
            required
            title="Cover artwork"
            dropDescription="Click to upload playlist artwork."
            variant="compact"
            compactSize={180}
            compactChooseButton
            allowRemove={Boolean(artworkFile)}
          />

          <div className="grid content-start gap-4">
            <label className="block">
              <span>Playlist name</span>
              <BackendInput
                type="text"
                value={name}
                onChange={(event) =>
                  setName(toSmartTitleCaseInput(event.target.value))
                }
                maxLength={180}
                disabled={!canManage || saving}
              />
            </label>

            <label className="block">
              <span>Description</span>
              <BackendTextarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                rows={4}
                disabled={!canManage || saving}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Track order</h2>
        </div>

        {canManage ? (
          <div className="flex border-b border-[var(--border-subtle)] p-5">
            <ArtistReleaseTrackPicker
              artistId={artist.id}
              releaseType="playlist"
              existingTrackIds={songIds}
              disabled={trackOrderDisabled}
              onAdd={(addedSongIds) => {
                setSongIds((current) => [
                  ...current,
                  ...addedSongIds.filter((songId) => !current.includes(songId)),
                ]);
                setMessage("");
                setError("");
              }}
            />
          </div>
        ) : null}

        <DndContext
          sensors={trackSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTrackDragEnd}
        >
          <SortableContext
            items={orderedSongs.map((song) => song.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={orderedSongs.length === 0 ? "" : "grid gap-2 p-5"}>
              {orderedSongs.length === 0 ? (
                <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
                  No tracks added yet.
                </div>
              ) : (
                orderedSongs.map((song) => (
                  <ArtistTrackOrderRow
                    key={song.id}
                    song={song}
                    canManage={canManage}
                    disabled={trackOrderDisabled}
                    onRemove={() => removeTrack(song.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={trackOrderDisabled}
          className="filmwave-backend-button filmwave-backend-button-secondary"
        >
          Back to Playlists
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="mr-1 min-h-5 text-xs">
            {error ? (
              <span className="text-[var(--danger)]">{error}</span>
            ) : message ? (
              <span className="text-[var(--success)]">{message}</span>
            ) : null}
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => void deletePlaylist()}
              disabled={trackOrderDisabled}
              className="filmwave-backend-button filmwave-backend-button-secondary-danger"
            >
              {deleting ? "Deleting..." : "Delete playlist"}
            </button>
          ) : null}
          {canManage ? (
            <button
              type="submit"
              disabled={trackOrderDisabled || !name.trim()}
              className="filmwave-backend-button filmwave-backend-button-primary"
            >
              {saving ? "Saving..." : "Save Playlist"}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
