"use client";

import { usePlayer } from "@/context/PlayerContext";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import DownloadIcon from "@/components/icons/DownloadIcon";
import { iconButtonClass } from "@/components/uiClasses";

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const BAR_TOTAL = BAR_WIDTH + BAR_GAP;

const WAVEFORM_MIN_WIDTH = 780;
const FULL_COMPACT_TIME_MIN_WIDTH = 620;
const COMPACT_TIME_MIN_WIDTH = 500;
const KEY_MIN_WIDTH = 560;
const BPM_MIN_WIDTH = 700;

function formatTime(s: number) {
  if (!s || !isFinite(s)) return "0:00";

  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);

  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizePeaks(peaks: number[]) {
  let maxVal = 0;

  for (let i = 0; i < peaks.length; i++) {
    const v = Math.abs(Number(peaks[i]) || 0);
    if (v > maxVal) maxVal = v;
  }

  if (maxVal <= 0) return peaks.map(() => 0);

  return peaks.map((peak) => Math.abs(Number(peak) || 0) / maxVal);
}

function buildWaveformBars(peaks: number[], width: number) {
  if (!peaks.length || width <= 0) return [];

  const barCount = Math.max(1, Math.floor(width / BAR_TOTAL));
  const normalizedPeaks = normalizePeaks(peaks);
  const samplesPerBar = normalizedPeaks.length / barCount;

  return Array.from({ length: barCount }, (_, i) => {
    const start = Math.floor(i * samplesPerBar);
    const end = Math.min(
      normalizedPeaks.length,
      Math.floor((i + 1) * samplesPerBar),
    );

    let barPeak = 0;

    for (let j = start; j < end; j++) {
      if (normalizedPeaks[j] > barPeak) barPeak = normalizedPeaks[j];
    }

    return Math.max(2, Math.min(20, barPeak * 20));
  });
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

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={iconButtonClass}
    >
      {children}
    </button>
  );
}

export default function MusicPlayer() {
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

  const playerRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [playerWidth, setPlayerWidth] = useState(0);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [moreMenuPosition, setMoreMenuPosition] = useState({
    top: 0,
    left: 0,
  });

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

  const waveformBars = useMemo(
    () => buildWaveformBars(peaks, waveformWidth),
    [peaks, waveformWidth],
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
    const player = playerRef.current;
    if (!player) return;

    const updateWidth = () => {
      setPlayerWidth(Math.floor(player.getBoundingClientRect().width));
    };

    updateWidth();

    const ro = new ResizeObserver(updateWidth);

    ro.observe(player);
    window.addEventListener("resize", updateWidth);

    const t1 = window.setTimeout(updateWidth, 0);
    const t2 = window.setTimeout(updateWidth, 100);
    const t3 = window.setTimeout(updateWidth, 300);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [currentSong?.id]);

  useEffect(() => {
    if (!currentSong) {
      setPeaks([]);
      return;
    }

    try {
      const parsed = JSON.parse(currentSong.waveformPeaks);

      setPeaks(
        Array.isArray(parsed)
          ? parsed.map((v) => {
              const n = Number(v);
              return Number.isFinite(n) ? n : 0;
            })
          : [],
      );
    } catch {
      setPeaks([]);
    }
  }, [currentSong?.id, currentSong?.waveformPeaks]);

  useEffect(() => {
    if (!showWaveform) {
      setWaveformWidth(0);
      return;
    }

    const waveform = waveformRef.current;
    if (!waveform) return;

    const updateWidth = () => {
      setWaveformWidth(Math.floor(waveform.getBoundingClientRect().width));
    };

    updateWidth();

    const ro = new ResizeObserver(updateWidth);

    ro.observe(waveform);
    window.addEventListener("resize", updateWidth);

    const t1 = window.setTimeout(updateWidth, 0);
    const t2 = window.setTimeout(updateWidth, 100);
    const t3 = window.setTimeout(updateWidth, 300);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [currentSong?.id, showWaveform]);

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
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;

    const nextProgress = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );

    seekTo(currentSong, nextProgress, isPlaying);
  };

  const handleClosePlayer = () => {
    setMoreOpen(false);
    setAddToPlaylistOpen(false);
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

      <div
        ref={playerRef}
        className="fixed bottom-0 left-0 right-0 z-[45] grid h-[72px] items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4"
        style={{
          gridTemplateColumns,
          columnGap: `${mainGap}px`,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
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

        <div className="flex flex-shrink-0 items-center justify-center gap-[clamp(12px,2vw,24px)]">
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
        </div>

        {(showWaveform || showCompactTime) && (
          <div
            className="relative z-10 flex min-w-0 items-center justify-center overflow-hidden"
            style={{
              marginLeft: `${controlsToProgressGap - mainGap}px`,
              marginRight: `${progressToMetaGap - mainGap}px`,
            }}
          >
            {showWaveform ? (
              <div className="flex w-full min-w-0 items-center gap-4 overflow-hidden">
                <span className="w-10 flex-shrink-0 text-right text-xs text-[var(--icon-color)]">
                  {formatTime(currentTime)}
                </span>

                <div
                  ref={waveformRef}
                  data-player-waveform-slot
                  className="relative z-10 flex h-[24px] min-w-[80px] flex-1 cursor-pointer items-center overflow-hidden"
                  onClick={handleWaveformClick}
                >
                  <div className="relative z-10 flex h-full w-full items-center overflow-hidden">
                    {waveformBars.map((barHeight, index) => {
                      const barProgress =
                        waveformBars.length > 0
                          ? index / waveformBars.length
                          : 0;

                      const isActive = barProgress <= progress;

                      return (
                        <div
                          key={index}
                          className="relative z-10 flex-shrink-0 rounded-full"
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
          <div
            className="flex flex-shrink-0 items-center text-xs text-[var(--text-secondary)]"
            style={{
              gap: `${metaGap}px`,
            }}
          >
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
          className="flex flex-shrink-0 items-center justify-end gap-0.5"
          style={{
            marginLeft: `${metaToActionsGap - mainGap}px`,
          }}
        >
          <IconButton label="Favorite song">
            <HeartIcon />
          </IconButton>

          <button
            ref={moreButtonRef}
            type="button"
            aria-label="Song options"
            aria-expanded={moreOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMoreOpen((open) => !open);
            }}
            className={`${iconButtonClass} ${
              moreOpen
                ? "bg-[var(--icon-button-hover)] text-[var(--text-primary)]"
                : ""
            }`}
          >
            <MoreIcon />
          </button>

          {currentSong.audioUrl && (
            <a
              href={currentSong.audioUrl}
              download
              aria-label="Download song"
              className={iconButtonClass}
            >
              <DownloadIcon />
            </a>
          )}
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
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setAddToPlaylistOpen(true);
            }}
          >
            <span>Add to Playlist</span>
          </button>

          <button type="button" disabled>
            <span>Add to Project</span>
          </button>

          <button type="button" disabled>
            <span>Create New Playlist</span>
          </button>

          <button type="button" disabled>
            <span>Share Song</span>
          </button>

          {currentSong.audioUrl ? (
            <a href={currentSong.audioUrl} download>
              <span>Download Song</span>
              <DownloadIcon />
            </a>
          ) : (
            <button type="button" disabled>
              <span>Download Song</span>
            </button>
          )}

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

      <AddToPlaylistModal
        isOpen={addToPlaylistOpen}
        song={currentSong}
        onClose={() => setAddToPlaylistOpen(false)}
      />
    </>
  );
}
