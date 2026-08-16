"use client";

import { DropdownShell } from "@filmwave/shared";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";
import FailedIcon from "@/components/icons/FailedIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import NextTrackIcon from "@/components/icons/NextTrackIcon";
import PlayerPauseIcon from "@/components/icons/PlayerPauseIcon";
import PlayerPlayIcon from "@/components/icons/PlayerPlayIcon";
import PreviousTrackIcon from "@/components/icons/PreviousTrackIcon";
import Toast from "@/components/Toast";
import AdminAddToPlaylistModal from "@/components/admin/AdminAddToPlaylistModal";
import { iconButtonClass } from "@/components/uiClasses";

const WAVEFORM_HIDE_WIDTH = 80;
const BAR_WIDTH = 2;
const BAR_GAP = 1;
const BAR_TOTAL = BAR_WIDTH + BAR_GAP;

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function normalizePeaks(peaks: number[]) {
  let maxVal = 0;
  for (let i = 0; i < peaks.length; i++) {
    const value = Math.abs(Number(peaks[i]) || 0);
    if (value > maxVal) maxVal = value;
  }
  if (maxVal <= 0) return peaks.map(() => 0);
  return peaks.map((peak) => Math.abs(Number(peak) || 0) / maxVal);
}

function buildWaveformBars(peaks: number[], width: number) {
  if (!peaks.length || width <= 0) return [];
  const barCount = Math.max(1, Math.floor(width / BAR_TOTAL));
  const normalizedPeaks = normalizePeaks(peaks);
  const samplesPerBar = normalizedPeaks.length / barCount;
  return Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor(index * samplesPerBar);
    const end = Math.min(normalizedPeaks.length, Math.floor((index + 1) * samplesPerBar));
    let barPeak = 0;
    for (let i = start; i < end; i++) {
      if (normalizedPeaks[i] > barPeak) barPeak = normalizedPeaks[i];
    }
    return Math.max(2, Math.min(20, barPeak * 20));
  });
}

