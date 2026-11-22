"use client";

import { useMemo, useState } from "react";
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

function Discover2InteractiveSpotlight({ songs }: { songs: Song[] }) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);
  const previewSong = songs.find((song) => song.id === previewSongId) ?? songs[0];

  if (!previewSong) return null;

  function playSong(song: Song) {
    if (!song.audioUrl) return;
    setQueue(songs);
    togglePlayPause(song);
    setPreviewSongId(song.id);
  }

  const spotlightPlaying = currentSong?.id === previewSong.id && isPlaying;

  return (
    <section className="discover2-spotlight" aria-label="Interactive spotlight design experiment">
      <div className="discover2-spotlight-heading">
        <span>DESIGN EXPERIMENT / INTERACTIVE SPOTLIGHT</span>
        <h2>Find your next sound.</h2>
        <p>Explore the collection. Hover over a track to bring its artwork into focus.</p>
      </div>
      <div className="discover2-spotlight-stage">
        <div className="discover2-spotlight-feature">
          <div className="discover2-spotlight-cover">
            {previewSong.coverArt ? (
              <img src={previewSong.coverArt} alt="" key={previewSong.id} />
            ) : null}
            <span className="discover2-spotlight-feature-number">
              {String(songs.findIndex((song) => song.id === previewSong.id) + 1).padStart(2, "0")} / {String(songs.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              className="discover2-spotlight-feature-play"
              onClick={() => playSong(previewSong)}
              aria-label={`${spotlightPlaying ? "Pause" : "Play"} ${previewSong.title} by ${previewSong.artist}`}
            >
              <PlaybackStateIcon playing={spotlightPlaying} size={20} />
            </button>
          </div>
          <div className="discover2-spotlight-feature-info" aria-live="polite">
            <div>
              <h3>{previewSong.title}</h3>
              <p>{previewSong.artist}</p>
            </div>
            <div className="discover2-spotlight-feature-genres">
              {previewSong.genres.slice(0, 3).map((genre) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="discover2-spotlight-list" aria-label="Choose a track to preview">
          {songs.map((song, index) => {
            const selected = previewSong.id === song.id;
            const playing = currentSong?.id === song.id && isPlaying;
            return (
              <button
                key={song.id}
                type="button"
                className={`discover2-spotlight-row${selected ? " is-previewed" : ""}${playing ? " is-playing" : ""}`}
                onMouseEnter={() => setPreviewSongId(song.id)}
                onFocus={() => setPreviewSongId(song.id)}
                onClick={() => playSong(song)}
                aria-label={`${playing ? "Pause" : "Play"} ${song.title} by ${song.artist}`}
                aria-pressed={selected}
              >
                <span className="discover2-spotlight-row-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="discover2-spotlight-row-art">
                  {song.coverArt ? <img src={song.coverArt} alt="" loading="lazy" /> : null}
                </span>
                <span className="discover2-spotlight-row-copy">
                  <strong>{song.title}</strong>
                  <span>{song.artist}</span>
                </span>
                <span className="discover2-spotlight-row-action" aria-hidden="true">
                  <PlaybackStateIcon playing={playing} size={15} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
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
      <Discover2InteractiveSpotlight songs={recentSongs} />
    ) : null}
    </>
  );
}
