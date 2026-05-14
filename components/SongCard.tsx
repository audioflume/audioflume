"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useFavorites } from "@/context/FavoritesContext";
import Waveform from "./Waveform";
import Image from "next/image";
import type { Song } from "@/lib/types";
import SongMoreDropdown from "@/components/SongMoreDropdown";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import DropdownShell from "@/components/DropdownShell";
import HeartIcon from "@/components/icons/HeartIcon";
import DownloadIcon from "@/components/icons/DownloadIcon";
import { iconButtonClass } from "@/components/uiClasses";

type StemItem = {
  name: string;
  url: string;
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getRecord(value: unknown) {
  return value as Record<string, unknown>;
}

function getStemNameFromUrl(url: string, index: number) {
  const decodedUrl = decodeURIComponent(url);
  const filename =
    decodedUrl
      .split("/")
      .pop()
      ?.replace(/\.[^/.]+$/, "") || "";

  if (filename) {
    return filename
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return `Stem ${index + 1}`;
}

function normalizeStems(value: unknown): StemItem[] {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return normalizeStems(JSON.parse(value));
    } catch {
      return value
        .split(/\n/)
        .map((url, index) => {
          const cleanUrl = url.trim();

          if (!cleanUrl || !cleanUrl.startsWith("http")) return null;

          return {
            name: getStemNameFromUrl(cleanUrl, index),
            url: cleanUrl,
          };
        })
        .filter((item): item is StemItem => Boolean(item));
    }
  }

  if (!Array.isArray(value)) return [];

  if (value.every((item) => typeof item === "string")) {
    const joined = value.join("\n").trim();

    if (joined.startsWith("[") || joined.startsWith("{")) {
      try {
        return normalizeStems(JSON.parse(joined));
      } catch {
        // Fall through to string URL parsing below.
      }
    }
  }

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();

        if (!url || !url.startsWith("http")) return null;

        return {
          name: getStemNameFromUrl(url, index),
          url,
        };
      }

      if (!item || typeof item !== "object") return null;

      const record = getRecord(item);

      const url =
        typeof record.url === "string" && record.url.trim()
          ? record.url.trim()
          : typeof record.href === "string" && record.href.trim()
            ? record.href.trim()
            : "";

      if (!url) return null;

      const name =
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : getStemNameFromUrl(url, index);

      return { name, url };
    })
    .filter((item): item is StemItem => Boolean(item));
}

function getSongStems(song: Song) {
  const record = getRecord(song);
  const fields =
    typeof record.fields === "object" && record.fields !== null
      ? getRecord(record.fields)
      : null;

  return (
    [
      normalizeStems(record.stems),
      normalizeStems(record.Stems),
      normalizeStems(record["Stem Files"]),
      normalizeStems(record.stemUrls),
      normalizeStems(record.stem_urls),
      fields ? normalizeStems(fields.stems) : [],
      fields ? normalizeStems(fields.Stems) : [],
      fields ? normalizeStems(fields["Stem Files"]) : [],
      fields ? normalizeStems(fields.stemUrls) : [],
      fields ? normalizeStems(fields.stem_urls) : [],
    ].find((items) => items.length > 0) ?? []
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5V19L19 12L8 5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 5H10.5V19H7V5Z" />
      <path d="M13.5 5H17V19H13.5V5Z" />
    </svg>
  );
}

