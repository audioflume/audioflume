"use client";

import { useMemo } from "react";
import { useSongs } from "@/hooks/useSongs";
import { usePlayer } from "@/context/PlayerContext";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import type { Song } from "@/lib/types";

function Discover2CompactSong({
  song,
  queue,
  presentation,
  index,
}: {
  song: Song;
  queue: Song[];
  presentation?: "gallery" | "numbered" | "collage";
  index?: number;
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;

  function playSong() {
    if (!song.audioUrl) return;
    setQueue(queue);
    togglePlayPause(song);
  }

  return (
    <button
      type="button"
      className={`discover2-compact-song${active ? " is-active" : ""}${presentation ? ` is-${presentation}` : ""}`}
      onClick={playSong}
      disabled={!song.audioUrl}
      aria-label={`${playing ? "Pause" : "Play"} ${song.title} by ${song.artist}`}
    >
      {presentation === "numbered" && index !== undefined ? (
        <span className="discover2-experiment-track-number" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      ) : null}
      <span className="discover2-compact-song-art">
        {song.coverArt ? <img src={song.coverArt} alt="" loading="lazy" /> : null}
        <span className="filmwave-song-play-overlay">
          <span className="filmwave-song-play-button">
            <PlaybackStateIcon playing={playing} size={15} />
          </span>
        </span>
      </span>
      <span className="discover2-compact-song-copy">
        <span className="discover2-compact-song-title">{song.title}</span>
        <span className="discover2-compact-song-artist">{song.artist}</span>
      </span>
    </button>
  );
}

export default function Discover2SongBlocks({ beforePlaylists = false }: { beforePlaylists?: boolean }) {
  const { songs, loading } = useSongs();
  const recentSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)).slice(0, 12),
    [songs],
  );

  return (
    <>
    <section className={`discover2-song-section${beforePlaylists ? " is-before-playlists" : ""}`} aria-label="Featured tracks">
      {beforePlaylists ? <h2 className="discover2-song-section-title">Tracks made for storytelling.</h2> : null}
      {!beforePlaylists ? (
      <h2 className="discover2-song-intro">Discover a thoughtfully curated collection of human-made music, crafted to bring stories to life.</h2>
      ) : null}
      {loading ? (
        <div className="discover2-song-grid" aria-label="Loading tracks">
          {Array.from({ length: 12 }, (_, index) => (
            <div className="discover2-compact-song" key={index} aria-hidden="true">
              <span className="discover2-compact-song-art" />
              <span className="discover2-compact-song-copy" />
            </div>
          ))}
        </div>
      ) : (
        <div className="discover2-song-grid">
          {recentSongs.map((song) => (
            <Discover2CompactSong key={song.id} song={song} queue={recentSongs} />
          ))}
        </div>
      )}
    </section>
    {!beforePlaylists && !loading && recentSongs.length > 0 ? (
      <div className="discover2-song-experiments" aria-label="Alternative song section designs">
        <section className="discover2-song-experiment">
          <div className="discover2-song-experiment-heading">
            <span>OPTION 01 / LISTENING GALLERY</span>
            <h2>Music as artwork.</h2>
            <p>Larger covers and a quieter, gallery-like browsing experience.</p>
          </div>
          <div className="discover2-experiment-gallery">
            {recentSongs.map((song) => (
              <Discover2CompactSong key={song.id} song={song} queue={recentSongs} presentation="gallery" />
            ))}
          </div>
        </section>

        <section className="discover2-song-experiment">
          <div className="discover2-song-experiment-heading">
            <span>OPTION 02 / NUMBERED TRACKLIST</span>
            <h2>A numbered listening list.</h2>
            <p>Emphasis on song titles, sequence, and subtle artwork.</p>
          </div>
          <div className="discover2-experiment-numbered">
            {recentSongs.map((song, index) => (
              <Discover2CompactSong key={song.id} song={song} queue={recentSongs} presentation="numbered" index={index} />
            ))}
          </div>
        </section>

        <section className="discover2-song-experiment">
          <div className="discover2-song-experiment-heading">
            <span>OPTION 03 / ASYMMETRIC COLLECTION</span>
            <h2>A more visual rhythm.</h2>
            <p>One collection, with varied image sizes and a stronger editorial composition.</p>
          </div>
          <div className="discover2-experiment-collage">
            {recentSongs.map((song) => (
              <Discover2CompactSong key={song.id} song={song} queue={recentSongs} presentation="collage" />
            ))}
          </div>
        </section>
      </div>
    ) : null}
    </>
  );
}
