"use client";

import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { useIsCurrentSongPlaying, usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

export default function PricingOriginalsShelf({ songs }: { songs: Song[] }) {
  const { togglePlayPause } = usePlayer();

  return (
    <div className="audioflume-pricing-originals-grid">
      {songs.map((song) => (
        <PricingOriginalSongCard
          key={song.id}
          song={song}
          onToggle={() => togglePlayPause(song)}
        />
      ))}
    </div>
  );
}

function PricingOriginalSongCard({
  song,
  onToggle,
}: {
  song: Song;
  onToggle: () => void;
}) {
  const playing = useIsCurrentSongPlaying(song.id);

  return (
    <article
      className={`audioflume-pricing-originals-card${playing ? " is-playing" : ""}`}
    >
      <button
        type="button"
        className="audioflume-pricing-originals-art"
        onClick={onToggle}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {song.coverArt ? (
          <img src={song.coverArt} alt="" draggable={false} />
        ) : (
          <span
            className="audioflume-pricing-originals-art-fallback"
            aria-hidden="true"
          />
        )}
        <span className="audioflume-pricing-originals-play-icon" aria-hidden="true">
          {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
        </span>
      </button>

      <div className="audioflume-pricing-originals-copy">
        <strong>{song.title}</strong>
        <span>{song.artist}</span>
      </div>
    </article>
  );
}