function IconButton({
  children,
  label,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${iconButtonClass} ${
        active ? "text-[var(--text-primary)]" : ""
      }`}
    >
      {children}
    </button>
  );
}

export default function SongCard({
  song,
  isFirst = false,
  isLast = false,
  playlistId,
  onRemoveFromPlaylist,
}: {
  song: Song;
  isFirst?: boolean;
  isLast?: boolean;
  playlistId?: string;
  onRemoveFromPlaylist?: (songId: string) => void;
}) {
  const { togglePlayPause, currentSong, isPlaying } = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [cardWidth, setCardWidth] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [stemsOpen, setStemsOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const playerVisible = !!currentSong;
  const isCurrentSong = currentSong?.id === song.id;
  const actuallyPlaying = isCurrentSong && isPlaying;
  const displayIcon = actuallyPlaying ? <PauseIcon /> : <PlayIcon />;
  const showWaveform = cardWidth > 600;
  const visibleGenres = song.genres.slice(0, 3);
  const showGenreSlot = cardWidth > 1180;
  const stems = getSongStems(song);
  const hasStems = stems.length > 0;
  const favorited = isFavorite(song.id);

  async function handleRemoveFromPlaylist() {
    if (!playlistId || !onRemoveFromPlaylist) return;

    const res = await fetch(
      `/api/playlists/${encodeURIComponent(
        playlistId,
      )}/songs/${encodeURIComponent(song.id)}`,
      {
        method: "DELETE",
      },
    );

    if (!res.ok) {
      console.error("Failed to remove song from playlist");
      return;
    }

    onRemoveFromPlaylist(song.id);
    setMoreOpen(false);
  }

  const coverArtUrl =
    typeof song.coverArt === "string" && song.coverArt.trim()
      ? song.coverArt
      : null;

  useEffect(() => {
    if (!cardRef.current) return;

    const ro = new ResizeObserver((entries) => {
      setCardWidth(entries[0].contentRect.width);
    });

    ro.observe(cardRef.current);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!isCurrentSong) return;
    if (!cardRef.current) return;

    if (isFirst) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    cardRef.current.scrollIntoView({
      behavior: "smooth",
      block: isLast ? "end" : "nearest",
    });
  }, [isCurrentSong, isFirst, isLast]);

  return (
    <>
      <div
        ref={cardRef}
        className={`group flex w-full scroll-mt-48 scroll-mb-40 cursor-pointer items-center gap-4 px-8 py-4 ${
          isCurrentSong ? "bg-[var(--bg-hover)]" : ""
        }`}
        style={{
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <button
          type="button"
          className="relative h-10 w-10 flex-shrink-0 cursor-pointer overflow-hidden rounded"
          onClick={() => togglePlayPause(song)}
          aria-label={actuallyPlaying ? "Pause song" : "Play song"}
        >
          {coverArtUrl ? (
            <Image
              src={coverArtUrl}
              alt={song.title}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="h-10 w-10 bg-[var(--bg-hover)]" />
          )}

          <div
            className={`absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] text-[var(--media-overlay-contrast)] transition-opacity ${
              isCurrentSong
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isCurrentSong ? displayIcon : <PlayIcon />}
          </div>
        </button>

        <div className="flex min-w-0 max-w-[220px] flex-1 flex-col">
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">
            {song.title}
          </span>

          <span className="truncate text-xs text-[var(--text-subtle)]">
            {song.artist}
          </span>
        </div>

        {showWaveform && (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-4">
            <div className="flex w-10 flex-shrink-0 justify-center">
              {hasStems ? (
                <DropdownShell
                  open={stemsOpen}
                  onOpenChange={setStemsOpen}
                  placement="bottom-start"
                  offsetAmount={8}
                  flippedOffsetAmount={8}
                  collisionPadding={{
                    top: 163,
                    right: 16,
                    bottom: playerVisible ? 85 : 13,
                    left: 16,
                  }}
                  className="w-[168px] min-w-[168px]"
                  trigger={() => (
                    <button
                      type="button"
                      className="flex h-6 min-w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--bg-hover-strong)] px-2 text-[11px] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
                      aria-label="Show stems"
                      aria-expanded={stemsOpen}
                    >
                      +{stems.length}
                    </button>
                  )}
                >
                  {stems.map((stem) => (
                    <a
                      key={`${stem.name}-${stem.url}`}
                      href={stem.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setStemsOpen(false)}
                      className="block min-h-[38px] truncate px-3 py-2 text-[12px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                    >
                      {stem.name}
                    </a>
                  ))}
                </DropdownShell>
              ) : (
                <div className="h-6 w-8 opacity-0" />
              )}
            </div>

            <div className="w-full min-w-0">
              <Waveform song={song} />
            </div>

            <span className="flex-shrink-0 text-right text-xs text-[var(--text-secondary)]">
              {formatDuration(song.duration)}
            </span>
          </div>
        )}

        <div className="ml-auto flex min-w-0 flex-shrink-0 items-center gap-0">
          {showGenreSlot && (
            <div className="mx-8 flex w-[clamp(120px,11vw,200px)] flex-shrink-0 items-center justify-end overflow-hidden">
              <span className="line-clamp-2 text-right text-[11px] font-medium leading-[1.25] text-[var(--text-muted)]">
                {visibleGenres.length > 0 ? visibleGenres.join(", ") : ""}
              </span>
            </div>
          )}

          <div className="mr-[clamp(28px,4vw,56px)] flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span className="w-[56px] text-right">{song.key || "—"}</span>

            <span className="w-[72px] text-right tabular-nums max-[645px]:hidden">
              {song.bpm ? `${song.bpm} BPM` : "—"}
            </span>
          </div>

          <div className="flex items-center justify-end gap-0.5">
            <IconButton
              label={favorited ? "Remove song from favorites" : "Favorite song"}
              active={favorited}
              onClick={() => toggleFavorite(song)}
            >
              <HeartIcon filled={favorited} />
            </IconButton>

            <SongMoreDropdown
              open={moreOpen}
              onOpenChange={setMoreOpen}
              onAddToPlaylist={() => {
                setPlaylistModalOpen(true);
              }}
              onRemoveFromPlaylist={
                playlistId ? handleRemoveFromPlaylist : undefined
              }
              collisionPadding={{
                top: 163,
                right: 16,
                bottom: playerVisible ? 85 : 13,
                left: 16,
              }}
            />

            <IconButton label="Download song">
              <DownloadIcon />
            </IconButton>
          </div>
        </div>
      </div>

      <AddToPlaylistModal
        isOpen={playlistModalOpen}
        song={song}
        onClose={() => setPlaylistModalOpen(false)}
      />
    </>
  );
}
