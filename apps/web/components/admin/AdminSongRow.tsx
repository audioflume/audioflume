"use client";

import { PremiumLabel } from "@filmwave/shared";
import type { Song } from "@/lib/types";
import Link from "next/link";
import { MouseEvent, useEffect, useMemo, useState } from "react";
import AdminSongActionsDropdown from "@/components/admin/AdminSongActionsDropdown";
import {
  BackendCheckbox,
  BackendIconButton,
  BackendStatusBadge,
} from "@/components/backend/BackendControls";
import EditIcon from "@/components/icons/EditIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import LoadingSpinner from "@/components/LoadingSpinner";
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
      style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${ring}` }}
      aria-hidden="true"
    />
  );
}

function AutoEditPointChip() {
  return (
    <span
      className="inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-[320] uppercase tracking-[0.04em]"
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
  return (
    <BackendStatusBadge>
      {issues.length === 0 ? "Complete" : issues[0]}
    </BackendStatusBadge>
  );
}

function PublishedStatusChip() {
  return <BackendStatusBadge tone="success">Published</BackendStatusBadge>;
}

function formatAddedDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function createGeneratedEditPoints(saved: number) {
  if (saved <= 0) return '{"markers":[],"ranges":[]}';

  return JSON.stringify({
    markers: Array.from({ length: saved }, (_, index) => ({
      id: `pending-${index}`,
      type: "auto",
      label: "Auto edit point",
      time: 0,
      source: "auto",
    })),
    ranges: [],
  });
}

const backendIconLinkClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border-0 bg-transparent text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";

export default function AdminSongRow({
  song,
  isLast,
  selected,
  selectionMode,
  onSelectedChange,
  onDeleted,
  showSelectionColumn = true,
  statusDisplay = "health",
  size = "default",
  showAddedDate = false,
  colorOnlyActions = false,
}: {
  song: Song;
  isLast: boolean;
  selected: boolean;
  selectionMode: boolean;
  onSelectedChange: (songId: string, checked: boolean) => void;
  onDeleted?: (songId: string) => void;
  showSelectionColumn?: boolean;
  statusDisplay?: "health" | "published";
  size?: "default" | "large";
  showAddedDate?: boolean;
  colorOnlyActions?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnalyzingEditPoints, setIsAnalyzingEditPoints] = useState(false);
  const [localEditPoints, setLocalEditPoints] = useState(song.editPoints);
  const { currentSong, isPlaying, togglePlayPause, seekTo } = usePlayer();

  const rowSong = useMemo(
    () => ({ ...song, editPoints: localEditPoints }),
    [song, localEditPoints],
  );

  const playerVisible = !!currentSong;
  const isCurrentSong = currentSong?.id === song.id;
  const rowIsPlaying = isCurrentSong && isPlaying;
  const issues = getSongIssues(rowSong).map((issue) => issue.label);
  const rowHealth = getSongHealthStatus(rowSong);
  const onlyAutoEditPoints = songHasOnlyAutoEditPoints(rowSong);
  const showPublishedStatus = statusDisplay === "published";
  const largeRow = size === "large";

  useEffect(() => {
    setLocalEditPoints(song.editPoints);
  }, [song.editPoints]);

  useEffect(() => {
    const onAnalyzingChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        songId?: string;
        analyzing?: boolean;
      }>;
      if (customEvent.detail?.songId !== song.id) return;
      setIsAnalyzingEditPoints(Boolean(customEvent.detail.analyzing));
    };

    const onEditPointsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        songId?: string;
        saved?: number;
      }>;
      if (customEvent.detail?.songId !== song.id) return;
      setLocalEditPoints(createGeneratedEditPoints(customEvent.detail.saved ?? 0));
    };

    window.addEventListener("admin-song-edit-point-analyzing", onAnalyzingChange);
    window.addEventListener("admin-song-edit-points-updated", onEditPointsUpdated);

    return () => {
      window.removeEventListener("admin-song-edit-point-analyzing", onAnalyzingChange);
      window.removeEventListener("admin-song-edit-points-updated", onEditPointsUpdated);
    };
  }, [song.id]);

  const gridColumnsClass = showSelectionColumn
    ? showPublishedStatus
      ? showAddedDate
        ? largeRow
          ? "grid-cols-[28px_60px_minmax(115px,1fr)_minmax(110px,1fr)_160px_64px_70px_96px_56px]"
          : "grid-cols-[28px_48px_minmax(180px,1.5fr)_minmax(130px,1fr)_160px_80px_80px_112px_72px]"
        : largeRow
          ? "grid-cols-[28px_68px_minmax(180px,1.5fr)_minmax(130px,1fr)_160px_80px_80px_72px]"
          : "grid-cols-[28px_48px_minmax(180px,1.5fr)_minmax(130px,1fr)_160px_80px_80px_72px]"
      : largeRow
        ? "grid-cols-[28px_68px_minmax(180px,1.5fr)_minmax(130px,1fr)_24px_160px_80px_80px_72px]"
        : "grid-cols-[28px_48px_minmax(180px,1.5fr)_minmax(130px,1fr)_24px_160px_80px_80px_72px]"
    : showPublishedStatus
      ? showAddedDate
        ? largeRow
          ? "grid-cols-[68px_minmax(160px,1.4fr)_minmax(120px,1fr)_minmax(152px,180px)_64px_76px_112px_64px]"
          : "grid-cols-[48px_minmax(160px,1.4fr)_minmax(120px,1fr)_minmax(152px,180px)_64px_76px_112px_64px]"
        : largeRow
          ? "grid-cols-[68px_minmax(160px,1.4fr)_minmax(120px,1fr)_minmax(152px,180px)_64px_76px_64px]"
          : "grid-cols-[48px_minmax(160px,1.4fr)_minmax(120px,1fr)_minmax(152px,180px)_64px_76px_64px]"
      : largeRow
        ? "grid-cols-[68px_minmax(160px,1.4fr)_minmax(120px,1fr)_24px_minmax(152px,180px)_64px_76px_64px]"
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
      className={`admin-song-row group/admin-song-row grid ${largeRow ? "min-h-[72px]" : "min-h-[46px]"} cursor-pointer ${gridColumnsClass} items-center gap-3 px-6 text-xs font-[320] transition ${
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
      style={{ borderBottom: isLast ? "none" : "1px solid var(--border-subtle)" }}
    >
      {showSelectionColumn ? (
        <div className="flex items-center" data-admin-song-checkbox>
          <BackendCheckbox
            checked={selected}
            onChange={(checked) => onSelectedChange(song.id, checked)}
            ariaLabel={`Select ${song.title}`}
            compact
            size="sm"
            className={`admin-song-select-wrap${
              selectionMode || selected ? " is-visible" : ""
            }`}
          />
        </div>
      ) : null}

      <div className="flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePlayClick();
          }}
          disabled={!song.audioUrl || isAnalyzingEditPoints}
          className={`relative ${largeRow ? "h-[52px] w-[52px]" : "h-8 w-8"} cursor-pointer overflow-hidden rounded-none bg-[var(--bg-tertiary)] disabled:cursor-default`}
          aria-label={rowIsPlaying ? "Pause song" : "Play song"}
        >
          {song.coverArt ? (
            <img src={song.coverArt} alt={song.title} className="h-full w-full object-cover" />
          ) : null}

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
        <div className="flex min-w-0 items-center gap-1.5 font-[400] leading-tight text-[var(--text-primary)]">
          <span className="min-w-0 truncate">{song.title}</span>
          {song.licenseType === "premium" ? <PremiumLabel /> : null}
        </div>
      </button>

      <div className="min-w-0 truncate text-[var(--text-subtle)]">{song.artist}</div>

      {!showPublishedStatus ? (
        <div className="flex items-center">
          <StatusDot health={rowHealth} />
        </div>
      ) : null}

      <div className="flex min-w-0 items-center gap-1.5">
        {isAnalyzingEditPoints ? (
          <BackendStatusBadge>Analyzing</BackendStatusBadge>
        ) : showPublishedStatus ? (
          <PublishedStatusChip />
        ) : (
          <StatusChip issues={issues} />
        )}
        {onlyAutoEditPoints && !isAnalyzingEditPoints ? <AutoEditPointChip /> : null}
      </div>

      <div className="text-[var(--text-secondary)]">{song.key || "—"}</div>
      <div className="text-[var(--text-secondary)]">
        {song.bpm ? `${song.bpm} BPM` : "—"}
      </div>

      {showAddedDate ? (
        <div className="text-[var(--text-secondary)]">{formatAddedDate(song.createdAt)}</div>
      ) : null}

      <div className="pointer-events-auto flex items-center justify-end gap-1" data-admin-song-menu>
        <Link
          href={`/admin/songs/${song.id}/edit`}
          className={`admin-song-edit-btn ${backendIconLinkClass}${
            colorOnlyActions ? "" : " hover:bg-[var(--bg-hover)] focus-visible:bg-[var(--bg-hover)]"
          }`}
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
          song={rowSong}
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
            <BackendIconButton
              type="button"
              active={open}
              colorOnly={colorOnlyActions}
              className="admin-song-menu-btn song-more-dropdown"
              aria-label="Song options"
              aria-expanded={open}
              disabled={isAnalyzingEditPoints}
            >
              <MoreIcon />
            </BackendIconButton>
          )}
        />
      </div>
    </div>
  );
}