export default function AdminMusicPlayer() {
  const {
    currentSong,
    isPlaying,
    togglePlayPause,
    navigateTrack,
    seekTo,
    closePlayer,
  } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();

  const containerRef = useRef<HTMLDivElement>(null);
  // Canvas-based waveform — eliminates 260+ div reconciliation on every progress tick
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformBarsRef = useRef<number[]>([]);
  const waveformProgressRef = useRef(0);

  const [waveformWidth, setWaveformWidth] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  const progress =
    duration > 0 && isFinite(duration)
      ? Math.max(0, Math.min(1, currentTime / duration))
      : 0;

  const isWaveformCompact = waveformWidth <= WAVEFORM_HIDE_WIDTH;

  const peaks = useMemo(() => {
    if (!currentSong) return [];
    try {
      const parsed = JSON.parse(currentSong.waveformPeaks);
      return Array.isArray(parsed)
        ? parsed.map((value) => {
            const n = Number(value);
            return Number.isFinite(n) ? n : 0;
          })
        : [];
    } catch {
      return [];
    }
  }, [currentSong]);

  const waveformBars = useMemo(
    () => buildWaveformBars(peaks, waveformWidth),
    [peaks, waveformWidth],
  );

  // Stable canvas draw — reads from refs so it can be called from MutationObserver
  // without becoming stale between renders.
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const bars = waveformBarsRef.current;
    const prog = waveformProgressRef.current;

    if (!canvas || !bars.length || isWaveformCompact) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight || 24;

    if (w < 4) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Read CSS variables fresh every draw so dark/light mode always renders correctly
    const styles = getComputedStyle(document.documentElement);
    const progressColor = styles.getPropertyValue("--waveform-progress").trim();
    const inactiveColor = styles.getPropertyValue("--waveform-color").trim();

    const midY = h / 2;
    const progressBars = Math.floor(bars.length * prog);

    for (let i = 0; i < bars.length; i++) {
      const x = i * BAR_TOTAL;
      ctx.fillStyle = i < progressBars ? progressColor : inactiveColor;
      ctx.fillRect(x, midY - bars[i] / 2, BAR_WIDTH, bars[i]);
    }
  }, [isWaveformCompact]);

  // Sync refs and redraw on progress or waveform data change
  useEffect(() => {
    waveformBarsRef.current = waveformBars;
    waveformProgressRef.current = progress;
    drawCanvas();
  }, [waveformBars, progress, drawCanvas]);

  // Redraw when theme changes (class toggled on <html> by ThemeContext)
  useEffect(() => {
    const observer = new MutationObserver(drawCanvas);
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [drawCanvas]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setWaveformWidth(Math.floor(container.getBoundingClientRect().width));
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateWidth);

    const t1 = window.setTimeout(updateWidth, 0);
    const t2 = window.setTimeout(updateWidth, 100);
    const t3 = window.setTimeout(updateWidth, 300);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isWaveformCompact) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const nextProgress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Update canvas immediately for instant visual feedback before the seek resolves
    waveformProgressRef.current = nextProgress;
    drawCanvas();

    seekTo(currentSong, nextProgress, isPlaying);
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
    setMoreOpen(false);
    closePlayer();
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[45] flex h-[72px] items-center border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4">
        <div className="flex w-[clamp(185px,22vw,320px)] flex-shrink-0 items-center gap-3">
          {currentSong.coverArt ? (
            <div className="relative h-10 w-10 flex-shrink-0">
              <Image
                src={currentSong.coverArt}
                alt={currentSong.title}
                fill
                sizes="40px"
                className="rounded object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 flex-shrink-0 rounded bg-[var(--bg-hover)]" />
          )}

          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--text-primary)]">
              {currentSong.title}
            </div>
            <div className="truncate text-xs text-[var(--text-subtle)]">
              {currentSong.artist}
            </div>
          </div>
        </div>

        <div className="mx-[clamp(12px,2vw,24px)] flex min-w-0 flex-1 items-center justify-center gap-[clamp(12px,2vw,24px)]">
          <button
            type="button"
            onClick={() => navigateTrack("prev")}
            className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
            aria-label="Previous song"
          >
            <PreviousTrackIcon />
          </button>

          <button
            type="button"
            onClick={() => togglePlayPause(currentSong)}
            className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
            aria-label={isPlaying ? "Pause song" : "Play song"}
          >
            {isPlaying ? <PlayerPauseIcon /> : <PlayerPlayIcon />}
          </button>

          <button
            type="button"
            onClick={() => navigateTrack("next")}
            className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
            aria-label="Next song"
          >
            <NextTrackIcon />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center">
            {/* Compact time display (narrow screens) */}
            <div className="flex h-[24px] w-[86px] flex-shrink-0 items-center justify-center whitespace-nowrap text-xs text-[var(--icon-color)] min-[791px]:hidden">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Waveform + timestamps (wide screens) */}
            <div className="hidden min-w-0 flex-1 items-center gap-4 min-[791px]:flex">
              <span className={`${isWaveformCompact ? "invisible" : ""} w-10 flex-shrink-0 text-right text-xs text-[var(--icon-color)]`}>
                {formatTime(currentTime)}
              </span>

              <div
                ref={containerRef}
                data-player-waveform-slot
                className="relative flex h-[24px] min-w-0 max-w-[500px] flex-1 cursor-pointer items-center"
                onClick={handleWaveformClick}
              >
                {isWaveformCompact ? (
                  <div className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-xs text-[var(--icon-color)]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                ) : (
                  // Canvas waveform — redraws imperatively on progress/theme change.
                  // Replaces 260+ div elements that re-evaluated color on every tick.
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full"
                    style={{ display: "block" }}
                  />
                )}
              </div>

              <span className={`${isWaveformCompact ? "invisible" : ""} w-10 flex-shrink-0 text-xs text-[var(--icon-color)]`}>
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-shrink-0 items-center">
          <div className="mr-[clamp(16px,4vw,40px)] flex items-center gap-[clamp(24px,5vw,40px)] text-xs text-[var(--text-secondary)] max-[600px]:hidden">
            <span>{currentSong.key}</span>
            <span className="max-[645px]:hidden">{currentSong.bpm} BPM</span>
          </div>

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
                className={`${iconButtonClass} ${
                  open
                    ? "bg-[var(--icon-button-hover)] text-[var(--text-primary)]"
                    : ""
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
