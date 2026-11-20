"use client";

import { usePlayerProgress } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import XIcon from "@/components/icons/XIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import styles from "./Artist2SidebarPlayer.module.css";

function durationLabel(seconds: number | undefined) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return "—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

type Props = {
  artistName: string;
  trackCount: number;
  songs: Song[];
  currentSongId?: string;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onSeek: (song: Song, progress: number) => void;
  onClose: () => void;
};

export default function Artist2SidebarPlayer({
  artistName, trackCount, songs, currentSongId, isPlaying, onPlay, onSeek, onClose,
}: Props) {
  const { currentTime, duration } = usePlayerProgress();
  const activeIndex = songs.findIndex((song) => song.id === currentSongId);
  const songIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeSong = songs[songIndex];
  const playing = Boolean(activeSong && activeSong.id === currentSongId && isPlaying);
  const progress = activeSong && activeSong.id === currentSongId && duration > 0
    ? Math.min(100, Math.max(0, currentTime / duration * 100))
    : 0;

  return (
    <div className={styles.player} aria-label={`Preview music by ${artistName}`}>
      <button type="button" className={styles.close} aria-label={`Close ${artistName} song preview`} onClick={onClose}>
        <XIcon size={18} strokeWidth={1.4} />
      </button>
      <div className={styles.nowPlaying}>
        <div className={styles.artwork}>
          {activeSong?.coverArt ? <img src={activeSong.coverArt} alt="" draggable={false} /> : null}
        </div>
        <span className={styles.title}>{activeSong?.title ?? "No preview available"}</span>
        <span className={styles.artist}>{artistName}</span>
      </div>
      <div className={styles.controls}>
        <div className={styles.controlButtons}>
          <button type="button" aria-label={`Previous song by ${artistName}`} disabled={songs.length < 2}
            onClick={() => onPlay(songs[(songIndex - 1 + songs.length) % songs.length])}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 5h2v14H5zM19 5v14L8 12z" /></svg>
          </button>
          <button type="button" className={styles.play} disabled={!activeSong}
            aria-label={activeSong ? `${playing ? "Pause" : "Play"} ${activeSong.title}` : "No preview available"}
            onClick={() => { if (activeSong) onPlay(activeSong); }}>
            {playing ? <PauseIcon size={16} /> : <PlayIconSmall size={16} />}
          </button>
          <button type="button" aria-label={`Next song by ${artistName}`} disabled={songs.length < 2}
            onClick={() => onPlay(songs[(songIndex + 1) % songs.length])}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 5h2v14h-2zM5 5l11 7-11 7z" /></svg>
          </button>
        </div>
        <input type="range" className={styles.progress} min={0} max={100} step={0.1}
          value={progress} disabled={!activeSong} aria-label={activeSong ? `Seek within ${activeSong.title}` : "No song to seek"}
          onChange={(event) => { if (activeSong) onSeek(activeSong, Number(event.target.value) / 100); }} />
        <span className={styles.count}>{trackCount} {trackCount === 1 ? "song" : "songs"}</span>
      </div>
      <div className={styles.list} aria-label={`Songs by ${artistName}`}>
        {songs.map((song) => {
          const active = song.id === currentSongId;
          return (
            <button type="button" className={styles.row} key={song.id}
              aria-label={`${active && isPlaying ? "Pause" : "Play"} ${song.title}`}
              onClick={() => onPlay(song)}>
              <span className={styles.cover}>
                {song.coverArt ? <img src={song.coverArt} alt="" draggable={false} /> : null}
              </span>
              <span className={styles.rowTitle}>{song.title}</span>
              <span className={styles.duration}>{durationLabel(song.duration)}</span>
              <PlaybackStateIcon playing={Boolean(active && isPlaying)} size={12} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
