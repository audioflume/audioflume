"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  buildWaveformBars,
  createWaveformCanvasDrawCache,
  drawWaveformBarsToCanvas,
  type WaveformCanvasDrawCache,
  type WaveformColors,
} from "./waveform";

const BAR_WIDTH = 2;
const BAR_GAP = 1;

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

function getWaveformColors(): WaveformColors {
  const styles = getComputedStyle(document.documentElement);

  return {
    progressColor: styles.getPropertyValue("--waveform-progress").trim(),
    inactiveColor: styles.getPropertyValue("--waveform-color").trim(),
  };
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
  className = "filmwave-music-player grid h-[72px] items-center justify-between px-4",
  dataPlatform,
  style,
  onLayoutChange,
}: MusicPlayerShellProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const playerCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformBarsRef = useRef<number[]>([]);
  const waveformProgressRef = useRef(0);
  const playerCanvasAnimationFrameRef = useRef<number | null>(null);
  const playerCanvasDrawCacheRef = useRef<WaveformCanvasDrawCache>(
    createWaveformCanvasDrawCache(),
  );

  const [playerWidth, setPlayerWidth] = useState(0);
  const [waveformWidth, setWaveformWidth] = useState(0);

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
    [
      playerWidth,
      showWaveform,
      showFullCompactTime,
      showCompactTime,
      showKey,
      showBpm,
      showRightMeta,
    ],
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

  const waveformBars = useMemo(
    () => buildWaveformBars(waveformPeaks, waveformWidth),
    [waveformPeaks, waveformWidth],
  );

  const drawPlayerCanvas = useCallback((forceResize = false) => {
    const canvas = playerCanvasRef.current;
    const bars = waveformBarsRef.current;
    const prog = waveformProgressRef.current;

    if (!canvas || !bars.length) return;

    drawWaveformBarsToCanvas({
      canvas,
      bars,
      progress: prog,
      cache: playerCanvasDrawCacheRef.current,
      colors: getWaveformColors(),
      forceResize,
      options: { barWidth: BAR_WIDTH, barGap: BAR_GAP },
    });
  }, []);

  const schedulePlayerCanvasDraw = useCallback(
    (forceResize = false) => {
      if (playerCanvasAnimationFrameRef.current != null) return;

      playerCanvasAnimationFrameRef.current = window.requestAnimationFrame(() => {
        playerCanvasAnimationFrameRef.current = null;
        drawPlayerCanvas(forceResize);
      });
    },
    [drawPlayerCanvas],
  );

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
    waveformBarsRef.current = waveformBars;
    waveformProgressRef.current = progress;
    schedulePlayerCanvasDraw();
  }, [waveformBars, progress, schedulePlayerCanvasDraw]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      schedulePlayerCanvasDraw(true);
    });
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
    const ro = new ResizeObserver(updateWidth);
    ro.observe(player);
    window.addEventListener("resize", updateWidth);
    const t = window.setTimeout(updateWidth, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(t);
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
    const ro = new ResizeObserver(updateWidth);
    ro.observe(waveform);
    window.addEventListener("resize", updateWidth);
    const t = window.setTimeout(updateWidth, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(t);
    };
  }, [song.id, showWaveform, schedulePlayerCanvasDraw]);

  function handleWaveformClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const nextProgress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

    waveformProgressRef.current = nextProgress;
    onSeek(nextProgress);
    schedulePlayerCanvasDraw();
  }

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
        {cover ??
          (song.coverArt ? (
            <div className="filmwave-player-cover">
              <img src={song.coverArt} alt="" draggable={false} />
            </div>
          ) : (
            <div className="filmwave-player-cover" />
          ))}
        <div className="filmwave-player-song-copy">
          <div title={song.title} className="filmwave-player-title">
            {song.title}
          </div>
          <div
            title={typeof subtitle === "string" ? subtitle : song.artist}
            className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[var(--text-subtle)]"
          >
            {subtitle ?? <span className="truncate">{song.artist}</span>}
          </div>
        </div>
      </div>

      <div className="filmwave-player-controls">
        <button
          type="button"
          onClick={onPrevious}
          className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
          aria-label="Previous song"
        >
          <PrevIcon />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
          aria-label={isPlaying ? "Pause song" : "Play song"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
          aria-label="Next song"
        >
          <NextIcon />
        </button>
      </div>

      {(showWaveform || showCompactTime) && (
        <div
          className="relative z-10 flex min-w-0 items-center justify-center overflow-visible"
          style={{
            marginLeft: `${controlsToProgressGap - mainGap}px`,
            marginRight: `${progressToMetaGap - mainGap}px`,
          }}
        >
          {showWaveform ? (
            <div className="flex w-full min-w-0 items-center gap-4 overflow-visible">
              <span className="w-10 flex-shrink-0 text-right text-xs text-[var(--icon-color)]">
                {formatTime(currentTime)}
              </span>

              <div
                ref={waveformRef}
                data-player-waveform-slot
                className="relative z-10 flex h-[24px] min-w-[80px] flex-1 cursor-pointer items-center overflow-visible"
                onClick={handleWaveformClick}
              >
                {waveformOverlay}

                <canvas
                  ref={playerCanvasRef}
                  className="relative z-10 h-full w-full"
                  style={{ display: "block" }}
                />
              </div>

              <span className="w-10 flex-shrink-0 text-xs text-[var(--icon-color)]">
                {formatTime(renderedDuration)}
              </span>

              {waveformEndSlot}
            </div>
          ) : (
            <div className="whitespace-nowrap text-xs text-[var(--icon-color)]">
              {showFullCompactTime
                ? `${formatTime(currentTime)} / ${formatTime(renderedDuration)}`
                : formatTime(currentTime)}
            </div>
          )}
        </div>
      )}

      {showRightMeta && (
        <div className="filmwave-player-meta" style={{ gap: `${metaGap}px` }}>
          {showKey && <span className="whitespace-nowrap">{song.key || "—"}</span>}
          {showBpm && <span className="whitespace-nowrap">{song.bpm ? `${song.bpm} BPM` : "—"}</span>}
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
