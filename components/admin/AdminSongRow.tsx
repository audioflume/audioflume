"use client";

import type { Song } from "@/lib/types";
import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";
import AdminSongActionsDropdown from "@/components/admin/AdminSongActionsDropdown";
import CheckIcon from "@/components/icons/CheckIcon";
import EditIcon from "@/components/icons/EditIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  iconButtonActiveClass,
  smallIconButtonClass,
} from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";
import {
  getSongHealthStatus,
  getSongIssues,
  songHasOnlyAutoEditPoints,
  type SongHealthStatus,
} from "@/lib/songHealth";

function StatusDot({ health }: { health: SongHealthStatus }) {
  const color =
    health === "success"
      ? "var(--status-success, #48b571)"
      : health === "warning"
        ? "var(--status-warning, #d9a441)"
        : "var(--status-error, #dc584f)";

  const ring =
    health === "success"
      ? "var(--status-success-soft, rgba(72, 181, 113, 0.12))"
      : health === "warning"
        ? "var(--status-warning-soft, rgba(217, 164, 65, 0.12))"
        : "var(--status-error-soft, rgba(220, 88, 79, 0.12))";

  return (
    <span
      className="block h-2 w-2 rounded-full"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 0 3px ${ring}`,
      }}
      aria-hidden="true"
    />
  );
}

function AutoEditPointChip() {
  return (
    <span
      className="inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold uppercase tracking-[0.04em]"
      style={{
        borderColor: "rgba(251, 143, 97, 0.35)",
        backgroundColor: "rgba(251, 143, 97, 0.1)",
        color: "#fb8f61",
      }}
    >
      Auto
    </span>
  );
}

function StatusChip({ issues }: { issues: string[] }) {
  if (issues.length === 0) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[var(--bg-tertiary)] px-2.5 text-[11px] font-medium text-[var(--text-primary)]">
        Complete
      </span>
    );
  }

  return (
    <span className="inline-flex h-6 items-center rounded-full bg-[var(--bg-tertiary)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)]">
      {issues[0]}
    </span>
  );
}

export default function AdminSongRow({
  song,
  isLast,
  selected,
  selectionMode,
  onSelectedChange,
  onDeleted,
  showSelectionColumn = true,
}: {
  song: Song;
  isLast: boolean;
  selected: boolean;
  selectionMode: boolean;
  onSelectedChange: (songId: string, checked: boolean) => void;
  onDeleted?: (songId: string) => void;
  showSelectionColumn?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnalyzingEditPoints, setIsAnalyzingEditPoints] = useState(false);
  const { currentSong, isPlaying, togglePlayPause, seekTo } = usePlayer();

  const playerVisible = !!currentSong;
  const isCurrentSong = currentSong?.id === song.id;
  const rowIsPlaying = isCurrentSong && isPlaying;
  const issues = getSongIssues(song).map((issue) => issue.label);
  const rowHealth = getSongHealthStatus(song);
  const onlyAutoEditPoints = songHasOnlyAutoEditPoints(song);

  useEffect(() => {
    const onAnalyzingChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        songId?: string;
        analyzing?: boolean;
      }>;

      if (customEvent.detail?.songId !== song.id) return;

      setIsAnalyzingEditPoints(Boolean(customEvent.detail.analyzing));
    };

    window.addEventListener(
      "admin-song-edit-point-analyzing",
      onAnalyzingChange,
    );

    return () => {
      window.removeEventListener(
        "admin-song-edit-point-analyzing",
        onAnalyzingChange,
      );
    };
  }, [song.id]);

  const gridColumnsClass = showSelectionColumn
    ? "grid-cols-[28px_48px_minmax(180px,1.5fr)_minmax(130px,1fr)_24px_160px_80px_80px_72px]"
    : "grid-cols-[48px_minmax(160px,1.4fr)_minmax(120px,1fr)_24px_minmax(152px,180px)_64px_76px_64px]";

  const handlePlayClick = () => {
    if (!song.audioUrl || isAnalyzingEditPoints) return;

    if (isCurrentSong) {
      togglePlayPause(song);
      return;
    }

    seekTo(song, 0, currentSong ? isPlaying : true);
  };

  const handleRowClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (
      target.closest("[data-admin-song-menu]") ||
      target.closest("[data-admin-song-checkbox]")
    ) {
      return;
    }

    handlePlayClick();
  };

  return (
    <div
      data-admin-song-id={song.id}
      onClick={handleRowClick}
      className={`admin-song-row group/admin-song-row grid min-h-[46px] cursor-pointer ${gridColumnsClass} items-center gap-3 px-6 text-xs transition ${
        rowHealth === "error" ? "is-error" : ""
      } ${rowHealth === "warning" ? "is-warning" : ""} ${
        isAnalyzingEditPoints ? "pointer-events-none opacity-45" : ""
      } ${
        selected
          ? "bg-[var(--bg-hover-strong)]"
          : isCurrentSong
            ? "bg-[var(--bg-hover)]"
            : ""
      }`}
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
      }}
    >
      {showSelectionColumn && (
        <div className="flex items-center" data-admin-song-checkbox>
          <label
            className={`admin-song-select-wrap${
              selectionMode || selected ? " is-visible" : ""
            }`}
            aria-label={`Select ${song.title}`}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectedChange(song.id, e.target.checked)}
              className="admin-song-select-input"
            />

            <span className="admin-song-select-box">
              <CheckIcon size={11} strokeWidth={3} />
            </span>
          </label>
        </div>
      )}

      <div className="flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePlayClick();
          }}
          disabled={!song.audioUrl || isAnalyzingEditPoints}
          className="relative h-8 w-8 cursor-pointer overflow-hidden rounded bg-[var(--bg-tertiary)] disabled:cursor-default"
          aria-label={rowIsPlaying ? "Pause song" : "Play song"}
        >
          {song.coverArt && (
            <img
              src={song.coverArt}
              alt={song.title}
              className="h-full w-full object-cover"
            />
          )}

          {isAnalyzingEditPoints ? (
            <span className="absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] text-[var(--media-overlay-contrast)]">
              <LoadingSpinner size={14} stroke={10} color="currentColor" />
            </span>
          ) : (
            <span
              className={`absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] text-[var(--media-overlay-contrast)] transition ${
                isCurrentSong
                  ? "opacity-100"
                  : "opacity-0 group-hover/admin-song-row:opacity-100"
              }`}
            >
              {rowIsPlaying ? <PauseIcon /> : <PlayIconSmall />}
            </span>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handlePlayClick();
        }}
        disabled={!song.audioUrl || isAnalyzingEditPoints}
        className="min-w-0 cursor-pointer text-left disabled:cursor-default"
      >
        <div className="truncate font-medium leading-tight text-[var(--text-primary)]">
          {song.title}
        </div>
      </button>

      <div className="min-w-0 truncate text-[var(--text-subtle)]">
        {song.artist}
      </div>

      <div className="flex items-center">
        <StatusDot health={rowHealth} />
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        {isAnalyzingEditPoints ? (
          <span className="inline-flex h-6 items-center rounded-full bg-[var(--bg-tertiary)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)]">
            Analyzing
          </span>
        ) : (
          <StatusChip issues={issues} />
        )}
        {onlyAutoEditPoints && !isAnalyzingEditPoints && <AutoEditPointChip />}
      </div>

      <div className="text-[var(--text-secondary)]">{song.key || "—"}</div>

      <div className="text-[var(--text-secondary)]">
        {song.bpm ? `${song.bpm} BPM` : "—"}
      </div>

      <div className="flex items-center justify-end gap-1 pointer-events-auto" data-admin-song-menu>
        <Link
          href={`/admin/songs/${song.id}/edit`}
          className={`admin-song-edit-btn ${smallIconButtonClass}`}
          aria-label={`Edit ${song.title}`}
          onClick={(e) => e.stopPropagation()}
        >
          <EditIcon />
        </Link>

        <AdminSongActionsDropdown
          open={menuOpen}
          onOpenChange={setMenuOpen}
          songId={song.id}
          songTitle={song.title}
          audioUrl={song.audioUrl}
          song={song}
          onDeleted={onDeleted}
          placement="bottom-end"
          className="song-more-dropdown"
          offsetAmount={6}
          flippedOffsetAmount={6}
          collisionPadding={{
            top: 116,
            right: 16,
            bottom: playerVisible ? 85 : 13,
            left: 16,
          }}
          trigger={({ open }) => (
            <button
              type="button"
              className={`admin-song-menu-btn ${smallIconButtonClass} ${
                open ? `is-open ${iconButtonActiveClass}` : ""
              }`}
              aria-label="Song options"
              aria-expanded={open}
              disabled={isAnalyzingEditPoints}
            >
              <MoreIcon />
            </button>
          )}
        />
      </div>
    </div>
  );
}
