"use client";

import Link from "next/link";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import HeartIcon from "@/components/icons/HeartIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import type { PlaylistViewMode } from "@/context/UserPreferencesContext";
import { useSongs } from "@/hooks/useSongs";
import styles from "./FavoritesPlaylistTile.module.css";

function formatTrackCount(count: number) {
  return `${count} track${count === 1 ? "" : "s"}`;
}

export default function FavoritesPlaylistTile({
  viewMode,
}: {
  viewMode: PlaylistViewMode;
}) {
  const { favoriteIds } = useFavorites();
  const { songs } = useSongs();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const activeSongIds = new Set(songs.map((song) => song.id));
  const activeFavoriteCount = favoriteIds.filter((songId) =>
    activeSongIds.has(songId),
  ).length;
  const trackCount = formatTrackCount(activeFavoriteCount);
  const favoriteSongs = songs.filter(
    (song) => favoriteIds.includes(song.id) && Boolean(song.audioUrl),
  );
  const currentSongIsFavorite = Boolean(
    currentSong && favoriteIds.includes(currentSong.id),
  );
  const favoritesPlaying = currentSongIsFavorite && isPlaying;

  function toggleFavoritesPlayback(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.detail > 0) event.currentTarget.blur();

    if (currentSongIsFavorite && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    const firstSong = favoriteSongs[0];
    if (!firstSong) return;

    setQueue(favoriteSongs);
    togglePlayPause(firstSong);
  }

  if (viewMode === "list") {
    return (
      <div className="playlist-index-row-shell">
        <Link href="/favorites" className="playlist-index-row">
          <div className="playlist-row-number" aria-hidden="true" />
          <div className={`playlist-row-cover ${styles.rowCover}`}>
            <div className={styles.rowCoverSurface}>
              <HeartIcon size={18} filled />
            </div>
          </div>
          <div className="playlist-row-main">
            <span>Favorites</span>
            <small>Saved tracks</small>
          </div>
          <div className="playlist-row-count filmwave-list-row-count">
            {trackCount}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="playlist-gallery-card">
      <Link href="/favorites" className="playlist-gallery-link">
        <div className="playlist-gallery-art-wrap">
          <div className={`playlist-gallery-art ${styles.art}`}>
            <div className={styles.icon}>
              <HeartIcon size={42} filled />
            </div>
          </div>
          <div className="playlist-gallery-top-row">
            <div className="playlist-gallery-arrow">
              <ArrowUpRightIcon />
            </div>
          </div>
          <div className="playlist-gallery-content">
            <h3>Favorites</h3>
            <p>{trackCount}</p>
          </div>
        </div>
      </Link>
      <button
        type="button"
        className={styles.playButton}
        onClick={toggleFavoritesPlayback}
        disabled={favoriteSongs.length === 0}
        data-playlist-playing={favoritesPlaying ? "true" : "false"}
        aria-label={`${favoritesPlaying ? "Pause" : "Play"} Favorites`}
        aria-pressed={favoritesPlaying}
      >
        {favoritesPlaying ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
      </button>
    </div>
  );
}
