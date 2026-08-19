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

import ArtistCollaboratorsEditor from "@/components/artists/ArtistCollaboratorsEditor";
import DragIconSmall from "@/components/icons/DragIconSmall";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

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

type ReleaseSong = {
  id: string;
  title: string;
  status: string;
  duration: number;
  created_at: string;
};

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

function formatDate(value: string | null) {
  if (!value) return "No release date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ReleaseStatusBadge({ status }: { status: string }) {
  return (
    <span className="filmwave-backend-status-badge bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
      {formatStatus(status)}
    </span>
  );
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
      className={`grid gap-4 px-5 py-4 sm:items-center ${
        canManage
          ? "sm:grid-cols-[28px_52px_minmax(0,1fr)_130px_110px_auto]"
          : "sm:grid-cols-[52px_minmax(0,1fr)_130px_110px_auto]"
      }`}
    >
      {canManage ? (
        <button
          type="button"
          disabled={disabled}
          className="flex h-8 w-7 cursor-grab items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Drag ${release.title} to reorder`}
          {...attributes}
          {...listeners}
        >
          <span className="inline-flex scale-x-[1.45]">
            <DragIconSmall />
          </span>
        </button>
      ) : null}

      <div className="h-[52px] w-[52px] overflow-hidden rounded-[7px] bg-[var(--bg-tertiary)]">
        {release.cover_image_url ? (
          <img
            src={release.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
          {release.title}
        </div>
        <div className="mt-1 text-[11px] text-[var(--text-muted)]">
          {formatReleaseType(release.release_type)} · {release.track_ids.length}{" "}
          {release.track_ids.length === 1 ? "track" : "tracks"}
        </div>
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        {formatDate(release.release_date)}
      </div>
      <div>
        <ReleaseStatusBadge status={release.status} />
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
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<ReleaseType>("single");
  const [createDate, setCreateDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setReleases([]);
    setSongs([]);
    setSelectedReleaseId("");
    setLoadState("loading");
    setLoadError("");
    setCreateTitle("");
    setCreateType("single");
    setCreateDate("");
    setCreateError("");
    setReorderError("");

    async function loadReleases() {
      try {
        const response = await fetch(`/api/artists/${artist.id}/releases`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

        if (!response.ok) {
          throw new Error(body.error || "Failed to load releases");
        }

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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || creating || !createTitle.trim()) return;

    try {
      setCreating(true);
      setCreateError("");

      const response = await fetch(`/api/artists/${artist.id}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          release_type: createType,
          release_date: createDate || null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

      if (!response.ok || !body.release) {
        throw new Error(body.error || "Failed to create release");
      }

      const release = body.release as ArtistRelease;
      setReleases((current) => [release, ...current]);
      setCreateTitle("");
      setCreateType("single");
      setCreateDate("");
      setSelectedReleaseId(release.id);
      onReleaseCreated();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create release",
      );
    } finally {
      setCreating(false);
    }
  }

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

      if (!response.ok) {
        throw new Error(body.error || "Failed to reorder releases");
      }
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

  return (
    <div className="grid gap-4">
      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Create release</h2>
        </div>

        <form onSubmit={handleCreate}>
          <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_180px_190px]">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Release title
              </span>
              <input
                type="text"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                maxLength={180}
                disabled={!canManage || creating}
                placeholder="Release title"
                className="filmwave-backend-input"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Type
              </span>
              <select
                value={createType}
                onChange={(event) => setCreateType(event.target.value as ReleaseType)}
                disabled={!canManage || creating}
                className="filmwave-backend-select"
              >
                {RELEASE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Release date
              </span>
              <input
                type="date"
                value={createDate}
                onChange={(event) => setCreateDate(event.target.value)}
                disabled={!canManage || creating}
                className="filmwave-backend-input"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4">
            <div className="min-h-5 text-xs">
              {createError ? (
                <span className="text-[var(--danger)]">{createError}</span>
              ) : !canManage ? (
                <span className="text-[var(--text-muted)]">
                  {artist.status !== "approved"
                    ? "Your artist profile must be approved before releases can be created."
                    : "Your artist role does not include release management."}
                </span>
              ) : null}
            </div>

            {canManage ? (
              <button
                type="submit"
                disabled={creating || !createTitle.trim()}
                className="filmwave-backend-button filmwave-backend-button-primary"
              >
                {creating ? "Creating..." : "Create release"}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Releases</h2>
        </div>

        {reorderError ? (
          <div className="px-5 pb-3 text-xs text-[var(--danger)]">
            {reorderError}
          </div>
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
                <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
                  Loading releases...
                </div>
              ) : null}

              {loadState === "error" ? (
                <div className="px-5 py-5 text-xs text-[var(--danger)]">
                  {loadError || "Releases could not be loaded."}
                </div>
              ) : null}

              {loadState === "ready" && releases.length === 0 ? (
                <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
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
    </div>
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
  const [title, setTitle] = useState(release.title);
  const [releaseType, setReleaseType] = useState<ReleaseType>(release.release_type);
  const [releaseDate, setReleaseDate] = useState(release.release_date ?? "");
  const [trackIds, setTrackIds] = useState<string[]>(release.track_ids);
  const [songToAdd, setSongToAdd] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const [artworkInputKey, setArtworkInputKey] = useState(0);
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
  const availableSongs = songs.filter((song) => !trackIds.includes(song.id));

  useEffect(() => {
    if (!artworkFile) {
      setArtworkPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(artworkFile);
    setArtworkPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [artworkFile]);

  function addTrack() {
    if (!songToAdd || !canManage) return;
    if (releaseType === "single" && trackIds.length >= 1) {
      setError("A single can contain only one track.");
      return;
    }
    setTrackIds((current) => [...current, songToAdd]);
    setSongToAdd("");
    setMessage("");
    setError("");
  }

  function removeTrack(songId: string) {
    setTrackIds((current) => current.filter((id) => id !== songId));
    setMessage("");
    setError("");
  }

  function moveTrack(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= trackIds.length) return;

    setTrackIds((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setMessage("");
    setError("");
  }

  async function saveRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving || statusChanging || !title.trim()) return;

    if (releaseType === "single" && trackIds.length > 1) {
      setError("A single can contain only one track.");
      return;
    }

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
            release_date: releaseDate || null,
            song_ids: trackIds,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

      if (!response.ok || !body.release) {
        throw new Error(body.error || "Failed to save release");
      }

      let updatedRelease = body.release as ArtistRelease;

      if (artworkFile) {
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

        updatedRelease = {
          ...updatedRelease,
          cover_image_url: artworkBody.release.cover_image_url,
          updated_at: artworkBody.release.updated_at ?? updatedRelease.updated_at,
        };
        setArtworkFile(null);
        setArtworkInputKey((current) => current + 1);
      }

      onUpdated(updatedRelease);
      setMessage("Release saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save release");
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
              release_date: releaseDate || null,
              song_ids: trackIds,
            }),
          },
        );
        const saveBody = (await saveResponse.json().catch(() => ({}))) as ReleasesResponse;

        if (!saveResponse.ok || !saveBody.release) {
          throw new Error(saveBody.error || "Failed to save release before publishing");
        }

        let savedRelease = saveBody.release as ArtistRelease;
        onUpdated(savedRelease);

        if (artworkFile) {
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

          savedRelease = {
            ...savedRelease,
            cover_image_url: artworkBody.release.cover_image_url,
            updated_at: artworkBody.release.updated_at ?? savedRelease.updated_at,
          };
          onUpdated(savedRelease);
          setArtworkFile(null);
          setArtworkInputKey((current) => current + 1);
        }
      }

      const response = await fetch(
        `/api/artists/${artist.id}/releases/${release.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            release_type: releaseType,
            release_date: releaseDate || null,
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

      const updatedRelease = body.release as ArtistRelease;
      onUpdated(updatedRelease);
      setMessage(
        action === "publish" ? "Release published." : "Release unpublished.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
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

      if (!response.ok) {
        throw new Error(body.error || "Failed to delete release");
      }

      onDeleted();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete release",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={saveRelease} className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={saving || uploadingArtwork || statusChanging || deleting}
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
          <div>
            <div className="aspect-square overflow-hidden rounded-[7px] bg-[var(--bg-tertiary)]">
              {artworkPreviewUrl || release.cover_image_url ? (
                <img
                  src={artworkPreviewUrl ?? release.cover_image_url ?? ""}
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
                  disabled={saving || uploadingArtwork || statusChanging}
                  onChange={(event) =>
                    setArtworkFile(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-[11px] text-[var(--text-muted)] file:mr-2 file:rounded-[7px] file:border file:border-[var(--border)] file:bg-[var(--bg-primary)] file:px-2.5 file:py-1.5 file:text-[11px] file:text-[var(--text-primary)]"
                />
              </div>
            ) : null}
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Release title
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                disabled={!canManage || saving || statusChanging}
                className="filmwave-backend-input"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Type
              </span>
              <select
                value={releaseType}
                onChange={(event) => setReleaseType(event.target.value as ReleaseType)}
                disabled={!canManage || saving || statusChanging}
                className="filmwave-backend-select"
              >
                {RELEASE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Release date
              </span>
              <input
                type="date"
                value={releaseDate}
                onChange={(event) => setReleaseDate(event.target.value)}
                disabled={!canManage || saving || statusChanging}
                className="filmwave-backend-input"
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
          <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] p-5">
            <select
              value={songToAdd}
              onChange={(event) => setSongToAdd(event.target.value)}
              disabled={
                statusChanging ||
                availableSongs.length === 0 ||
                (releaseType === "single" && trackIds.length >= 1)
              }
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
              disabled={!songToAdd || statusChanging}
              className="filmwave-backend-button filmwave-backend-button-secondary"
            >
              Add track
            </button>
          </div>
        ) : null}

        <div className="divide-y divide-[var(--border-subtle)]">
          {orderedTracks.length === 0 ? (
            <div className="px-5 py-5 text-xs text-[var(--text-muted)]">
              No tracks added yet.
            </div>
          ) : (
            orderedTracks.map((song, index) => (
              <div
                key={song.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[42px_minmax(0,1fr)_80px_110px_auto] sm:items-center"
              >
                <div className="text-xs font-medium text-[var(--text-muted)]">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {song.title}
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {formatDuration(Number(song.duration))}
                </div>
                <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
                  {formatStatus(song.status)}
                </div>
                {canManage ? (
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveTrack(index, -1)}
                      disabled={statusChanging || index === 0}
                      className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary min-w-8 px-2"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTrack(index, 1)}
                      disabled={statusChanging || index === orderedTracks.length - 1}
                      className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary min-w-8 px-2"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTrack(song.id)}
                      disabled={statusChanging}
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

      <div className="filmwave-backend-section flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-h-5 text-xs">
          {error ? (
            <span className="text-[var(--danger)]">{error}</span>
          ) : message ? (
            <span className="text-[var(--success)]">{message}</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={saving || uploadingArtwork || statusChanging || deleting}
            className="filmwave-backend-button filmwave-backend-button-secondary"
          >
            Back to Releases
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={() => void deleteRelease()}
              disabled={saving || uploadingArtwork || statusChanging || deleting}
              className="filmwave-backend-button filmwave-backend-button-secondary-danger"
            >
              {deleting ? "Deleting..." : "Delete release"}
            </button>
          ) : null}
          {canManage && release.status === "published" ? (
            <button
              type="button"
              onClick={() => void changeReleaseStatus("unpublish")}
              disabled={saving || uploadingArtwork || statusChanging || deleting}
              className="filmwave-backend-button filmwave-backend-button-secondary"
            >
              {statusChanging ? "Unpublishing..." : "Unpublish"}
            </button>
          ) : null}
          {canManage && release.status === "draft" ? (
            <button
              type="button"
              onClick={() => void changeReleaseStatus("publish")}
              disabled={
                saving ||
                uploadingArtwork ||
                statusChanging ||
                deleting ||
                !title.trim()
              }
              className="filmwave-backend-button filmwave-backend-button-secondary"
            >
              {statusChanging ? "Publishing..." : "Publish release"}
            </button>
          ) : null}
          {canManage ? (
            <button
              type="submit"
              disabled={saving || statusChanging || deleting || !title.trim()}
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
