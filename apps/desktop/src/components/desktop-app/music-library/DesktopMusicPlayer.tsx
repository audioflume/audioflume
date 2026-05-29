import { useEffect, useMemo, useRef, useState } from "react";
import DownloadIconSmall from "../../icons/DownloadIconSmall";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getAudioSource(song: DesktopMusicSong) {
  return song.playbackUrl || song.audioUrl || song.hlsUrl || "";
}

export default function DesktopMusicPlayer({
  song,
  isPlaying,
  favorite,
  onPlayPause,
  onPrevious,
  onNext,
  onFavoriteToggle,
}: {
  song: DesktopMusicSong;
  isPlaying: boolean;
  favorite: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFavoriteToggle: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.durationSeconds || 0);
  const audioSource = useMemo(() => getAudioSource(song), [song]);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(song.durationSeconds || 0);
  }, [song.id, song.durationSeconds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSource) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((error) => console.warn("Could not play audio", error));
      }
    } else {
      audio.pause();
    }
  }, [audioSource, isPlaying]);

  function seek(event: React.MouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const nextProgress = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextTime = nextProgress * duration;

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div className="desktop-music-player">
      <audio
        ref={audioRef}
        src={audioSource}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || song.durationSeconds || 0)}
        onEnded={onNext}
      />

      <div className="desktop-player-song">
        <div className="desktop-player-cover">
          {song.coverArt ? <img src={song.coverArt} alt="" draggable={false} /> : <span>{song.title.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div className="desktop-player-song-copy">
          <h3>{song.title}</h3>
          <p>{song.artist}</p>
        </div>
      </div>

      <div className="desktop-player-controls">
        <button type="button" aria-label="Previous song" onClick={onPrevious}>
          <SkipBackIcon />
        </button>
        <button type="button" className="desktop-player-play-button" aria-label={isPlaying ? "Pause" : "Play"} onClick={onPlayPause}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button type="button" aria-label="Next song" onClick={onNext}>
          <SkipForwardIcon />
        </button>
      </div>

      <div className="desktop-player-progress-wrap">
        <span>{formatTime(currentTime)}</span>
        <button type="button" className="desktop-player-progress" aria-label="Seek" onClick={seek}>
          <span style={{ transform: `scaleX(${progress})` }} />
        </button>
        <span>{formatTime(duration || song.durationSeconds)}</span>
      </div>

      <div className="desktop-player-meta">
        <span>{song.key || "—"}</span>
        <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>
      </div>

      <div className="desktop-player-actions">
        <button type="button" aria-label={favorite ? "Remove song from favorites" : "Favorite song"} className={favorite ? "is-active" : ""} onClick={onFavoriteToggle}>
          <HeartIcon size={14} filled={favorite} />
        </button>
        <button type="button" aria-label="Song options">
          <MoreIcon size={14} />
        </button>
        <button type="button" aria-label="Download song">
          <DownloadIconSmall size={12} />
        </button>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3.5L12 8L5 12.5V3.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3H7V13H5V3Z" fill="currentColor" />
      <path d="M9 3H11V13H9V3Z" fill="currentColor" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 3H5.5V13H4V3Z" fill="currentColor" />
      <path d="M12 3.5L6 8L12 12.5V3.5Z" fill="currentColor" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10.5 3H12V13H10.5V3Z" fill="currentColor" />
      <path d="M4 3.5L10 8L4 12.5V3.5Z" fill="currentColor" />
    </svg>
  );
}
