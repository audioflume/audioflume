"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import SharedWaveformCanvas from "./SharedWaveformCanvas";

const WAVEFORM_MIN_WIDTH = 780;
const FULL_COMPACT_TIME_MIN_WIDTH = 620;
const COMPACT_TIME_MIN_WIDTH = 500;
const KEY_MIN_WIDTH = 560;
const BPM_MIN_WIDTH = 700;

type MusicPlayerShellSong = {
  id: string;
  title: string;
  artist: string;
  coverArt?: string | null;
  key?: string | null;
  bpm?: number | string | null;
  durationSeconds?: number | null;
};

export type MusicPlayerShellLayout = {
  playerWidth: number;
  showWaveform: boolean;
  showFullCompactTime: boolean;
  showCompactTime: boolean;
  showKey: boolean;
  showBpm: boolean;
  showRightMeta: boolean;
};

type MusicPlayerShellProps = {
  song: MusicPlayerShellSong;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  waveformPeaks: readonly number[];
  onPrevious: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onSeek: (progress: number) => void;
  actions: ReactNode;
  cover?: ReactNode;
  subtitle?: ReactNode;
  waveformOverlay?: ReactNode;
  renderWaveformEndSlot?: (layout: MusicPlayerShellLayout) => ReactNode;
  className?: string;
  dataPlatform?: string;
  style?: CSSProperties;
  onLayoutChange?: (layout: MusicPlayerShellLayout) => void;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function PrevIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="19,20 9,12 19,4" />
      <rect x="5" y="4" width="2" height="16" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,4 15,12 5,20" />
      <rect x="17" y="4" width="2" height="16" />
    </svg>
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

export default function MusicPlayerShell({
  song,
  isPlaying,
  currentTime,
  duration,
  waveformPeaks,
  onPrevious,
  onPlayPause,
  onNext,
  onSeek,
  actions,
  cover,
  subtitle,
  waveformOverlay,
  renderWaveformEndSlot,
  className = "filmwave-music-player",
  dataPlatform,
  style,
  onLayoutChange,
}: MusicPlayerShellProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [playerWidth, setPlayerWidth] = useState(0);

  const showWaveform = playerWidth >= WAVEFORM_MIN_WIDTH;
  const showFullCompactTime = playerWidth >= FULL_COMPACT_TIME_MIN_WIDTH;
  const showCompactTime = !showWaveform && playerWidth >= COMPACT_TIME_MIN_WIDTH;
  const showKey = playerWidth >= KEY_MIN_WIDTH;
  const showBpm = playerWidth >= BPM_MIN_WIDTH;
  const showRightMeta = showKey || showBpm;

  const layout = useMemo<MusicPlayerShellLayout>(
    () => ({
      playerWidth,
      showWaveform,
      showFullCompactTime,
      showCompactTime,
      showKey,
      showBpm,
      showRightMeta,
    }),
    [playerWidth, showWaveform, showFullCompactTime, showCompactTime, showKey, showBpm, showRightMeta],
  );

  const compressionProgress = clampNumber((playerWidth - 780) / 520, 0, 1);
  const mainGap = 22 + compressionProgress * 24;
  const controlsToProgressGap = 18 + compressionProgress * 18;
  const metaGap = 24 + compressionProgress * 30;
  const progressToMetaGap = 22 + compressionProgress * 24;
  const metaToActionsGap = 18 + compressionProgress * 18;
  const songInfoWidth = clampNumber(
    150 + ((playerWidth - 620) / 580) * 50,
    150,
    200,
  );
  const waveformMaxWidth = 390 + compressionProgress * 260;
  const progressGroupMaxWidth = waveformMaxWidth + 112;

  const progress =
    duration > 0 && Number.isFinite(duration)
      ? Math.max(0, Math.min(1, currentTime / duration))
      : 0;

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

  useEffect(() => {
    onLayoutChange?.(layout);
  }, [layout, onLayoutChange]);

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

  const renderedDuration = duration || song.durationSeconds || 0;
  const waveformEndSlot = renderWaveformEndSlot?.(layout);

  return (
    <div
      ref={playerRef}
      className={className}
      data-platform={dataPlatform}
      style={{ ...style, gridTemplateColumns, columnGap: `${mainGap}px` }}
    >
      <div className="filmwave-player-song">
        {cover ?? (
          <div className="filmwave-player-cover">
            {song.coverArt ? (
              <img src={song.coverArt} alt="" draggable={false} />
            ) : (
              <span>{song.title.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
        )}

        <div className="filmwave-player-song-copy">
          <div title={song.title} className="filmwave-player-title">
            {song.title}
          </div>
          <div className="filmwave-player-artist" title={song.artist}>
            {subtitle ?? song.artist}
          </div>
        </div>
      </div>

      <div className="filmwave-player-controls">
        <button type="button" onClick={onPrevious} aria-label="Previous song">
          <PrevIcon />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          aria-label={isPlaying ? "Pause song" : "Play song"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button type="button" onClick={onNext} aria-label="Next song">
          <NextIcon />
        </button>
      </div>

      {(showWaveform || showCompactTime) && (
        <div
          className="filmwave-player-progress-wrap"
          style={{
            marginLeft: `${controlsToProgressGap - mainGap}px`,
            marginRight: `${progressToMetaGap - mainGap}px`,
          }}
        >
          {showWaveform ? (
            <div className="filmwave-player-waveform-row">
              <span className="filmwave-player-time">{formatTime(currentTime)}</span>

              <SharedWaveformCanvas
                peaks={waveformPeaks}
                progress={progress}
                onSeek={onSeek}
                overlay={waveformOverlay}
              />

              <span className="filmwave-player-time">{formatTime(renderedDuration)}</span>
              {waveformEndSlot}
            </div>
          ) : (
            <div className="filmwave-player-compact-time">
              {showFullCompactTime
                ? `${formatTime(currentTime)} / ${formatTime(renderedDuration)}`
                : formatTime(currentTime)}
            </div>
          )}
        </div>
      )}

      {showRightMeta && (
        <div className="filmwave-player-meta" style={{ gap: `${metaGap}px` }}>
          {showKey && <span>{song.key || "—"}</span>}
          {showBpm && <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>}
        </div>
      )}

      <div
        className="filmwave-player-actions"
        style={{ marginLeft: `${metaToActionsGap - mainGap}px` }}
      >
        {actions}
      </div>
    </div>
  );
}
