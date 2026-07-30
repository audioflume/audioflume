"use client";

import {
  type MouseEvent,
  useState,
  useSyncExternalStore,
} from "react";

import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { CuratedPlaylistSong } from "@/lib/curatedPlaylists";

import styles from "./CuratedPlaylistPlayButton.module.css";

type CuratedPlaylistPlayButtonProps = {
  playlistId: number;
  playlistName: string;
  className?: string;
};

const playlistSongCache = new Map<string, CuratedPlaylistSong[]>();
const playlistSongRequests = new Map<
  string,
  Promise<CuratedPlaylistSong[]>
>();
const activePlaylistListeners = new Set<() => void>();
let activePlaylistId: string | null = null;

function subscribeToActivePlaylist(listener: () => void) {
  activePlaylistListeners.add(listener);
  return () => activePlaylistListeners.delete(listener);
}

function getActivePlaylistId() {
  return activePlaylistId;
}

function setActivePlaylistId(playlistId: string) {
  if (activePlaylistId === playlistId) return;

  activePlaylistId = playlistId;
  activePlaylistListeners.forEach((listener) => listener());
}

async function loadPlaylistSongs(playlistId: string) {
  const cachedSongs = playlistSongCache.get(playlistId);
  if (cachedSongs) return cachedSongs;

  const pendingRequest = playlistSongRequests.get(playlistId);
  if (pendingRequest) return pendingRequest;

  const request = fetch(
    `/api/curated-playlists/${encodeURIComponent(playlistId)}/songs`,
  )
    .then(async (response) => {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load playlist songs");
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid playlist songs response");
      }

      const songs = data as CuratedPlaylistSong[];
      playlistSongCache.set(playlistId, songs);
      return songs;
    })
    .finally(() => {
      playlistSongRequests.delete(playlistId);
    });

  playlistSongRequests.set(playlistId, request);
  return request;
}

export default function CuratedPlaylistPlayButton({
  playlistId,
  playlistName,
  className = "",
}: CuratedPlaylistPlayButtonProps) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const [loading, setLoading] = useState(false);
  const playlistKey = String(playlistId);
  const activeId = useSyncExternalStore(
    subscribeToActivePlaylist,
    getActivePlaylistId,
    () => null,
  );
  const cachedSongs = playlistSongCache.get(playlistKey) ?? [];
  const currentSongBelongsToPlaylist = Boolean(
    currentSong && cachedSongs.some((song) => song.id === currentSong.id),
  );
  const isCurrentPlaylist =
    activeId === playlistKey && currentSongBelongsToPlaylist;
  const isPlaylistPlaying = isCurrentPlaylist && isPlaying;

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (loading) return;

    if (isCurrentPlaylist && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    setLoading(true);

    try {
      const songs = await loadPlaylistSongs(playlistKey);
      const playableSongs = songs.filter((song) => Boolean(song.audioUrl));
      const firstSong = playableSongs[0];

      if (!firstSong) return;

      setQueue(playableSongs);
      setActivePlaylistId(playlistKey);
      togglePlayPause(firstSong);
    } catch (error) {
      console.warn("Curated playlist card playback failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`${styles.button} curated-playlist-play-button ${className}`.trim()}
      onClick={handleClick}
      disabled={loading}
      data-playlist-playing={isPlaylistPlaying ? "true" : "false"}
      aria-label={`${isPlaylistPlaying ? "Pause" : "Play"} ${playlistName}`}
      aria-pressed={isPlaylistPlaying}
      aria-busy={loading}
    >
      {isPlaylistPlaying ? (
        <PauseIcon size={14} />
      ) : (
        <PlayIconSmall size={14} />
      )}
    </button>
  );
}
