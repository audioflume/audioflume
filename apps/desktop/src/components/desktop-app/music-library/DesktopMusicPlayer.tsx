import {
  buildWaveformBars,
  createWaveformCanvasDrawCache,
  drawWaveformBarsToCanvas,
  type WaveformCanvasDrawCache,
  type WaveformColors,
} from "@filmwave/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DownloadIconSmall from "../../icons/DownloadIconSmall";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const WAVEFORM_MIN_WIDTH = 780;
const FULL_COMPACT_TIME_MIN_WIDTH = 620;
const COMPACT_TIME_MIN_WIDTH = 500;
const KEY_MIN_WIDTH = 560;
const BPM_MIN_WIDTH = 700;

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getAudioSource(song: DesktopMusicSong) {
  return song.playbackUrl || song.audioUrl || song.hlsUrl || "";
}

function getWaveformColors(): WaveformColors {
  const styles = getComputedStyle(document.documentElement);

  return {
    progressColor: styles.getPropertyValue("--waveform-progress").trim(),
    inactiveColor: styles.getPropertyValue("--waveform-color").trim(),
  };
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
  const playerRef = useRef<HTMLDivElement | null>(null);
  const waveformRef = useRef<HTMLButtonElement | null>(null);
  const playerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformBarsRef = useRef<number[]>([]);
  const waveformProgressRef = useRef(0);
  const playerCanvasAnimationFrameRef = useRef<number | null>(null);
  const playerCanvasDrawCacheRef = useRef<WaveformCanvasDrawCache>(
    createWaveformCanvasDrawCache(),
  );

  const [playerWidth, setPlayerWidth] = useState(0);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.durationSeconds || 0);
  const audioSource = useMemo(() => getAudioSource(song), [song]);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const showWaveform = playerWidth >= WAVEFORM_MIN_WIDTH;
  const showFullCompactTime = playerWidth >= FULL_COMPACT_TIME_MIN_WIDTH;
  const showCompactTime = !showWaveform && playerWidth >= COMPACT_TIME_MIN_WIDTH;
  const showKey = playerWidth >= KEY_MIN_WIDTH;
  const showBpm = playerWidth >= BPM_MIN_WIDTH;
  const showRightMeta = showKey || showBpm;

  const compressionProgress = clampNumber((playerWidth - 780) / 520, 0, 1);
  const mainGap = 22 + compressionProgress * 24;
  const controlsToProgressGap = 18 + compressionProgress * 18;
  const metaGap = 24 + compressionProgress * 30;
  const progressToMetaGap = 22 + compressionProgress * 24;
  const metaToActionsGap = 18 + compressionProgress * 18;
  const songInfoWidth = clampNumber(150 + ((playerWidth - 620) / 580) * 50, 150, 200);
  const waveformMaxWidth = 390 + compressionProgress * 260;
  const progressGroupMaxWidth = waveformMaxWidth + 112;

  const gridTemplateColumns = [
    `${songInfoWidth}px`,
    "auto",
    showWaveform
      ? `minmax(192px, ${progressGroupMaxWidth}px)`
      : showCompactTime
        ? "auto"
        : "",
    showRightMeta ? "auto" : "",
    "auto",
  ]
    .filter(Boolean)
    .join(" ");

  const waveformBars = useMemo(
    () => buildWaveformBars(song.waveform, waveformWidth),
    [song.waveform, waveformWidth],
  );

  const drawPlayerCanvas = useCallback((forceResize = false) => {
    const canvas = playerCanvasRef.current;
    const bars = waveformBarsRef.current;

    if (!canvas || !bars.length) return;

    drawWaveformBarsToCanvas({
      canvas,
      bars,
      progress: waveformProgressRef.current,
      cache: playerCanvasDrawCacheRef.current,
      colors: getWaveformColors(),
      forceResize,
      options: { barWidth: BAR_WIDTH, barGap: BAR_GAP },
    });
  }, []);

  const schedulePlayerCanvasDraw = useCallback((forceResize = false) => {
    if (playerCanvasAnimationFrameRef.current != null) return;

    playerCanvasAnimationFrameRef.current = window.requestAnimationFrame(() => {
      playerCanvasAnimationFrameRef.current = null;
      drawPlayerCanvas(forceResize);
    });
  }, [drawPlayerCanvas]);

  useEffect(() => {
    waveformBarsRef.current = waveformBars;
    waveformProgressRef.current = progress;
    schedulePlayerCanvasDraw();
  }, [waveformBars, progress, schedulePlayerCanvasDraw]);

  useEffect(() => {
    const observer = new MutationObserver(() => schedulePlayerCanvasDraw(true));
    observer.observe(document.documentElement, { attributeFilter: ["class", "data-theme"] });

    return () => {
      observer.disconnect();
      if (playerCanvasAnimationFrameRef.current != null) {
        window.cancelAnimationFrame(playerCanvasAnimationFrameRef.current);
        playerCanvasAnimationFrameRef.current = null;
      }
    };
  }, [schedulePlayerCanvasDraw]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const updateWidth = () => {
      setPlayerWidth(Math.floor(player.getBoundingClientRect().width));
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(player);
    window.addEventListener("resize", updateWidth);
    const timeout = window.setTimeout(updateWidth, 50);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(timeout);
    };
  }, [song.id]);

  useEffect(() => {
    if (!showWaveform) {
      setWaveformWidth(0);
      return;
    }

    const waveform = waveformRef.current;
    if (!waveform) return;

    const updateWidth = () => {
      setWaveformWidth(Math.floor(waveform.getBoundingClientRect().width));
      schedulePlayerCanvasDraw(true);
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(waveform);
    window.addEventListener("resize", updateWidth);
    const timeout = window.setTimeout(updateWidth, 50);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(timeout);
    };
  }, [song.id, showWaveform, schedulePlayerCanvasDraw]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(song.durationSeconds || 0);
    waveformProgressRef.current = 0;
    schedulePlayerCanvasDraw(true);
  }, [song.id, song.durationSeconds, schedulePlayerCanvasDraw]);

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

  function seek(event: React.MouseEvent<HTMLElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const nextProgress = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextTime = nextProgress * duration;

    waveformProgressRef.current = nextProgress;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    schedulePlayerCanvasDraw();
  }

  return (
    <div
      ref={playerRef}
      className="filmwave-music-player desktop-music-player"
      data-platform="desktop"
      style={{ gridTemplateColumns, columnGap: `${mainGap}px` }}
    >
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

      {(showWaveform || showCompactTime) && (
        <div
          className="filmwave-player-progress-wrap desktop-player-progress-wrap"
          style={{
            marginLeft: `${controlsToProgressGap - mainGap}px`,
            marginRight: `${progressToMetaGap - mainGap}px`,
          }}
        >
          {showWaveform ? (
            <div className="filmwave-player-waveform-row">
              <span className="filmwave-player-time">{formatTime(currentTime)}</span>
              <button
                ref={waveformRef}
                type="button"
                className="filmwave-player-waveform"
                aria-label="Seek"
                onClick={seek}
              >
                <canvas
                  ref={playerCanvasRef}
                  className="filmwave-player-waveform-canvas"
                  style={{ display: "block" }}
                />
              </button>
              <span className="filmwave-player-time">{formatTime(duration || song.durationSeconds)}</span>
            </div>
          ) : (
            <div className="filmwave-player-compact-time">
              {showFullCompactTime
                ? `${formatTime(currentTime)} / ${formatTime(duration || song.durationSeconds)}`
                : formatTime(currentTime)}
            </div>
          )}
        </div>
      )}

      {showRightMeta && (
        <div className="filmwave-player-meta desktop-player-meta" style={{ gap: `${metaGap}px` }}>
          {showKey && <span>{song.key || "—"}</span>}
          {showBpm && <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>}
        </div>
      )}

      <div
        className="filmwave-player-actions desktop-player-actions filmwave-icon-button-group"
        style={{ marginLeft: `${metaToActionsGap - mainGap}px` }}
      >
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
