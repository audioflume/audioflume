"use client";

import {
  buildWaveformBars,
  createWaveformCanvasDrawCache,
  drawWaveformBarsToCanvas,
  parseWaveformPeaks,
  type WaveformCanvasDrawCache,
  type WaveformColors,
} from "@filmwave/shared";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import AddToProjectModal from "@/components/AddToProjectModal";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import IconButton from "@/components/IconButton";
import DownloadIcon from "@/components/icons/DownloadIcon";
import EditPointsIcon from "@/components/icons/EditPointsIcon";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import { iconButtonClass } from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import {
  CUE_POINT_FILTER_SELECTION_EVENT,
  getStoredCuePointFilterSelection,
} from "@/lib/cuePointFilterSelection";
import {
  formatEditPointTime,
  getEditPointFilterLabel,
  getMarkerType,
  getSongCuePointMarkers,
} from "@/lib/editPointUtils";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const BAR_TOTAL = BAR_WIDTH + BAR_GAP;

const WAVEFORM_MIN_WIDTH = 780;
const FULL_COMPACT_TIME_MIN_WIDTH = 620;
const COMPACT_TIME_MIN_WIDTH = 500;
const KEY_MIN_WIDTH = 560;
const BPM_MIN_WIDTH = 700;
const PREVIOUS_CUE_SKIP_BACK_SECONDS = 1.35;
const NEXT_CUE_SKIP_AHEAD_SECONDS = 0.25;

type CuePointMarker = ReturnType<typeof getSongCuePointMarkers>[number];

