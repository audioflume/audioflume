"use client";

import { useEffect, useState } from "react";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import ArtistReleaseTrackPicker from "@/components/artists/ArtistReleaseTrackPicker";
import { PlaylistManagerCollapsibleSection } from "@/components/admin/AdminPlaylistManagerShared";
import { BackendMediaThumbnail } from "@/components/backend/BackendRow";
import { BackendDragHandleGlyph } from "@/components/backend/BackendDragHandle";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

type FeaturedSongItem = {
  song_id: string;
  position: number;
  song: Song;
};

function SortableSong({ item, index, disabled, onRemove }: {
  item: FeaturedSongItem;
  index: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.song_id, disabled });
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const isCurrentSong = currentSong?.id === item.song.id;
  const actuallyPlaying = isCurrentSong && isPlaying;

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}
      className="group flex min-w-0 cursor-grab items-center gap-2 py-2 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="relative h-8 w-6 shrink-0">
        <span className="flex h-full w-full items-center justify-center text-[11px] tabular-nums text-[var(--text-muted)] transition-opacity duration-150 group-hover:opacity-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <BackendDragHandleGlyph />
        </span>
      </div>
      <button
        type="button"
        onClick={() => togglePlayPause(item.song)}
        onKeyDown={(event) => event.stopPropagation()}
        disabled={!item.song.audioUrl}
        className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden bg-[var(--bg-tertiary)]"
        style={{ "--filmwave-song-card-play-size": "30px" } as React.CSSProperties}
        aria-label={actuallyPlaying ? `Pause ${item.song.title}` : `Play ${item.song.title}`}
      >
        <BackendMediaThumbnail
          src={item.song.coverArt}
          alt={item.song.title}
          size={48}
        />
        <span
          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
            isCurrentSong ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          aria-hidden="true"
        >
          <span className="filmwave-song-play-button">
            {actuallyPlaying ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
          </span>
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {item.song.title}
        </h4>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
          {item.song.artist}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={onRemove}
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-lg font-light leading-none text-[var(--text-secondary)] opacity-0 transition-[opacity,color] duration-150 hover:text-[var(--danger)] group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
        aria-label={`Remove ${item.song.title} from Featured Songs`}
        title="Remove from Featured Songs"
      >
        ×
      </button>
    </article>
  );
}

export default function AdminDiscoverFeaturedSongsView() {
  const [items, setItems] = useState<FeaturedSongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function refresh() {
    const response = await fetch("/api/admin/discover-featured-songs", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Failed to load featured songs");
    setItems(Array.isArray(body.items) ? body.items : []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/discover-featured-songs", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Failed to load featured songs");
        if (!cancelled) setItems(Array.isArray(body.items) ? body.items : []);
      })
      .catch((error) => {
        if (!cancelled) setError(error instanceof Error ? error.message : "Failed to load featured songs");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function addSongs(songIds: string[]) {
    if (saving || songIds.length === 0) return;
    try {
      setSaving(true);
      setError("");
      const response = await fetch("/api/admin/discover-featured-songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_ids: songIds }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to add songs");
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add songs");
    } finally {
      setSaving(false);
    }
  }

  async function removeSong(songId: string) {
    if (saving) return;
    try {
      setSaving(true);
      setError("");
      const response = await fetch("/api/admin/discover-featured-songs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: songId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to remove song");
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to remove song");
    } finally {
      setSaving(false);
    }
  }

  async function reorderSongs(event: DragEndEvent) {
    if (saving || !event.over || event.active.id === event.over.id) return;
    const oldIndex = items.findIndex((item) => item.song_id === String(event.active.id));
    const newIndex = items.findIndex((item) => item.song_id === String(event.over?.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try {
      setSaving(true);
      setError("");
      const response = await fetch("/api/admin/discover-featured-songs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_ids: next.map((item) => item.song_id) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to reorder songs");
    } catch (error) {
      setItems(previous);
      setError(error instanceof Error ? error.message : "Failed to reorder songs");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PlaylistManagerCollapsibleSection
      title="Featured Songs"
      subtitle={`${items.length} song${items.length === 1 ? "" : "s"}`}
      collapsed={collapsed}
      onToggle={() => setCollapsed((current) => !current)}
      wrapHeader
      wrapActions
      actions={
        <ArtistReleaseTrackPicker
          artistId=""
          releaseType="playlist"
          songsUrl="/api/admin/discover-featured-songs?picker=1"
          buttonLabel="Add"
          existingTrackIds={items.map((item) => item.song_id)}
          disabled={saving || loading}
          onAdd={(songIds) => void addSongs(songIds)}
        />
      }
    >
      {error ? <p className="mb-3 text-xs text-[var(--danger)]">{error}</p> : null}
      {loading ? (
        <div className="min-h-[120px] animate-pulse bg-[var(--bg-tertiary)]" />
      ) : items.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center border-[1.25px] border-dashed border-[var(--border)] px-6 text-center text-xs text-[var(--text-secondary)]">
          Add published songs to the Discover featured songs section.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void reorderSongs(event)}>
          <SortableContext items={items.map((item) => item.song_id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-x-5 gap-y-0 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => (
                <SortableSong
                  key={item.song_id}
                  item={item}
                  index={index}
                  disabled={saving}
                  onRemove={() => void removeSong(item.song_id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </PlaylistManagerCollapsibleSection>
  );
}
