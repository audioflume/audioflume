"use client";

import {
  type MouseEvent,
  useState,
  useSyncExternalStore,
} from "react";

import PauseIcon from "@/components/icons/PauseIcon";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import CardMiniPlayer from "@/components/playlists/CardMiniPlayer";
import CardPlayingWaveform, { cardWaveformStyles } from "@/components/playlists/CardPlayingWaveform";
import type { CuratedPlaylistSong } from "@/lib/curatedPlaylists";
import type { Song } from "@/lib/types";

import styles from "./CuratedPlaylistPlayButton.module.css";

type CuratedPlaylistPlayButtonProps = {
  playlistId: number;
  playlistName: string;
  className?: string;
  previewEnabled?: boolean;
  discoverPlaybackIcon?: boolean;
};

const playlistSongCache = new Map<string, CuratedPlaylistSong[]>();
const playlistSongRequests = new Map<
  string,
  Promise<CuratedPlaylistSong[]>
>();
const activePlaylistListeners = new Set<() => void>();
let activePlaylistId: string | null = null;
let openCardPlaylistId: string | null = null;
const openCardListeners = new Set<() => void>();
function subscribeOpenCard(listener: () => void) {
  openCardListeners.add(listener);
  return () => {
    openCardListeners.delete(listener);
    if (openCardListeners.size === 0) openCardPlaylistId = null;
  };
}
function getOpenCardPlaylistId() { return openCardPlaylistId; }
function setOpenCardPlaylistId(id: string | null) {
  if (openCardPlaylistId === id) return;
  openCardPlaylistId = id;
  openCardListeners.forEach((listener) => listener());
}

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
  previewEnabled = false,
  discoverPlaybackIcon = true,
}: CuratedPlaylistPlayButtonProps) {
  const { currentSong, isPlaying, setQueue, togglePlayPause, seekTo } = usePlayer();
  const [loading, setLoading] = useState(false);
  const playlistKey = String(playlistId);
  const activeId = useSyncExternalStore(
    subscribeToActivePlaylist,
    getActivePlaylistId,
    () => null,
  );
  const previewOpenId = useSyncExternalStore(subscribeOpenCard, getOpenCardPlaylistId, () => null);
  const previewOpen = previewEnabled && previewOpenId === playlistKey;
  const cachedSongs = playlistSongCache.get(playlistKey) ?? [];
  const playableSongs = cachedSongs.filter((song) => Boolean(song.audioUrl));
  const currentSongBelongsToPlaylist = Boolean(
    currentSong && cachedSongs.some((song) => song.id === currentSong.id),
  );
  const isCurrentPlaylist =
    activeId === playlistKey && currentSongBelongsToPlaylist;
  const isPlaylistPlaying = isCurrentPlaylist && isPlaying;

  function playPreviewSong(song: Song) {
    setQueue(playableSongs);
    setActivePlaylistId(playlistKey);
    togglePlayPause(song);
  }

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.detail > 0) event.currentTarget.blur();
    if (loading) return;

    if (previewEnabled) {
      setOpenCardPlaylistId(playlistKey);
      if (isCurrentPlaylist && currentSong) return;
      if (isPlaying && currentSong) togglePlayPause(currentSong);
    } else if (isCurrentPlaylist && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    setLoading(true);

    try {
      const songs = await loadPlaylistSongs(playlistKey);
      const playableSongs = songs.filter((song) => Boolean(song.audioUrl));
      if (previewEnabled) return;
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
    <>
      <button
        type="button"
        className={previewEnabled ? cardWaveformStyles.cardPlayButton : `${styles.button} curated-playlist-play-button ${className}`.trim()}
        onClick={handleClick}
        disabled={loading || previewOpen}
        aria-label={previewEnabled ? `Open song preview for ${playlistName}` : `${isPlaylistPlaying ? "Pause" : "Play"} ${playlistName}`}
        aria-expanded={previewEnabled ? previewOpen : undefined}
        data-preview-open={previewOpen ? "true" : undefined}
        data-playlist-playing={isPlaylistPlaying ? "true" : "false"}
        aria-pressed={isPlaylistPlaying}
        aria-busy={loading}
      >
        {discoverPlaybackIcon ? (
          <PlaybackStateIcon playing={isPlaylistPlaying} size={previewEnabled ? 15 : 18} hoverIcon={previewEnabled && !previewOpen ? "list" : "pause"} />
        ) : previewEnabled && isPlaylistPlaying ? (
          <CardPlayingWaveform />
        ) : isPlaylistPlaying && !previewEnabled ? (
          <PauseIcon size={18} />
        ) : (
          <PlayIconSmall size={previewEnabled ? 15 : 18} />
        )}
      </button>
      {previewEnabled && isPlaylistPlaying && !previewOpen ? (
        <CardPlayingWaveform corner label={`${playlistName} is playing`} />
      ) : null}
      {previewOpen ? (
        <CardMiniPlayer
          artistName={playlistName}
          trackCount={playableSongs.length}
          songs={playableSongs}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          discoverPlaybackIcon={discoverPlaybackIcon}
          onPlay={playPreviewSong}
          onSeek={(song, progress) => seekTo(song, progress, Boolean(isPlaying && currentSong?.id === song.id))}
          onClose={() => setOpenCardPlaylistId(null)}
        />
      ) : null}
    </>
  );
}
