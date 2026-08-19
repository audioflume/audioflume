"use client";

import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

export default function ArtistFeaturePlayControl({ songs }: { songs: Song[] }) {
  const { setQueue, togglePlayPause } = usePlayer();
  const playableSongs = songs.filter((song) => song.audioUrl);
  const firstSong = playableSongs[0];

  if (!firstSong) return null;

  return (
    <button
      type="button"
      className="artist-public-feature-listen"
      onClick={() => {
        setQueue(playableSongs);
        togglePlayPause(firstSong);
      }}
      aria-label={`Play ${firstSong.title}`}
    >
      <span className="artist-public-feature-listen-label">Listen now</span>
      <span className="artist-public-feature-play-badge" aria-hidden="true">
        <PlayIconSmall size={18} />
      </span>
    </button>
  );
}
