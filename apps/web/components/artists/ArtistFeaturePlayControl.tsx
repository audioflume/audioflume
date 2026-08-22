"use client";

import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

export default function ArtistFeaturePlayControl({ songs }: { songs: Song[] }) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const playableSongs = songs.filter((song) => song.audioUrl);
  const firstSong = playableSongs[0];
  const artistIsPlaying = Boolean(
    isPlaying &&
      currentSong &&
      playableSongs.some((song) => song.id === currentSong.id),
  );

  if (!firstSong) return null;

  return (
    <button
      type="button"
      className="artist-public-feature-listen"
      onClick={() => {
        if (artistIsPlaying && currentSong) {
          togglePlayPause(currentSong);
          return;
        }

        setQueue(playableSongs);
        togglePlayPause(firstSong);
      }}
      aria-label={
        artistIsPlaying && currentSong
          ? `Pause ${currentSong.title}`
          : `Play ${firstSong.title}`
      }
    >
      <span className="artist-public-feature-listen-label">Listen now</span>
      <span className="artist-public-feature-play-badge" aria-hidden="true">
        {artistIsPlaying ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
      </span>
    </button>
  );
}