function formatTime(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
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

function getCueLabel(marker: CuePointMarker) {
  const markerType = getMarkerType(marker);
  return marker.label || getEditPointFilterLabel(markerType);
}

function getAdjacentCuePoint(
  cuePoints: CuePointMarker[],
  currentTime: number,
  direction: "previous" | "next",
) {
  if (cuePoints.length === 0) return null;
  const sortedCuePoints = [...cuePoints].sort((a, b) => a.time - b.time);
  if (direction === "next") {
    const threshold = currentTime + NEXT_CUE_SKIP_AHEAD_SECONDS;
    return (
      sortedCuePoints.find((marker) => marker.time > threshold) ||
      sortedCuePoints[0]
    );
  }
  const threshold = currentTime - PREVIOUS_CUE_SKIP_BACK_SECONDS;
  return (
    [...sortedCuePoints].reverse().find((marker) => marker.time < threshold) ||
    sortedCuePoints[sortedCuePoints.length - 1]
  );
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

const CuePreviousIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CueNextIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    remotePlayingInAnotherTab,
    togglePlayPause,
    navigateTrack,
    seekTo,
    closePlayer,
  } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();

  const { isFavorite, toggleFavorite } = useFavorites();
  const { showEditPointMarkers, setShowEditPointMarkers } = useUserPreferences();

  const playerRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const playerCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformBarsRef = useRef<number[]>([]);
  const waveformProgressRef = useRef(0);
  const playerCanvasAnimationFrameRef = useRef<number | null>(null);
  const playerCanvasDrawCacheRef = useRef<WaveformCanvasDrawCache>(
    createWaveformCanvasDrawCache(),
  );
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [playerWidth, setPlayerWidth] = useState(0);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistCoverPreview, setNewPlaylistCoverPreview] = useState<string | null>(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [selectedCuePointTypes, setSelectedCuePointTypes] = useState<string[]>(
    () => getStoredCuePointFilterSelection(),
  );
  const [moreMenuPosition, setMoreMenuPosition] = useState({ top: 0, left: 0 });

  const effectiveShowEditPointMarkers = showEditPointMarkers;
  const showWaveform = playerWidth >= WAVEFORM_MIN_WIDTH;
  const showFullCompactTime = playerWidth >= FULL_COMPACT_TIME_MIN_WIDTH;
  const showCompactTime = !showWaveform && playerWidth >= COMPACT_TIME_MIN_WIDTH;
  const showKey = playerWidth >= KEY_MIN_WIDTH;
  const showBpm = playerWidth >= BPM_MIN_WIDTH;
  const showRightMeta = showKey || showBpm;
  const favorited = currentSong ? isFavorite(currentSong.id) : false;

  const cuePoints = useMemo(
    () => (currentSong ? getSongCuePointMarkers(currentSong) : []),
    [currentSong],
  );
  const selectedCuePointTypeSet = useMemo(
    () => new Set(selectedCuePointTypes),
    [selectedCuePointTypes],
  );
  const hasSelectedCuePointTypes = selectedCuePointTypeSet.size > 0;
  const visibleCuePoints = useMemo(() => {
    if (!effectiveShowEditPointMarkers) return [];
    if (!hasSelectedCuePointTypes) return cuePoints;
    return cuePoints.filter((marker) =>
      selectedCuePointTypeSet.has(getMarkerType(marker)),
    );
  }, [cuePoints, effectiveShowEditPointMarkers, hasSelectedCuePointTypes, selectedCuePointTypeSet]);

  const previousCuePoint = useMemo(
    () => getAdjacentCuePoint(visibleCuePoints, currentTime, "previous"),
    [visibleCuePoints, currentTime],
  );
  const nextCuePoint = useMemo(
    () => getAdjacentCuePoint(visibleCuePoints, currentTime, "next"),
    [visibleCuePoints, currentTime],
  );
  const showCuePointControls =
    effectiveShowEditPointMarkers &&
    showWaveform &&
    playerWidth >= 940 &&
    visibleCuePoints.length > 0;

  const compressionProgress = clampNumber((playerWidth - 780) / 520, 0, 1);
  const mainGap = 22 + compressionProgress * 24;
  const controlsToProgressGap = 18 + compressionProgress * 18;
  const metaGap = 24 + compressionProgress * 30;
  const progressToMetaGap = 22 + compressionProgress * 24;
  const metaToActionsGap = 18 + compressionProgress * 18;
  const songInfoWidth = clampNumber(150 + ((playerWidth - 620) / 580) * 50, 150, 200);
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
    const top = Math.max(viewportPadding, triggerRect.top - menuRect.height - playerGap);
    setMoreMenuPosition({ top, left });
  }, []);

  useEffect(() => {
    const syncCuePointFilterSelection = (event?: Event) => {
      const customEvent = event as CustomEvent<{ selectedTypes?: string[] }>;
      const selectedTypes = customEvent?.detail?.selectedTypes;
      setSelectedCuePointTypes(
        Array.isArray(selectedTypes) ? selectedTypes : getStoredCuePointFilterSelection(),
      );
    };
    syncCuePointFilterSelection();
    window.addEventListener(CUE_POINT_FILTER_SELECTION_EVENT, syncCuePointFilterSelection);
    window.addEventListener("storage", syncCuePointFilterSelection);
    return () => {
      window.removeEventListener(CUE_POINT_FILTER_SELECTION_EVENT, syncCuePointFilterSelection);
      window.removeEventListener("storage", syncCuePointFilterSelection);
    };
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
    const t = window.setTimeout(updateWidth, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(t);
    };
  }, [currentSong?.id]);

  useEffect(() => {
    if (!currentSong) {
      setPeaks([]);
      return;
    }
    setPeaks(parseWaveformPeaks(currentSong.waveformPeaks));
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
  }, [currentSong?.id, showWaveform, schedulePlayerCanvasDraw]);

  useLayoutEffect(() => {
    if (!moreOpen) return;
    updateMoreMenuPosition();
    const frame = window.requestAnimationFrame(updateMoreMenuPosition);
    return () => window.cancelAnimationFrame(frame);
  }, [moreOpen, updateMoreMenuPosition]);

  useEffect(() => {
    if (!moreOpen) return;
    const handlePositionUpdate = () => updateMoreMenuPosition();
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
      if (moreButtonRef.current?.contains(target) || moreMenuRef.current?.contains(target)) return;
      setMoreOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
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
    const nextProgress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    waveformProgressRef.current = nextProgress;
    seekTo(currentSong, nextProgress, isPlaying);
    schedulePlayerCanvasDraw();
  };

  const jumpToCuePoint = (marker: CuePointMarker | null) => {
    if (!marker || !currentSong.duration) return;
    const nextProgress = Math.max(0, Math.min(1, marker.time / currentSong.duration));
    waveformProgressRef.current = nextProgress;
    seekTo(currentSong, nextProgress, isPlaying);
    schedulePlayerCanvasDraw();
  };

  async function handleCreatePlaylist() {
    if (!newPlaylistName.trim() || isCreatingPlaylist) return;
    setIsCreatingPlaylist(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName, cover_image_url: newPlaylistCoverPreview }),
      });
      if (!res.ok) { console.error("Failed to create playlist"); return; }
      setNewPlaylistName("");
      setNewPlaylistCoverPreview(null);
      setCreatePlaylistOpen(false);
    } finally {
      setIsCreatingPlaylist(false);
    }
  }

  const handleClosePlayer = () => {
    setMoreOpen(false);
    setAddToPlaylistOpen(false);
    setAddToProjectOpen(false);
    setCreatePlaylistOpen(false);
    setNewPlaylistName("");
    setNewPlaylistCoverPreview(null);
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
              <Image src={currentSong.coverArt} alt={currentSong.title} fill sizes="40px" className="object-cover" />
            </div>
          ) : (
            <div className="filmwave-player-cover" />
          )}
          <div className="filmwave-player-song-copy">
            <div title={currentSong.title} className="filmwave-player-title">
              {currentSong.title}
            </div>
            <div
              title={remotePlayingInAnotherTab ? "Playing in another tab" : currentSong.artist}
              className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[var(--text-subtle)]"
            >
              {remotePlayingInAnotherTab ? (
                <>
                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--text-muted)] opacity-40" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                  </span>
                  <span className="truncate text-[var(--text-muted)]">Playing in another tab</span>
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
                  {visibleCuePoints.map((marker) => {
                    const markerType = getMarkerType(marker);
                    const label = marker.label || getEditPointFilterLabel(markerType);
                    const progressValue = currentSong.duration ? marker.time / currentSong.duration : 0;
                    const left = Math.max(0, Math.min(100, progressValue * 100));
                    return (
                      <button
                        key={marker.id}
                        type="button"
                        aria-label={`Jump to ${label}`}
                        className="group/player-cue-point absolute top-1/2 z-30 h-[34px] w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0"
                        style={{ left: `${left}%` }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          jumpToCuePoint(marker);
                        }}
                      >
                        <span
                          className="absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-full bg-[var(--cue-marker-color)]"
                          style={{
                            width: hasSelectedCuePointTypes ? "var(--cue-marker-width-active)" : "var(--cue-marker-width)",
                            opacity: "var(--cue-marker-opacity)",
                          }}
                        />
                        <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[80] flex -translate-x-1/2 translate-y-1 items-center whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition duration-150 group-hover/player-cue-point:translate-y-0 group-hover/player-cue-point:opacity-100">
                          {label} · {formatEditPointTime(marker.time)}
                        </span>
                      </button>
                    );
                  })}

                  <canvas
                    ref={playerCanvasRef}
                    className="relative z-10 h-full w-full"
                    style={{ display: "block" }}
                  />
                </div>

                <span className="w-10 flex-shrink-0 text-xs text-[var(--icon-color)]">
                  {formatTime(duration)}
                </span>

                {showCuePointControls && (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title={previousCuePoint ? `Previous cue · ${getCueLabel(previousCuePoint)} · ${formatEditPointTime(previousCuePoint.time)}` : "Previous cue"}
                      aria-label="Jump to previous cue point"
                      onClick={() => jumpToCuePoint(previousCuePoint)}
                      disabled={!previousCuePoint}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)]"
                    >
                      <CuePreviousIcon />
                    </button>
                    <button
                      type="button"
                      title={nextCuePoint ? `Next cue · ${getCueLabel(nextCuePoint)} · ${formatEditPointTime(nextCuePoint.time)}` : "Next cue"}
                      aria-label="Jump to next cue point"
                      onClick={() => jumpToCuePoint(nextCuePoint)}
                      disabled={!nextCuePoint}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)]"
                    >
                      <CueNextIcon />
                    </button>
                  </div>
                )}
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
            className="filmwave-player-meta"
            style={{ gap: `${metaGap}px` }}
          >
            {showKey && <span className="whitespace-nowrap">{currentSong.key || "—"}</span>}
            {showBpm && <span className="whitespace-nowrap">{currentSong.bpm ? `${currentSong.bpm} BPM` : "—"}</span>}
          </div>
        )}

        <div
          className="filmwave-player-actions"
          style={{ marginLeft: `${metaToActionsGap - mainGap}px` }}
        >
          <IconButton
            label={favorited ? "Remove song from favorites" : "Favorite song"}
            active={favorited}
            onClick={() => toggleFavorite(currentSong)}
          >
            <HeartIcon filled={favorited} />
          </IconButton>

          <IconButton
            label={showEditPointMarkers ? "Hide cue markers" : "Show cue markers"}
            active={showEditPointMarkers}
            activeClassName="bg-[var(--text-primary)] text-[var(--bg-primary)]"
            onClick={() => setShowEditPointMarkers(!showEditPointMarkers)}
          >
            <EditPointsIcon />
          </IconButton>

          <button
            ref={moreButtonRef}
            type="button"
            aria-label="Song options"
            aria-expanded={moreOpen}
            onClick={(e) => { e.stopPropagation(); setMoreOpen((open) => !open); }}
            className={`${iconButtonClass} ${moreOpen ? "bg-[var(--icon-button-hover)] text-[var(--text-primary)]" : ""}`}
          >
            <MoreIcon />
          </button>

          {currentSong.audioUrl && (
            <a href={currentSong.audioUrl} download aria-label="Download song" className={iconButtonClass}>
              <DownloadIcon />
            </a>
          )}
        </div>
      </div>

      {moreOpen && (
        <div
          ref={moreMenuRef}
          className="music-player-more-menu fixed"
          style={{ top: `${moreMenuPosition.top}px`, left: `${moreMenuPosition.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => { setMoreOpen(false); setAddToPlaylistOpen(true); }}>
            <span>Add to Playlist</span>
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setAddToProjectOpen(true); }}>
            <span>Add to Project</span>
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setCreatePlaylistOpen(true); }}>
            <span>Create New Playlist</span>
          </button>
          {currentSong.audioUrl ? (
            <a href={currentSong.audioUrl} download>
              <span>Download Song</span>
            </a>
          ) : (
            <button type="button" disabled><span>Download Song</span></button>
          )}
          <button type="button" onClick={handleClosePlayer} className="music-player-more-menu-close danger-hover">
            <span>Close Player</span>
            <CloseIcon />
          </button>
        </div>
      )}

      <AddToPlaylistModal isOpen={addToPlaylistOpen} song={currentSong} onClose={() => setAddToPlaylistOpen(false)} />
      <AddToProjectModal isOpen={addToProjectOpen} song={currentSong} onClose={() => setAddToProjectOpen(false)} />
      <CreatePlaylistModal
        isOpen={createPlaylistOpen}
        name={newPlaylistName}
        coverPreview={newPlaylistCoverPreview}
        isCreating={isCreatingPlaylist}
        onNameChange={setNewPlaylistName}
        onCoverPreviewChange={setNewPlaylistCoverPreview}
        onCreate={handleCreatePlaylist}
        onClose={() => {
          if (isCreatingPlaylist) return;
          setNewPlaylistName("");
          setNewPlaylistCoverPreview(null);
          setCreatePlaylistOpen(false);
        }}
      />
    </>
  );
}
