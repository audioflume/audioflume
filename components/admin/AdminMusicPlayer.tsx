"use client";

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
import { usePlayer } from "@/context/PlayerContext";
import MoreIcon from "@/components/icons/MoreIcon";
import Toast from "@/components/Toast";
import { iconButtonActiveClass, iconButtonClass } from "@/components/uiClasses";

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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizePeaks(peaks: number[]) {
  let maxVal = 0;

  for (let i = 0; i < peaks.length; i++) {
    const value = Math.abs(Number(peaks[i]) || 0);

    if (value > maxVal) {
      maxVal = value;
    }
  }

  if (maxVal <= 0) {
    return peaks.map(() => 0);
  }

  return peaks.map((peak) => Math.abs(Number(peak) || 0) / maxVal);
}

function buildWaveformBars(peaks: number[], width: number) {
  if (!peaks.length || width <= 0) return [];

  const barCount = Math.max(1, Math.floor(width / BAR_TOTAL));
  const normalizedPeaks = normalizePeaks(peaks);
  const samplesPerBar = normalizedPeaks.length / barCount;

  return Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor(index * samplesPerBar);
    const end = Math.min(
      normalizedPeaks.length,
      Math.floor((index + 1) * samplesPerBar),
    );

    let barPeak = 0;

    for (let i = start; i < end; i++) {
      if (normalizedPeaks[i] > barPeak) {
        barPeak = normalizedPeaks[i];
      }
    }

    return Math.max(2, Math.min(20, barPeak * 20));
  });
}

function PrevIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="19,20 9,12 19,4" />
      <rect x="5" y="4" width="2" height="16" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,4 15,12 5,20" />
      <rect x="17" y="4" width="2" height="16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AdminMusicPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    navigateTrack,
    seekTo,
    closePlayer,
  } = usePlayer();

  const containerRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [peaks, setPeaks] = useState<number[]>([]);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [moreMenuPosition, setMoreMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const progress =
    duration > 0 && isFinite(duration)
      ? Math.max(0, Math.min(1, currentTime / duration))
      : 0;

  const isWaveformCompact = waveformWidth <= WAVEFORM_HIDE_WIDTH;

  const waveformBars = useMemo(
    () => buildWaveformBars(peaks, waveformWidth),
    [peaks, waveformWidth],
  );

  const updateMoreMenuPosition = useCallback(() => {
    const trigger = moreButtonRef.current;
    const menu = moreMenuRef.current;

    if (!trigger || !menu) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    const viewportPadding = 16;
    const playerGap = 6;

    const left = clampNumber(
      triggerRect.right - menuRect.width,
      viewportPadding,
      window.innerWidth - menuRect.width - viewportPadding,
    );

    const top = Math.max(
      viewportPadding,
      triggerRect.top - menuRect.height - playerGap,
    );

    setMoreMenuPosition({
      top,
      left,
    });
  }, []);

  useEffect(() => {
    if (!currentSong) {
      setPeaks([]);
      return;
    }

    try {
      const parsed = JSON.parse(currentSong.waveformPeaks);

      setPeaks(
        Array.isArray(parsed)
          ? parsed.map((value) => {
              const numberValue = Number(value);
              return Number.isFinite(numberValue) ? numberValue : 0;
            })
          : [],
      );
    } catch {
      setPeaks([]);
    }
  }, [currentSong?.id, currentSong?.waveformPeaks]);

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

    const timeout1 = window.setTimeout(updateWidth, 0);
    const timeout2 = window.setTimeout(updateWidth, 100);
    const timeout3 = window.setTimeout(updateWidth, 300);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(timeout1);
      window.clearTimeout(timeout2);
      window.clearTimeout(timeout3);
    };
  }, [currentSong?.id]);

  useLayoutEffect(() => {
    if (!moreOpen) return;

    updateMoreMenuPosition();

    const frame = window.requestAnimationFrame(updateMoreMenuPosition);

    return () => window.cancelAnimationFrame(frame);
  }, [moreOpen, updateMoreMenuPosition]);

  useEffect(() => {
    if (!moreOpen) return;

    const handlePositionUpdate = () => {
      updateMoreMenuPosition();
    };

    window.addEventListener("resize", handlePositionUpdate);
    window.addEventListener("scroll", handlePositionUpdate, true);

    return () => {
      window.removeEventListener("resize", handlePositionUpdate);
      window.removeEventListener("scroll", handlePositionUpdate, true);
    };
  }, [moreOpen, updateMoreMenuPosition]);

  useEffect(() => {
    if (!moreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        moreButtonRef.current?.contains(target) ||
        moreMenuRef.current?.contains(target)
      ) {
        return;
      }

      setMoreOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen]);

  if (!currentSong) return null;

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isWaveformCompact) return;

    const rect = e.currentTarget.getBoundingClientRect();

    if (!rect.width) return;

    const nextProgress = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );

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
      <style>{`
        .music-player-more-menu {
          z-index: 95;
          width: 230px;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg-primary) 94%, transparent);
          box-shadow: var(--shadow-ui);
          backdrop-filter: blur(18px);
          padding: 6px;
          color: var(--text-primary);
        }

        .light .music-player-more-menu {
          background: color-mix(in srgb, var(--bg-primary) 98%, transparent);
        }

        .music-player-more-menu button,
        .music-player-more-menu a {
          display: flex;
          min-height: 38px;
          width: 100%;
          cursor: pointer;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 9px;
          padding: 0 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          transition:
            background 0.15s ease,
            color 0.15s ease,
            opacity 0.15s ease;
          text-decoration: none;
        }

        .music-player-more-menu button:hover,
        .music-player-more-menu a:hover {
          background: var(--bg-hover-strong);
          color: var(--text-primary);
        }

        .music-player-more-menu button:disabled {
          cursor: default;
          opacity: 0.45;
        }

        .music-player-more-menu button:disabled:hover {
          background: transparent;
          color: var(--text-secondary);
        }

        .music-player-more-menu-divider {
          height: 1px;
          margin: 6px 4px;
          background: var(--border-subtle);
        }

        .music-player-more-menu-close {
          color: var(--danger) !important;
        }

        .music-player-more-menu-close:hover {
          color: var(--danger) !important;
        }
      `}</style>

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
            <PrevIcon />
          </button>

          <button
            type="button"
            onClick={() => togglePlayPause(currentSong)}
            className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
            aria-label={isPlaying ? "Pause song" : "Play song"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            onClick={() => navigateTrack("next")}
            className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
            aria-label="Next song"
          >
            <NextIcon />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div className="flex h-[24px] w-[86px] flex-shrink-0 items-center justify-center whitespace-nowrap text-xs text-[var(--icon-color)] min-[791px]:hidden">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div className="hidden min-w-0 flex-1 items-center gap-4 min-[791px]:flex">
              <span
                className={`${isWaveformCompact ? "invisible" : ""} w-10 flex-shrink-0 text-right text-xs text-[var(--icon-color)]`}
              >
                {formatTime(currentTime)}
              </span>

              <div
                ref={containerRef}
                data-player-waveform-slot
                className="relative flex h-[24px] min-w-0 max-w-[500px] flex-1 cursor-pointer items-center"
                onClick={handleWaveformClick}
              >
                {!isWaveformCompact && (
                  <div className="flex h-full w-full items-center">
                    {waveformBars.map((barHeight, index) => {
                      const barProgress =
                        waveformBars.length > 0
                          ? index / waveformBars.length
                          : 0;

                      const isActive = barProgress <= progress;

                      return (
                        <div
                          key={index}
                          className="flex-shrink-0 rounded-full"
                          style={{
                            width: `${BAR_WIDTH}px`,
                            height: `${barHeight}px`,
                            marginRight: `${BAR_GAP}px`,
                            backgroundColor: isActive
                              ? "var(--waveform-progress)"
                              : "var(--waveform-color)",
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {isWaveformCompact && (
                  <div className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-xs text-[var(--icon-color)]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                )}
              </div>

              <span
                className={`${isWaveformCompact ? "invisible" : ""} w-10 flex-shrink-0 text-xs text-[var(--icon-color)]`}
              >
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

          <button
            ref={moreButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMoreOpen((open) => !open);
            }}
            className={`${iconButtonClass} ${
              moreOpen ? iconButtonActiveClass : ""
            }`}
            aria-label="Song options"
            aria-expanded={moreOpen}
          >
            <MoreIcon />
          </button>
        </div>
      </div>

      {moreOpen && (
        <div
          ref={moreMenuRef}
          className="music-player-more-menu fixed"
          style={{
            top: `${moreMenuPosition.top}px`,
            left: `${moreMenuPosition.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
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

          <div className="music-player-more-menu-divider" />

          <button
            type="button"
            onClick={handleClosePlayer}
            className="music-player-more-menu-close"
          >
            <span>Close Player</span>
            <CloseIcon />
          </button>
        </div>
      )}

      <Toast message={toastMessage} bottomOffset="88px" />
    </>
  );
}
