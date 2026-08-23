"use client";

import {
  DropdownShell,
  buildWaveformBars,
  createWaveformCanvasDrawCache,
  drawWaveformBarsToCanvas,
  parseWaveformPeaks,
  type WaveformCanvasDrawCache,
  type WaveformColors,
} from "@filmwave/shared";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";
import FailedIcon from "@/components/icons/FailedIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import VolumeIcon from "@/components/icons/VolumeIcon";
import Toast from "@/components/Toast";
import AdminAddToPlaylistModal from "@/components/admin/AdminAddToPlaylistModal";

const BAR_WIDTH = 2;
const BAR_GAP = 1;

const WAVEFORM_MIN_WIDTH = 780;
const FULL_COMPACT_TIME_MIN_WIDTH = 620;
const COMPACT_TIME_MIN_WIDTH = 500;
const KEY_MIN_WIDTH = 560;
const BPM_MIN_WIDTH = 700;

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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

const PrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="19,20 9,12 19,4" />
    <rect x="5" y="4" width="2" height="16" />
  </svg>
);

const NextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,4 15,12 5,20" />
    <rect x="17" y="4" width="2" height="16" />
  </svg>
);

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

export default function AdminMusicPlayer() {
  const {
    currentSong,
    isPlaying,
    remotePlayingInAnotherTab,
    volume,
    setVolume,
    togglePlayPause,
    navigateTrack,
    seekTo,
    closePlayer,
  } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();

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
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  const showWaveform = playerWidth >= WAVEFORM_MIN_WIDTH;
  const showFullCompactTime = playerWidth >= FULL_COMPACT_TIME_MIN_WIDTH;
  const showCompactTime =
    !showWaveform && playerWidth >= COMPACT_TIME_MIN_WIDTH;
  const showKey = playerWidth >= KEY_MIN_WIDTH;
  const showBpm = playerWidth >= BPM_MIN_WIDTH;
  const showRightMeta = showKey || showBpm;

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
    duration > 0 && isFinite(duration)
      ? Math.max(0, Math.min(1, currentTime / duration))
      : 0;

  const peaks = useMemo(
    () => (currentSong ? parseWaveformPeaks(currentSong.waveformPeaks) : []),
    [currentSong?.id, currentSong?.waveformPeaks],
  );

  const waveformBars = useMemo(
    () => buildWaveformBars(peaks, waveformWidth),
    [peaks, waveformWidth],
  );

  const drawPlayerCanvas = useCallback((forceResize = false) => {
    const canvas = playerCanvasRef.current;
    const bars = waveformBarsRef.current;
    const currentProgress = waveformProgressRef.current;

    if (!canvas || !bars.length) return;

    drawWaveformBarsToCanvas({
      canvas,
      bars,
      progress: currentProgress,
      cache: playerCanvasDrawCacheRef.current,
      colors: getWaveformColors(),
      forceResize,
      options: { barWidth: BAR_WIDTH, barGap: BAR_GAP },
    });
  }, []);

  const schedulePlayerCanvasDraw = useCallback(
    (forceResize = false) => {
      if (playerCanvasAnimationFrameRef.current != null) return;

      playerCanvasAnimationFrameRef.current = window.requestAnimationFrame(
        () => {
          playerCanvasAnimationFrameRef.current = null;
          drawPlayerCanvas(forceResize);
        },
      );
    },
    [drawPlayerCanvas],
  );

  useLayoutEffect(() => {
    waveformBarsRef.current = waveformBars;
    waveformProgressRef.current = progress;
    schedulePlayerCanvasDraw();
  }, [waveformBars, progress, schedulePlayerCanvasDraw]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      schedulePlayerCanvasDraw(true);
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      if (playerCanvasAnimationFrameRef.current != null) {
        window.cancelAnimationFrame(playerCanvasAnimationFrameRef.current);
        playerCanvasAnimationFrameRef.current = null;
      }
    };
  }, [schedulePlayerCanvasDraw]);

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
  }, [currentSong?.id]);

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
  }, [currentSong?.id, showWaveform, schedulePlayerCanvasDraw]);

  if (!currentSong) return null;

  const handleWaveformClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;

    const nextProgress = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );

    waveformProgressRef.current = nextProgress;
    seekTo(currentSong, nextProgress, isPlaying);
    schedulePlayerCanvasDraw();
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  };

  const copyAudioUrl = async () => {
    if (!currentSong.audioUrl) return;
    await navigator.clipboard.writeText(currentSong.audioUrl);
    setMoreOpen(false);
    showToast("Copied");
  };

  const handleClosePlayer = () => {
    setVolumeOpen(false);
    setMoreOpen(false);
    closePlayer();
  };

  return (
    <>
      <div
        ref={playerRef}
        className="filmwave-music-player grid h-[72px] items-center justify-between px-4"
        style={{ gridTemplateColumns, columnGap: `${mainGap}px` }}
      >
        <div className="filmwave-player-song">
          {currentSong.coverArt ? (
            <div className="filmwave-player-cover">
              <Image
                src={currentSong.coverArt}
                alt={currentSong.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="filmwave-player-cover" />
          )}

          <div className="filmwave-player-song-copy">
            <div title={currentSong.title} className="filmwave-player-title">
              {currentSong.title}
            </div>
            <div
              title={
                remotePlayingInAnotherTab
                  ? "Playing in another tab"
                  : currentSong.artist
              }
              className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[var(--text-subtle)]"
            >
              {remotePlayingInAnotherTab ? (
                <>
                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--text-muted)] opacity-40" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                  </span>
                  <span className="truncate text-[var(--text-muted)]">
                    Playing in another tab
                  </span>
                </>
              ) : (
                <span className="truncate">{currentSong.artist}</span>
              )}
            </div>
          </div>
        </div>

        <div className="filmwave-player-controls">
          <button
            type="button"
            onClick={() => navigateTrack("prev")}
            aria-label="Previous song"
          >
            <PrevIcon />
          </button>

          <button
            type="button"
            onClick={() => togglePlayPause(currentSong)}
            aria-label={isPlaying ? "Pause song" : "Play song"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            onClick={() => navigateTrack("next")}
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
                  <canvas
                    ref={playerCanvasRef}
                    className="relative z-10 h-full w-full"
                    style={{ display: "block" }}
                  />
                </div>

                <span className="w-10 flex-shrink-0 text-xs text-[var(--icon-color)]">
                  {formatTime(duration)}
                </span>
              </div>
            ) : (
              <div className="whitespace-nowrap text-xs text-[var(--icon-color)]">
                {showFullCompactTime
                  ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                  : formatTime(currentTime)}
              </div>
            )}
          </div>
        )}

        {showRightMeta && (
          <div className="filmwave-player-meta" style={{ gap: `${metaGap}px` }}>
            {showKey && (
              <span className="whitespace-nowrap">
                {currentSong.key || "—"}
              </span>
            )}
            {showBpm && (
              <span className="whitespace-nowrap">
                {currentSong.bpm ? `${currentSong.bpm} BPM` : "—"}
              </span>
            )}
          </div>
        )}

        <div
          className="filmwave-player-actions"
          style={{ marginLeft: `${metaToActionsGap - mainGap}px` }}
        >
          <DropdownShell
            open={volumeOpen}
            onOpenChange={setVolumeOpen}
            placement="top"
            offsetAmount={8}
            flippedOffsetAmount={8}
            collisionPadding={{
              top: 72,
              right: 16,
              bottom: 58,
              left: 16,
            }}
            className="filmwave-player-volume-popover"
            trigger={({ open }) => (
              <button
                type="button"
                aria-label="Volume"
                aria-expanded={open}
                className={`filmwave-player-volume-button inline-flex h-7 w-7 min-w-7 flex-shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors [&>svg]:h-[14px] [&>svg]:w-[14px] ${
                  open
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                }`}
              >
                <VolumeIcon muted={volume === 0} />
              </button>
            )}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              aria-label="Player volume"
              className="filmwave-player-volume-slider"
              onChange={(event) => setVolume(Number(event.currentTarget.value))}
            />
          </DropdownShell>

          <DropdownShell
            open={moreOpen}
            onOpenChange={setMoreOpen}
            placement="top-end"
            offsetAmount={8}
            collisionPadding={{
              top: 72,
              right: 16,
              bottom: 58,
              left: 16,
            }}
            trigger={({ open }) => (
              <button
                type="button"
                aria-label="Song options"
                aria-expanded={open}
                className={`inline-flex h-7 w-7 min-w-7 flex-shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors [&>svg]:h-[14px] [&>svg]:w-[14px] ${
                  open
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                }`}
              >
                <MoreIcon />
              </button>
            )}
          >
            <Link
              href={`/admin/songs/${currentSong.id}/edit`}
              onClick={() => setMoreOpen(false)}
            >
              <span>Edit Details</span>
            </Link>

            {currentSong.audioUrl ? (
              <a
                href={currentSong.audioUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMoreOpen(false)}
              >
                <span>Open Audio</span>
              </a>
            ) : (
              <button type="button" disabled>
                <span>Open Audio</span>
              </button>
            )}

            <button
              type="button"
              onClick={copyAudioUrl}
              disabled={!currentSong.audioUrl}
            >
              <span>Copy Audio URL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setPlaylistModalOpen(true);
              }}
            >
              <span>Add to Playlist</span>
            </button>

            <button
              type="button"
              onClick={handleClosePlayer}
              className="danger-hover"
            >
              <span>Close Player</span>
              <FailedIcon size={13} strokeWidth={2.4} />
            </button>
          </DropdownShell>
        </div>
      </div>

      <AdminAddToPlaylistModal
        isOpen={playlistModalOpen}
        song={currentSong}
        onClose={() => setPlaylistModalOpen(false)}
      />

      <Toast message={toastMessage} bottomOffset="88px" />
    </>
  );
}
