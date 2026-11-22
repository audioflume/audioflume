"use client";

import { useMemo } from "react";
import { useSongs } from "@/hooks/useSongs";
import { usePlayer } from "@/context/PlayerContext";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";

const galleryPositions = [
  { x: "10%", depth: "-125px", angle: "-70deg", hoverAngle: "-43deg" },
  { x: "26%", depth: "85px", angle: "-82deg", hoverAngle: "-55deg" },
  { x: "42%", depth: "-55px", angle: "-76deg", hoverAngle: "-48deg" },
  { x: "58%", depth: "125px", angle: "84deg", hoverAngle: "56deg" },
  { x: "74%", depth: "-95px", angle: "72deg", hoverAngle: "45deg" },
  { x: "90%", depth: "45px", angle: "79deg", hoverAngle: "50deg" },
];

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
                <div
                  className="discover2-3d-song"
                  key={song.id}
                  style={{
                    "--discover2-x": galleryPositions[index].x,
                    "--discover2-depth": galleryPositions[index].depth,
                    "--discover2-turn": galleryPositions[index].angle,
                    "--discover2-hover-turn": galleryPositions[index].hoverAngle,
                  } as React.CSSProperties}
                >
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
                  <div className="discover2-3d-song-object">
                    <div className="discover2-3d-song-cover">
                      <img src={song.coverArt} alt="" loading="lazy" />
                    </div>
                    <div className="discover2-3d-song-back" aria-hidden="true" />
                    <span className="discover2-3d-song-edge" aria-hidden="true" />
                    <span className="discover2-3d-song-top" aria-hidden="true" />
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
