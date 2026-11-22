"use client";

import { useMemo } from "react";
import { useSongs } from "@/hooks/useSongs";
import { usePlayer } from "@/context/PlayerContext";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import type { Song } from "@/lib/types";

function Discover2CompactSong({ song, queue }: { song: Song; queue: Song[] }) {
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
      className={`discover2-compact-song${active ? " is-active" : ""}`}
      onClick={playSong}
      disabled={!song.audioUrl}
      aria-label={`${playing ? "Pause" : "Play"} ${song.title} by ${song.artist}`}
    >
      <span className="discover2-compact-song-art">
        {song.coverArt ? <img src={song.coverArt} alt="" loading="lazy" /> : null}
        <span className="discover2-compact-song-play">
          <PlaybackStateIcon playing={playing} size={14} />
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
    <section className={`discover2-song-section${beforePlaylists ? " is-before-playlists" : ""}`} aria-label="Featured tracks">
      {beforePlaylists ? <h2 className="discover2-song-section-title">Tracks made for storytelling.</h2> : null}
      {!beforePlaylists ? (
      <p className="discover2-song-intro">Discover a thoughtfully curated collection of human-made music, crafted to bring stories to life.</p>
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
  );
}
