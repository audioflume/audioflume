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
    <div className="filmwave-music-player desktop-music-player" data-platform="desktop">
      <audio
        ref={audioRef}
        src={audioSource}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || song.durationSeconds || 0)}
        onEnded={onNext}
      />

      <div className="filmwave-player-song desktop-player-song">
        <div className="filmwave-player-cover desktop-player-cover">
          {song.coverArt ? <img src={song.coverArt} alt="" draggable={false} /> : <span>{song.title.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div className="filmwave-player-song-copy desktop-player-song-copy">
          <h3 className="filmwave-player-title">{song.title}</h3>
          <p className="filmwave-player-artist">{song.artist}</p>
        </div>
      </div>

      <div className="filmwave-player-controls desktop-player-controls">
        <button type="button" aria-label="Previous song" onClick={onPrevious}>
          <SkipBackIcon />
        </button>
        <button type="button" aria-label={isPlaying ? "Pause song" : "Play song"} onClick={onPlayPause}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button type="button" aria-label="Next song" onClick={onNext}>
          <SkipForwardIcon />
        </button>
      </div>

      <div className="filmwave-player-progress-wrap desktop-player-progress-wrap">
        <span className="filmwave-player-time">{formatTime(currentTime)}</span>
        <button type="button" className="filmwave-player-progress desktop-player-progress" aria-label="Seek" onClick={seek}>
          <span style={{ transform: `scaleX(${progress})` }} />
        </button>
        <span className="filmwave-player-time">{formatTime(duration || song.durationSeconds)}</span>
      </div>

      <div className="filmwave-player-meta desktop-player-meta">
        <span>{song.key || "—"}</span>
        <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>
      </div>

      <div className="filmwave-player-actions desktop-player-actions filmwave-icon-button-group">
        <button
          type="button"
          aria-label={favorite ? "Remove song from favorites" : "Favorite song"}
          aria-pressed={favorite}
          className={`filmwave-icon-button filmwave-icon-button-plain${favorite ? " is-active" : ""}`}
          onClick={onFavoriteToggle}
        >
          <HeartIcon size={14} filled={favorite} />
        </button>
        <button type="button" aria-label="Song options" className="filmwave-icon-button filmwave-icon-button-plain">
          <MoreIcon size={14} />
        </button>
        {audioSource ? (
          <a href={audioSource} download aria-label="Download song" className="filmwave-icon-button filmwave-icon-button-plain">
            <DownloadIconSmall size={12} />
          </a>
        ) : (
          <button type="button" aria-label="Download song" className="filmwave-icon-button filmwave-icon-button-plain" disabled>
            <DownloadIconSmall size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="19,20 9,12 19,4" />
      <rect x="5" y="4" width="2" height="16" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,4 15,12 5,20" />
      <rect x="17" y="4" width="2" height="16" />
    </svg>
  );
}
