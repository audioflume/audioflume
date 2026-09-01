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

import ArtistCollaboratorsEditor from "@/components/artists/ArtistCollaboratorsEditor";
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
  BackendInput,
  BackendSelect,
  BackendStatusBadge,
} from "@/components/backend/BackendControls";
import BackendDragHandle from "@/components/backend/BackendDragHandle";
import { BackendMediaThumbnail, BackendRowTitle } from "@/components/backend/BackendRow";
import PlusIcon from "@/components/icons/PlusIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";
import type { Song } from "@/lib/types";

type ReleaseType = "single" | "ep" | "album";

type ArtistRelease = {
  id: string;
  title: string;
  release_type: ReleaseType;
  cover_image_url: string | null;
  release_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  track_ids: string[];
};

type ReleaseSong = ArtistTrackOrderSong;

type ReleasesResponse = {
  releases?: ArtistRelease[];
  release?: ArtistRelease | (Partial<ArtistRelease> & { id: string });
  release_ids?: string[];
  songs?: ReleaseSong[];
  error?: string;
};

type ArtistReleaseManagerProps = {
  artist: ArtistDashboardProfile;
  onReleaseCreated: () => void;
};

const RELEASE_TYPES: { value: ReleaseType; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Album" },
];

function formatReleaseType(type: ReleaseType) {
  return RELEASE_TYPES.find((item) => item.value === type)?.label ?? type;
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getReleaseYear(value: string | null) {
  if (!value) return "";
  const match = value.match(/^(\d{4})/);
  return match?.[1] ?? "";
}

function formatReleaseYear(value: string | null) {
  return getReleaseYear(value) || "No release year";
}

function normalizeYearInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function releaseYearToDate(value: string) {
  if (!value) return null;
  if (!/^\d{4}$/.test(value)) return undefined;
  return `${value}-01-01`;
}

function ReleaseStatusBadge({
  status,
  light = false,
}: {
  status: string;
  light?: boolean;
}) {
  const label = formatStatus(status);

  if (status === "published" && !light) {
    return (
      <span
        className="filmwave-backend-status-badge text-[var(--text-secondary)]"
        style={{
          background:
            "color-mix(in srgb, var(--text-primary) 10%, var(--bg-tertiary))",
        }}
      >
        {label}
      </span>
    );
  }

  return <BackendStatusBadge>{label}</BackendStatusBadge>;
}

function SortableReleaseRow({
  release,
  canManage,
  disabled,
  onEdit,
}: {
  release: ArtistRelease;
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
  } = useSortable({ id: release.id, disabled: !canManage || disabled });

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
          ? "min-[480px]:grid-cols-[28px_52px_minmax(0,1fr)_130px_110px_auto]"
          : "min-[480px]:grid-cols-[52px_minmax(0,1fr)_130px_110px_auto]"
      }`}
    >
      {canManage ? (
        <BackendDragHandle
          disabled={disabled}
          aria-label={`Drag ${release.title} to reorder`}
          {...attributes}
          {...listeners}
        />
      ) : null}

      <BackendMediaThumbnail
        src={release.cover_image_url}
        size={52}
        className="rounded-[7px]"
      />
      <BackendRowTitle
        secondary={`${formatReleaseType(release.release_type)} · ${release.track_ids.length} ${release.track_ids.length === 1 ? "track" : "tracks"}`}
      >
        {release.title}
      </BackendRowTitle>
      <div className="text-xs text-[var(--text-muted)]">
        {formatReleaseYear(release.release_date)}
      </div>
      <div>
        <ReleaseStatusBadge status={release.status} light />
      </div>
      <div className="flex justify-end">
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

export default function ArtistReleaseManager({
  artist,
  onReleaseCreated,
}: ArtistReleaseManagerProps) {
  const canManage =
    artist.status === "approved" && artist.permissions.includes("release:manage");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [releases, setReleases] = useState<ArtistRelease[]>([]);
  const [songs, setSongs] = useState<ReleaseSong[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState("");
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [creating, setCreating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");
  const [viewMode, setViewMode] = useState<ArtistCollectionViewMode>("grid");

  useEffect(() => {
    let cancelled = false;

    setReleases([]);
    setSongs([]);
    setSelectedReleaseId("");
    setCreating(false);
    setLoadState("loading");
    setLoadError("");
    setReorderError("");

    async function loadReleases() {
      try {
        const response = await fetch(`/api/artists/${artist.id}/releases`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

        if (!response.ok) throw new Error(body.error || "Failed to load releases");

        if (!cancelled) {
          setReleases(Array.isArray(body.releases) ? body.releases : []);
          setSongs(Array.isArray(body.songs) ? body.songs : []);
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load releases",
          );
          setLoadState("error");
        }
      }
    }

    void loadReleases();
    return () => {
      cancelled = true;
    };
  }, [artist.id]);

  async function handleReleaseDragEnd(event: DragEndEvent) {
    if (!canManage || reordering) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = releases.findIndex((release) => release.id === active.id);
    const newIndex = releases.findIndex((release) => release.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = releases;
    const reordered = arrayMove(releases, oldIndex, newIndex);
    setReleases(reordered);
    setReorderError("");

    try {
      setReordering(true);
      const response = await fetch(`/api/artists/${artist.id}/releases`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          release_ids: reordered.map((release) => release.id),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

      if (!response.ok) throw new Error(body.error || "Failed to reorder releases");
    } catch (error) {
      setReleases(previous);
      setReorderError(
        error instanceof Error ? error.message : "Failed to reorder releases",
      );
    } finally {
      setReordering(false);
    }
  }

  const selectedRelease = releases.find(
    (release) => release.id === selectedReleaseId,
  );

  if (selectedRelease) {
    return (
      <div className="grid gap-4">
        <ReleaseEditor
          artist={artist}
          canManage={canManage}
          release={selectedRelease}
          songs={songs}
          onBack={() => setSelectedReleaseId("")}
          onUpdated={(updatedRelease) =>
            setReleases((current) =>
              current.map((release) =>
                release.id === updatedRelease.id ? updatedRelease : release,
              ),
            )
          }
          onDeleted={() => {
            setReleases((current) =>
              current.filter((release) => release.id !== selectedRelease.id),
            );
            setSelectedReleaseId("");
          }}
        />
        <ArtistCollaboratorsEditor
          artistId={artist.id}
          resourceType="release"
          resourceId={selectedRelease.id}
          canEdit={canManage}
        />
      </div>
    );
  }

  if (creating) {
    return (
      <CreateRelease
        artist={artist}
        canManage={canManage}
        songs={songs}
        onBack={() => setCreating(false)}
        onCreated={(release) => {
          setReleases((current) => [release, ...current]);
          setCreating(false);
          onReleaseCreated();
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
            New Release
          </button>
        ) : null}
      </div>

      {viewMode === "grid" ? (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="filmwave-backend-section-title">Releases</h2>
          </div>

          {reorderError ? (
            <div className="pb-3 text-xs text-[var(--danger)]">{reorderError}</div>
          ) : null}

          {loadState === "loading" ? (
            <div className="flex min-h-[144px] items-center justify-center text-xs text-[var(--text-muted)]">
              Loading releases...
            </div>
          ) : null}
          {loadState === "error" ? (
            <div className="flex min-h-[144px] items-center justify-center text-center text-xs text-[var(--danger)]">
              {loadError || "Releases could not be loaded."}
            </div>
          ) : null}
          {loadState === "ready" && releases.length === 0 ? (
            <div className="flex min-h-[144px] items-center justify-center text-xs text-[var(--text-muted)]">
              No releases created yet.
            </div>
          ) : null}
          {loadState === "ready" && releases.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handleReleaseDragEnd(event)}
            >
              <SortableContext
                items={releases.map((release) => release.id)}
                strategy={rectSortingStrategy}
              >
                <ArtistCollectionGrid>
                  {releases.map((release) => {
                    const releaseYear = getReleaseYear(release.release_date);
                    return (
                      <ArtistCollectionGridCard
                        key={release.id}
                        sortableId={release.id}
                        artworkUrl={release.cover_image_url}
                        artworkShape="square"
                        title={release.title}
                        meta={`${formatReleaseType(release.release_type)} · ${
                          release.track_ids.length
                        } ${release.track_ids.length === 1 ? "track" : "tracks"}${
                          releaseYear ? ` · ${releaseYear}` : ""
                        } · ${formatStatus(release.status)}`}
                        canDrag={canManage}
                        dragDisabled={reordering}
                        actionLabel={canManage ? "Edit" : "View"}
                        onClick={() => setSelectedReleaseId(release.id)}
                      />
                    );
                  })}
                </ArtistCollectionGrid>
              </SortableContext>
            </DndContext>
          ) : null}
        </div>
      ) : (
        <section className="filmwave-backend-section">
          <div className="filmwave-backend-section-header">
            <h2 className="filmwave-backend-section-title">Releases</h2>
          </div>

          {reorderError ? (
            <div className="px-5 pb-3 text-xs text-[var(--danger)]">{reorderError}</div>
          ) : null}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => void handleReleaseDragEnd(event)}
          >
            <SortableContext
              items={releases.map((release) => release.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-[var(--border-subtle)]">
                {loadState === "loading" ? (
                  <div className="flex min-h-[144px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
                    Loading releases...
                  </div>
                ) : null}
                {loadState === "error" ? (
                  <div className="flex min-h-[144px] items-center justify-center px-5 text-center text-xs text-[var(--danger)]">
                    {loadError || "Releases could not be loaded."}
                  </div>
                ) : null}
                {loadState === "ready" && releases.length === 0 ? (
                  <div className="flex min-h-[144px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
                    No releases created yet.
                  </div>
                ) : null}
                {releases.map((release) => (
                  <SortableReleaseRow
                    key={release.id}
                    release={release}
                    canManage={canManage}
                    disabled={reordering}
                    onEdit={() => setSelectedReleaseId(release.id)}
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

type CreateReleaseProps = {
  artist: ArtistDashboardProfile;
  canManage: boolean;
  songs: ReleaseSong[];
  onBack: () => void;
  onCreated: (release: ArtistRelease) => void;
};

function CreateRelease({
  artist,
  canManage,
  songs,
  onBack,
  onCreated,
}: CreateReleaseProps) {
  const trackSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const { setQueue } = usePlayer();
  const [title, setTitle] = useState("");
  const [releaseType, setReleaseType] = useState<ReleaseType>("single");
  const [releaseYear, setReleaseYear] = useState("");
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const songsById = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs],
  );
  const orderedTracks = trackIds
    .map((songId) => songsById.get(songId))
    .filter((song): song is ReleaseSong => Boolean(song));

  useEffect(() => {
    setQueue(
      trackIds
        .map((songId) => songsById.get(songId)?.player_song)
        .filter((song): song is Song => Boolean(song?.audioUrl)),
    );
  }, [setQueue, trackIds, songsById]);

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
    setTrackIds((current) => current.filter((id) => id !== songId));
    setError("");
  }

  function handleTrackDragEnd(event: DragEndEvent) {
    if (!canManage || saving) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = trackIds.findIndex((songId) => songId === active.id);
    const newIndex = trackIds.findIndex((songId) => songId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setTrackIds((current) => arrayMove(current, oldIndex, newIndex));
    setError("");
  }

  async function createRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving || !title.trim()) return;

    if (releaseType === "single" && trackIds.length > 1) {
      setError("A single can contain only one track.");
      return;
    }

    const releaseDate = releaseYearToDate(releaseYear);
    if (releaseDate === undefined) {
      setError("Enter a valid four-digit release year.");
      return;
    }

    let createdReleaseId = "";

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/artists/${artist.id}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          release_type: releaseType,
          release_date: releaseDate,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

      if (!response.ok || !body.release) {
        throw new Error(body.error || "Failed to create release");
      }

      createdReleaseId = body.release.id;
      let createdRelease = body.release as ArtistRelease;

      if (trackIds.length > 0) {
        const tracksResponse = await fetch(
          `/api/artists/${artist.id}/releases/${createdReleaseId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              release_type: releaseType,
              release_date: releaseDate,
              song_ids: trackIds,
            }),
          },
        );
        const tracksBody = (await tracksResponse
          .json()
          .catch(() => ({}))) as ReleasesResponse;

        if (!tracksResponse.ok || !tracksBody.release) {
          throw new Error(tracksBody.error || "Failed to add release tracks");
        }

        createdRelease = tracksBody.release as ArtistRelease;
      }

      if (artworkFile) {
        const formData = new FormData();
        formData.append("file", artworkFile);
        const artworkResponse = await fetch(
          `/api/artists/${artist.id}/releases/${createdReleaseId}/artwork`,
          { method: "POST", body: formData },
        );
        const artworkBody = (await artworkResponse
          .json()
          .catch(() => ({}))) as ReleasesResponse;

        if (!artworkResponse.ok || !artworkBody.release?.cover_image_url) {
          throw new Error(artworkBody.error || "Failed to upload release artwork");
        }

        createdRelease = {
          ...createdRelease,
          cover_image_url: artworkBody.release.cover_image_url,
          updated_at: artworkBody.release.updated_at ?? createdRelease.updated_at,
        };
      }

      onCreated({ ...createdRelease, track_ids: trackIds });
    } catch (createError) {
      if (createdReleaseId) {
        await fetch(`/api/artists/${artist.id}/releases/${createdReleaseId}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      setError(
        createError instanceof Error ? createError.message : "Failed to create release",
      );
    } finally {
      setSaving(false);
    }
  }

  const yearValid = !releaseYear || /^\d{4}$/.test(releaseYear);

  return (
    <form onSubmit={createRelease} className="grid gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={saving}
        className="filmwave-backend-button filmwave-backend-button-secondary w-fit"
      >
        Back to Releases
      </button>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">New release</h2>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[180px_minmax(0,1fr)]">
          <BackendArtworkUpload
            file={artworkFile}
            previewUrl={artworkPreviewUrl}
            onFileChange={setArtworkFile}
            onRemove={() => setArtworkFile(null)}
            disabled={!canManage || saving}
            required
            title="Cover artwork"
            dropDescription="Click to upload release artwork."
            variant="compact"
            compactSize={180}
            compactChooseButton
            allowRemove={Boolean(artworkFile)}
          />

          <div className="grid content-start gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span>Release title</span>
              <BackendInput
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                disabled={!canManage || saving}
                placeholder="Release title"
              />
            </label>

            <label className="block">
              <span>Type</span>
              <BackendSelect
                value={releaseType}
                onChange={(event) => setReleaseType(event.target.value as ReleaseType)}
                disabled={!canManage || saving}
              >
                {RELEASE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </BackendSelect>
            </label>

            <label className="block">
              <span>Year</span>
              <BackendInput
                type="text"
                inputMode="numeric"
                value={releaseYear}
                onChange={(event) => setReleaseYear(normalizeYearInput(event.target.value))}
                maxLength={4}
                disabled={!canManage || saving}
                placeholder="Year"
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
              releaseType={releaseType}
              existingTrackIds={trackIds}
              disabled={saving}
              onAdd={(songIds) => {
                setTrackIds((current) => [
                  ...current,
                  ...songIds.filter((songId) => !current.includes(songId)),
                ]);
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
            items={orderedTracks.map((song) => song.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={orderedTracks.length === 0 ? "" : "grid gap-2 p-5"}>
              {orderedTracks.length === 0 ? (
                <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
                  No tracks added yet.
                </div>
              ) : (
                orderedTracks.map((song) => (
                  <ArtistTrackOrderRow
                    key={song.id}
                    song={song}
                    canManage={canManage}
                    disabled={saving}
                    onRemove={() => removeTrack(song.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div className="min-h-5 text-xs text-[var(--danger)]">{error}</div>
        <button
          type="submit"
          disabled={!canManage || saving || !title.trim() || !yearValid}
          className="filmwave-backend-button filmwave-backend-button-primary"
        >
          {saving ? "Creating..." : "Create Release"}
        </button>
      </div>
    </form>
  );
}

type ReleaseEditorProps = {
  artist: ArtistDashboardProfile;
  canManage: boolean;
  release: ArtistRelease;
  songs: ReleaseSong[];
  onBack: () => void;
  onUpdated: (release: ArtistRelease) => void;
  onDeleted: () => void;
};

function ReleaseEditor({
  artist,
  canManage,
  release,
  songs,
  onBack,
  onUpdated,
  onDeleted,
}: ReleaseEditorProps) {
  const trackSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const { setQueue } = usePlayer();
  const [title, setTitle] = useState(release.title);
  const [releaseType, setReleaseType] = useState<ReleaseType>(release.release_type);
  const [releaseYear, setReleaseYear] = useState(getReleaseYear(release.release_date));
  const [trackIds, setTrackIds] = useState<string[]>(release.track_ids);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const songsById = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs],
  );
  const orderedTracks = trackIds
    .map((songId) => songsById.get(songId))
    .filter((song): song is ReleaseSong => Boolean(song));

  useEffect(() => {
    setQueue(
      trackIds
        .map((songId) => songsById.get(songId)?.player_song)
        .filter((song): song is Song => Boolean(song?.audioUrl)),
    );
  }, [setQueue, trackIds, songsById]);

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
    setTrackIds((current) => current.filter((id) => id !== songId));
    setMessage("");
    setError("");
  }

  function handleTrackDragEnd(event: DragEndEvent) {
    if (!canManage || saving || uploadingArtwork || statusChanging || deleting) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = trackIds.findIndex((songId) => songId === active.id);
    const newIndex = trackIds.findIndex((songId) => songId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setTrackIds((current) => arrayMove(current, oldIndex, newIndex));
    setMessage("");
    setError("");
  }

  async function uploadArtworkIfNeeded(updatedRelease: ArtistRelease) {
    if (!artworkFile) return updatedRelease;

    setUploadingArtwork(true);
    const formData = new FormData();
    formData.append("file", artworkFile);
    const artworkResponse = await fetch(
      `/api/artists/${artist.id}/releases/${release.id}/artwork`,
      { method: "POST", body: formData },
    );
    const artworkBody = (await artworkResponse.json().catch(() => ({}))) as ReleasesResponse;

    if (!artworkResponse.ok || !artworkBody.release?.cover_image_url) {
      throw new Error(artworkBody.error || "Failed to upload release artwork");
    }

    const nextRelease = {
      ...updatedRelease,
      cover_image_url: artworkBody.release.cover_image_url,
      updated_at: artworkBody.release.updated_at ?? updatedRelease.updated_at,
    };
    setArtworkFile(null);
    return nextRelease;
  }

  function getReleaseDatePayload() {
    const releaseDate = releaseYearToDate(releaseYear);
    if (releaseDate === undefined) {
      setError("Enter a valid four-digit release year.");
      return undefined;
    }
    return releaseDate;
  }

  async function saveRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving || statusChanging || !title.trim()) return;

    if (releaseType === "single" && trackIds.length > 1) {
      setError("A single can contain only one track.");
      return;
    }

    const releaseDate = getReleaseDatePayload();
    if (releaseDate === undefined) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/artists/${artist.id}/releases/${release.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            release_type: releaseType,
            release_date: releaseDate,
            song_ids: trackIds,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

      if (!response.ok || !body.release) {
        throw new Error(body.error || "Failed to save release");
      }

      const updatedRelease = await uploadArtworkIfNeeded(body.release as ArtistRelease);
      onUpdated(updatedRelease);
      setMessage("Release saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save release",
      );
    } finally {
      setUploadingArtwork(false);
      setSaving(false);
    }
  }

  async function changeReleaseStatus(action: "publish" | "unpublish") {
    if (!canManage || saving || statusChanging || !title.trim()) return;

    if (releaseType === "single" && trackIds.length > 1) {
      setError("A single can contain only one track.");
      return;
    }

    if (action === "publish" && !release.cover_image_url && !artworkFile) {
      setError("Cover artwork is required before publishing a release.");
      return;
    }

    const releaseDate = getReleaseDatePayload();
    if (releaseDate === undefined) return;

    try {
      setStatusChanging(true);
      setError("");
      setMessage("");

      if (action === "publish") {
        const saveResponse = await fetch(
          `/api/artists/${artist.id}/releases/${release.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              release_type: releaseType,
              release_date: releaseDate,
              song_ids: trackIds,
            }),
          },
        );
        const saveBody = (await saveResponse.json().catch(() => ({}))) as ReleasesResponse;
        if (!saveResponse.ok || !saveBody.release) {
          throw new Error(saveBody.error || "Failed to save release before publishing");
        }

        const savedRelease = await uploadArtworkIfNeeded(saveBody.release as ArtistRelease);
        onUpdated(savedRelease);
      }

      const response = await fetch(
        `/api/artists/${artist.id}/releases/${release.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            release_type: releaseType,
            release_date: releaseDate,
            song_ids: trackIds,
            action,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

      if (!response.ok || !body.release) {
        throw new Error(
          body.error ||
            (action === "publish"
              ? "Failed to publish release"
              : "Failed to unpublish release"),
        );
      }

      onUpdated(body.release as ArtistRelease);
      setMessage(
        action === "publish" ? "Release published." : "Release unpublished.",
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : action === "publish"
            ? "Failed to publish release"
            : "Failed to unpublish release",
      );
    } finally {
      setUploadingArtwork(false);
      setStatusChanging(false);
    }
  }

  async function deleteRelease() {
    if (!canManage || saving || uploadingArtwork || statusChanging || deleting) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${release.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/artists/${artist.id}/releases/${release.id}`,
        { method: "DELETE" },
      );
      const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

      if (!response.ok) throw new Error(body.error || "Failed to delete release");
      onDeleted();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete release",
      );
    } finally {
      setDeleting(false);
    }
  }

  const trackOrderDisabled =
    saving || uploadingArtwork || statusChanging || deleting;
  const yearValid = !releaseYear || /^\d{4}$/.test(releaseYear);

  return (
    <form onSubmit={saveRelease} className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={trackOrderDisabled}
          className="filmwave-backend-button filmwave-backend-button-secondary"
        >
          Back to Releases
        </button>
        <ReleaseStatusBadge status={release.status} />
      </div>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Release details</h2>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[180px_minmax(0,1fr)]">
          <BackendArtworkUpload
            file={artworkFile}
            previewUrl={artworkPreviewUrl ?? release.cover_image_url}
            onFileChange={setArtworkFile}
            onRemove={() => setArtworkFile(null)}
            disabled={!canManage || saving || uploadingArtwork || statusChanging}
            required
            title="Cover artwork"
            dropDescription="Click to upload release artwork."
            variant="compact"
            compactSize={180}
            compactChooseButton
            allowRemove={Boolean(artworkFile)}
          />

          <div className="grid content-start gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span>Release title</span>
              <BackendInput
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                disabled={!canManage || saving || statusChanging}
              />
            </label>

            <label className="block">
              <span>Type</span>
              <BackendSelect
                value={releaseType}
                onChange={(event) => setReleaseType(event.target.value as ReleaseType)}
                disabled={!canManage || saving || statusChanging}
              >
                {RELEASE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </BackendSelect>
            </label>

            <label className="block">
              <span>Year</span>
              <BackendInput
                type="text"
                inputMode="numeric"
                value={releaseYear}
                onChange={(event) => setReleaseYear(normalizeYearInput(event.target.value))}
                maxLength={4}
                disabled={!canManage || saving || statusChanging}
                placeholder="Year"
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
              releaseType={releaseType}
              existingTrackIds={trackIds}
              disabled={trackOrderDisabled}
              onAdd={(songIds) => {
                setTrackIds((current) => [
                  ...current,
                  ...songIds.filter((songId) => !current.includes(songId)),
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
            items={orderedTracks.map((song) => song.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={orderedTracks.length === 0 ? "" : "grid gap-2 p-5"}>
              {orderedTracks.length === 0 ? (
                <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
                  No tracks added yet.
                </div>
              ) : (
                orderedTracks.map((song) => (
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
          Back to Releases
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
              onClick={() => void deleteRelease()}
              disabled={trackOrderDisabled}
              className="filmwave-backend-button filmwave-backend-button-secondary-danger"
            >
              {deleting ? "Deleting..." : "Delete release"}
            </button>
          ) : null}
          {canManage && release.status === "published" ? (
            <button
              type="button"
              onClick={() => void changeReleaseStatus("unpublish")}
              disabled={trackOrderDisabled}
              className="filmwave-backend-button filmwave-backend-button-secondary"
            >
              {statusChanging ? "Unpublishing..." : "Unpublish"}
            </button>
          ) : null}
          {canManage && release.status === "draft" ? (
            <button
              type="button"
              onClick={() => void changeReleaseStatus("publish")}
              disabled={trackOrderDisabled || !title.trim() || !yearValid}
              className="filmwave-backend-button filmwave-backend-button-secondary"
            >
              {statusChanging ? "Publishing..." : "Publish release"}
            </button>
          ) : null}
          {canManage ? (
            <button
              type="submit"
              disabled={saving || statusChanging || deleting || !title.trim() || !yearValid}
              className="filmwave-backend-button filmwave-backend-button-primary"
            >
              {saving ? "Saving..." : "Save release"}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
