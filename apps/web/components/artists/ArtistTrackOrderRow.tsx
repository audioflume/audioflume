"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PremiumLabel } from "@filmwave/shared";

import BackendDragHandle from "@/components/backend/BackendDragHandle";
import { BackendMediaThumbnail, BackendRowTitle } from "@/components/backend/BackendRow";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

export type ArtistTrackOrderSong = {
  id: string;
  title: string;
  status: string;
  duration: number;
  bpm: number | null;
  key: string | null;
  cover_url: string | null;
  created_at: string;
  player_song?: Song;
};

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ArtistTrackOrderRow({
  song,
  canManage,
  disabled,
  onRemove,
}: {
  song: ArtistTrackOrderSong;
  canManage: boolean;
  disabled: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: !canManage || disabled });
  const { currentSong, isPlaying, togglePlayPause, seekTo } = usePlayer();
  const playerSong = song.player_song;
  const isCurrentSong = currentSong?.id === song.id;
  const rowIsPlaying = isCurrentSong && isPlaying;

  function handlePlayClick() {
    if (!playerSong?.audioUrl) return;
    if (isCurrentSong) {
      togglePlayPause(playerSong);
      return;
    }
    seekTo(playerSong, 0, currentSong ? isPlaying : true);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 2 : "auto",
      }}
      className={`grid gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] p-2 sm:items-center ${
        canManage
          ? "sm:grid-cols-[28px_44px_minmax(0,1fr)_70px_70px_70px_auto]"
          : "sm:grid-cols-[44px_minmax(0,1fr)_70px_70px_70px]"
      }`}
    >
      {canManage ? (
        <BackendDragHandle
          disabled={disabled}
          aria-label={`Drag ${song.title} to reorder`}
          {...attributes}
          {...listeners}
        />
      ) : null}

      <button
        type="button"
        onClick={handlePlayClick}
        disabled={!playerSong?.audioUrl}
        className="group/artist-playlist-thumb relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-[6px] bg-[var(--bg-tertiary)] disabled:cursor-default"
        style={{ "--filmwave-song-card-play-size": "32px" } as React.CSSProperties}
        aria-label={rowIsPlaying ? "Pause song" : "Play song"}
      >
        <BackendMediaThumbnail src={song.cover_url} size={40} className="rounded-[6px]" />
        {playerSong?.audioUrl ? (
          <span
            className={`absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] transition ${
              isCurrentSong
                ? "opacity-100"
                : "opacity-0 group-hover/artist-playlist-thumb:opacity-100"
            }`}
          >
            <span className="filmwave-song-play-button">
              {rowIsPlaying ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />}
            </span>
          </span>
        ) : null}
      </button>
      <BackendRowTitle>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate">{song.title}</span>
          {playerSong?.licenseType === "premium" ? <PremiumLabel /> : null}
        </span>
      </BackendRowTitle>
      <div className="text-xs text-[var(--text-muted)]">
        {formatDuration(Number(song.duration))}
      </div>
      <div className="text-xs text-[var(--text-muted)]">{song.key || "—"}</div>
      <div className="text-xs text-[var(--text-muted)]">
        {song.bpm ? `${song.bpm} BPM` : "—"}
      </div>
      {canManage ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}