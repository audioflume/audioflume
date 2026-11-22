"use client";

import { useMemo } from "react";
import { useSongs } from "@/hooks/useSongs";
import { usePlayer } from "@/context/PlayerContext";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";

export default function Discover2ThreeDSongs() {
  const { songs, loading } = useSongs();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const featuredSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl && song.coverArt)).slice(0, 6),
    [songs],
  );

  return (
    <section className="discover2-3d-songs" aria-label="Explore songs in 3D">
      <div className="discover2-3d-songs-stage">
        {loading ? (
          <div className="discover2-3d-songs-loading" aria-label="Loading music" />
        ) : (
          <div className="discover2-3d-songs-row">
            {featuredSongs.map((song, index) => {
              const active = currentSong?.id === song.id;
              const playing = active && isPlaying;
              return (
                <div className="discover2-3d-song" key={song.id}>
                  <div className="discover2-3d-song-info">
                    <span className="discover2-3d-song-title">{song.title}</span>
                    <span className="discover2-3d-song-artist">{song.artist}</span>
                  </div>
                  <button
                    type="button"
                    className={`discover2-3d-song-play${active ? " is-active" : ""}`}
                    aria-label={`${playing ? "Pause" : "Play"} ${song.title} by ${song.artist}`}
                    onClick={() => {
                      setQueue(featuredSongs);
                      togglePlayPause(song);
                    }}
                  >
                    <PlaybackStateIcon playing={playing} size={13} />
                  </button>
                  <div className="discover2-3d-song-object" style={{ "--discover2-3d-index": index } as React.CSSProperties}>
                    <div className="discover2-3d-song-cover">
                      <img src={song.coverArt} alt="" loading="lazy" />
                    </div>
                    <span className="discover2-3d-song-edge" aria-hidden="true" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
