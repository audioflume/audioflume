"use client";

import { useMemo, useState } from "react";
import { useSongs } from "@/hooks/useSongs";
import { MusicQuickChip } from "@filmwave/shared";
import { GENRE_OPTIONS } from "@/lib/constants";
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
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const availableGenres = useMemo(() => {
    const present = new Set(playableSongs.flatMap((song) => song.genres));
    return GENRE_OPTIONS.filter((genre) => present.has(genre));
  }, [playableSongs]);
  const recentSongs = useMemo(
    () => playableSongs.filter((song) =>
      selectedGenres.length === 0 ||
      song.genres.some((genre) => selectedGenres.includes(genre))
    ).slice(0, 12),
    [playableSongs, selectedGenres],
  );

  return (
    <section className={`discover2-song-section${beforePlaylists ? " is-before-playlists" : ""}`} aria-label="Featured tracks">
      {beforePlaylists ? <h2 className="discover2-song-section-title">Tracks made for storytelling.</h2> : null}
      {!beforePlaylists ? (
      <h2 className="discover2-song-intro">Discover a thoughtfully curated collection of human-made music, crafted to bring stories to life.</h2>
      ) : null}
      {!beforePlaylists && !loading && availableGenres.length > 0 ? (
        <div className="discover2-song-genres" role="group" aria-label="Filter featured tracks by genre">
          {availableGenres.map((genre) => {
            const active = selectedGenres.includes(genre);
            return (
              <MusicQuickChip
                key={genre}
                active={active}
                onClick={() => setSelectedGenres((current) =>
                  current.includes(genre) ? current.filter((value) => value !== genre) : [...current, genre]
                )}
              >
                {genre}
              </MusicQuickChip>
            );
          })}
        </div>
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
          {recentSongs.length ? recentSongs.map((song) => (
            <Discover2CompactSong key={song.id} song={song} queue={recentSongs} />
          )) : (
            <p className="discover2-song-empty">No tracks match the selected genres.</p>
          )}
        </div>
      )}
    </section>
  );
}
