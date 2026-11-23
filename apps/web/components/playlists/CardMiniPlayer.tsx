"use client";

import { useState } from "react";
import XIcon from "@/components/icons/XIcon";
import DownloadIcon from "@/components/icons/DownloadIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import HeartIcon from "@/components/icons/HeartIcon";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import styles from "./CardMiniPlayer.module.css";

function formatPreviewDuration(seconds: number | undefined) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function CardMiniPlayer({
  artistName,
  trackCount,
  songs,
  currentSongId,
  isPlaying,
  onPlay,
  onSeek,
  onClose,
  discoverPlaybackIcon = true,
  wideHero = false,
}: {
  artistName: string;
  trackCount: number;
  songs: Song[];
  currentSongId?: string;
  isPlaying?: boolean;
  onPlay?: (song: Song) => void;
  onSeek?: (song: Song, progress: number) => void;
  onClose?: () => void;
  discoverPlaybackIcon?: boolean;
  wideHero?: boolean;
}) {
  const { currentTime, duration } = usePlayerProgress();
  const { repeatSongId, toggleRepeatSong } = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  async function licenseSong(song: Song) {
    try {
      const response = await fetch(`/api/songs/${encodeURIComponent(song.id)}/download`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data?.downloadUrl) {
        console.error("Failed to prepare song download", data);
        return;
      }
      window.open(String(data.downloadUrl), "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to download song", error);
    }
  }

  const [previewIndex, setPreviewIndex] = useState(0);
  const previews = songs;
  const index = Math.min(previewIndex, Math.max(0, previews.length - 1));
  const activeSongIndex = previews.findIndex((preview) => preview.id === currentSongId);
  const listIndex = activeSongIndex >= 0 ? activeSongIndex : index;
  const listSong = previews[listIndex];
  const listPlaying = Boolean(listSong && currentSongId === listSong.id && isPlaying);
  const listProgress = listSong && currentSongId === listSong.id && duration > 0
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;

  return (
    <div className={`${styles.miniPlayer}${wideHero ? ` ${styles.miniPlayerWideHero}` : ""}`} aria-label={`Preview music by ${artistName}`}>
      {onClose ? (
        <button
          type="button"
          className={styles.miniPlayerClose}
          aria-label={`Close ${artistName} song preview`}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <XIcon size={18} strokeWidth={1.4} />
        </button>
      ) : null}
      <div className={styles.miniPlayerUpper}>
        <div className={styles.miniPlayerArt}>
          {listSong?.coverArt ? <img src={listSong.coverArt} alt="" draggable={false} /> : null}
        </div>
        <div className={styles.miniPlayerSongInfo}>
          <span className={styles.miniPlayerSongTitle}>{listSong?.title ?? "No preview available"}</span>
          {listSong ? <span className={styles.miniPlayerSongDuration}>{formatPreviewDuration(listSong.duration)}</span> : null}
        </div>
      </div>
      <div className={styles.miniPlayerCompactSongs} aria-label={`Songs by ${artistName}`} tabIndex={0}>
        {Array.from({ length: Math.max(3, Math.ceil(songs.length / 3)) }, (_, groupIndex) => (
          <div className={styles.miniPlayerCompactPage} key={groupIndex}>
            {Array.from({ length: 3 }, (_, rowIndex) => {
              const songIndex = groupIndex * 3 + rowIndex;
              const previewSong = songs[songIndex];
              if (!previewSong) {
                return (
                  <div className={`${styles.miniPlayerCompactRow} ${styles.miniPlayerCompactPlaceholder}`} key={`preview-${songIndex}`}>
                    <span className={styles.miniPlayerCompactCover} />
                    <span className={styles.miniPlayerCompactTitle}>Preview track {songIndex + 1}</span>
                    <PlayIconSmall size={12} />
                  </div>
                );
              }
              const active = currentSongId === previewSong.id;
              return (
                <div className={styles.miniPlayerCompactRow} key={previewSong.id}>
                  <button
                    type="button"
                    className={styles.miniPlayerCompactPlayTarget}
                    aria-label={`${active && isPlaying ? "Pause" : "Play"} ${previewSong.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviewIndex(songIndex);
                      onPlay?.(previewSong);
                    }}
                  >
                    <span className={styles.miniPlayerCompactCover}>
                      {previewSong.coverArt ? <img src={previewSong.coverArt} alt="" draggable={false} /> : null}
                    </span>
                    <span className={styles.miniPlayerCompactTitle}>{previewSong.title}</span>
                    {wideHero ? <span className={styles.miniPlayerCompactArtist}>{previewSong.artist || artistName}</span> : null}
                    <span className={styles.miniPlayerCompactDuration}>{formatPreviewDuration(previewSong.duration)}</span>
                    {discoverPlaybackIcon ? <PlaybackStateIcon playing={Boolean(active && isPlaying)} size={12} /> : active && isPlaying ? <PauseIcon size={12} /> : <PlayIconSmall size={12} />}
                  </button>
                  <button
                    type="button"
                    className={styles.miniPlayerCompactLicense}
                    aria-label={`License ${previewSong.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void licenseSong(previewSong);
                    }}
                  >
                    <span>License</span>
                    <DownloadIcon size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.miniPlayerListFooter}>
        <div className={styles.miniPlayerListControls}>
          <button
            type="button"
            className={styles.miniPlayerExtraControl}
            aria-label={listSong && isFavorite(listSong.id) ? `Remove ${listSong.title} from favorites` : listSong ? `Favorite ${listSong.title}` : "No song to favorite"}
            aria-pressed={Boolean(listSong && isFavorite(listSong.id))}
            disabled={!listSong}
            onClick={(event) => {
              event.stopPropagation();
              if (listSong) toggleFavorite(listSong);
            }}
          >
            <HeartIcon filled={Boolean(listSong && isFavorite(listSong.id))} />
          </button>
          <button
            type="button"
            className={styles.miniPlayerSkip}
            aria-label={`Previous song from ${artistName}`}
            disabled={previews.length < 2}
            onClick={(event) => {
              event.stopPropagation();
              const nextIndex = (listIndex - 1 + previews.length) % previews.length;
              setPreviewIndex(nextIndex);
              onPlay?.(previews[nextIndex]);
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path d="M5 5h2v14H5zM19 5v14L8 12z" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.miniPlayerListPlay}
            aria-label={listSong ? `${listPlaying ? "Pause" : "Play"} ${listSong.title}` : "No preview available"}
            disabled={!listSong}
            onClick={(event) => {
              event.stopPropagation();
              if (listSong) onPlay?.(listSong);
            }}
          >
            {discoverPlaybackIcon ? <PlaybackStateIcon playing={listPlaying} size={15} /> : listPlaying ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />}
          </button>
          <button
            type="button"
            className={styles.miniPlayerSkip}
            aria-label={`Next song from ${artistName}`}
            disabled={previews.length < 2}
            onClick={(event) => {
              event.stopPropagation();
              const nextIndex = (listIndex + 1) % previews.length;
              setPreviewIndex(nextIndex);
              onPlay?.(previews[nextIndex]);
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path d="M17 5h2v14h-2zM5 5l11 7-11 7z" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.miniPlayerExtraControl}
            aria-label={listSong && repeatSongId === listSong.id ? `Turn off repeat for ${listSong.title}` : listSong ? `Repeat ${listSong.title}` : "No song to repeat"}
            aria-pressed={Boolean(listSong && repeatSongId === listSong.id)}
            disabled={!listSong}
            onClick={(event) => {
              event.stopPropagation();
              if (listSong) toggleRepeatSong(listSong.id);
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11V9a3 3 0 0 1 3-3h15" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v2a3 3 0 0 1-3 3H3" />
              <path d="M11 10.5l2-1v6" />
            </svg>
          </button>
        </div>
        <input
          type="range"
          className={styles.miniPlayerListProgress}
          min={0}
          max={100}
          step={0.1}
          value={listProgress}
          disabled={!listSong}
          aria-label={listSong ? `Seek within ${listSong.title}` : "No song to seek"}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            if (listSong) onSeek?.(listSong, Number(event.target.value) / 100);
          }}
        />
        <span className={styles.miniPlayerListCount}>{trackCount} {trackCount === 1 ? "song" : "songs"}</span>
      </div>
    </div>
  );
}

