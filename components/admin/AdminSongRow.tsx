"use client";

import type { Song } from "@/lib/types";
import Link from "next/link";
import { MouseEvent, useState } from "react";
import AdminSongActionsDropdown from "@/components/admin/AdminSongActionsDropdown";
import MoreIcon from "@/components/icons/MoreIcon";
import {
  iconButtonActiveClass,
  smallIconButtonClass,
} from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";
import {
  getSongHealthStatus,
  getSongIssues,
  type SongHealthStatus,
} from "@/lib/songHealth";

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20H8.25L19.5 8.75C20.3284 7.92157 20.3284 6.57843 19.5 5.75L18.25 4.5C17.4216 3.67157 16.0784 3.67157 15.25 4.5L4 15.75V20Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 5.75L18.25 10"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5V19L19 12L8 5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 5H10V19H7V5Z" />
      <path d="M14 5H17V19H14V5Z" />
    </svg>
  );
}

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
  const { currentSong, isPlaying, togglePlayPause, seekTo } = usePlayer();

  const playerVisible = !!currentSong;
  const isCurrentSong = currentSong?.id === song.id;
  const rowIsPlaying = isCurrentSong && isPlaying;
  const issues = getSongIssues(song).map((issue) => issue.label);
  const rowHealth = getSongHealthStatus(song);

  const gridColumnsClass = showSelectionColumn
    ? "grid-cols-[28px_48px_minmax(180px,1.5fr)_minmax(130px,1fr)_24px_120px_80px_80px_72px]"
    : "grid-cols-[48px_minmax(160px,1.4fr)_minmax(120px,1fr)_24px_minmax(112px,140px)_64px_76px_64px]";

  const handlePlayClick = () => {
    if (!song.audioUrl) return;

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
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M20 6L9 17L4 12"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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
          disabled={!song.audioUrl}
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

          <span
            className={`absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] text-[var(--media-overlay-contrast)] transition ${
              isCurrentSong
                ? "opacity-100"
                : "opacity-0 group-hover/admin-song-row:opacity-100"
            }`}
          >
            {rowIsPlaying ? <PauseIcon /> : <PlayIcon />}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handlePlayClick();
        }}
        disabled={!song.audioUrl}
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

      <div>
        <StatusChip issues={issues} />
      </div>

      <div className="text-[var(--text-secondary)]">{song.key || "—"}</div>

      <div className="text-[var(--text-secondary)]">
        {song.bpm ? `${song.bpm} BPM` : "—"}
      </div>

      <div className="flex items-center justify-end gap-1" data-admin-song-menu>
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
            >
              <MoreIcon />
            </button>
          )}
        />
      </div>
    </div>
  );
}
