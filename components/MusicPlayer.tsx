"use client";

import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import AddToProjectModal from "@/components/AddToProjectModal";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import IconButton from "@/components/IconButton";
import DownloadIcon from "@/components/icons/DownloadIcon";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import { iconButtonClass } from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
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
import { usePathname } from "next/navigation";
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
const MUSIC_LIBRARY_MARKER_VISIBILITY_EVENT =
  "filmwave:music-library-marker-visibility";

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

function isGlobalCueMarkerPage(pathname: string) {
  return (
    pathname === "/favorites" ||
    /^\/playlists\/[^/]+$/.test(pathname) ||
    /^\/curated-playlists\/[^/]+$/.test(pathname)
  );
}

function getMusicLibraryMarkerVisibilityFromEvent(event: Event) {
  const markerEvent = event as Event & { visible?: boolean };
  const customEvent = event as CustomEvent<{ visible?: boolean }>;

  if (typeof markerEvent.visible === "boolean") return markerEvent.visible;
  if (typeof customEvent.detail?.visible === "boolean") {
    return customEvent.detail.visible;
  }

  return null;
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
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M15 6L9 12L15 18"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CueNextIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M9 6L15 12L9 18"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

export default function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    remotePlayingInAnotherTab,
    currentTime,
    duration,
    togglePlayPause,
    navigateTrack,
    seekTo,
    closePlayer,
  } = usePlayer();

  const pathname = usePathname();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showEditPointMarkers } = useUserPreferences();

  const playerRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
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
  const [newPlaylistCoverPreview, setNewPlaylistCoverPreview] = useState<
    string | null
  >(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [
    musicLibraryShowEditPointMarkers,
    setMusicLibraryShowEditPointMarkers,
  ] = useState(false);
  const [selectedCuePointTypes, setSelectedCuePointTypes] = useState<string[]>(
    () => getStoredCuePointFilterSelection(),
  );
  const [moreMenuPosition, setMoreMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const effectiveShowEditPointMarkers =
    pathname === "/music"
      ? musicLibraryShowEditPointMarkers
      : isGlobalCueMarkerPage(pathname)
        ? showEditPointMarkers
        : false;
  const showWaveform = playerWidth >= WAVEFORM_MIN_WIDTH;
  const showFullCompactTime = playerWidth >= FULL_COMPACT_TIME_MIN_WIDTH;
  const showCompactTime =
    !showWaveform && playerWidth >= COMPACT_TIME_MIN_WIDTH;
  const showKey = playerWidth >= KEY_MIN_WIDTH;
  const showBpm = playerWidth >= BPM_MIN_WIDTH;
  const showRightMeta = showKey || showBpm;
  const favorited = currentSong ? isFavorite(currentSong.id) : false;
  const cuePoints = useMemo(
    () => (currentSong ? getSongCuePointMarkers(currentSong) : []),
    [currentSong],
  );
  const visibleCuePoints = effectiveShowEditPointMarkers ? cuePoints : [];
  const selectedCuePointTypeSet = useMemo(
    () => new Set(selectedCuePointTypes),
    [selectedCuePointTypes],
  );
  const hasSelectedCuePointTypes = selectedCuePointTypeSet.size > 0;
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
    if (pathname !== "/music") {
      setMusicLibraryShowEditPointMarkers(false);
      return;
    }

    const syncMusicLibraryMarkerVisibility = (event: Event) => {
      const visible = getMusicLibraryMarkerVisibilityFromEvent(event);

      if (visible === null) return;

      setMusicLibraryShowEditPointMarkers(visible);
    };

    window.addEventListener(
      MUSIC_LIBRARY_MARKER_VISIBILITY_EVENT,
      syncMusicLibraryMarkerVisibility,
    );

    return () => {
      window.removeEventListener(
        MUSIC_LIBRARY_MARKER_VISIBILITY_EVENT,
        syncMusicLibraryMarkerVisibility,
      );
    };
  }, [pathname]);

  useEffect(() => {
    const syncCuePointFilterSelection = (event?: Event) => {
      const customEvent = event as CustomEvent<{ selectedTypes?: string[] }>;
      const selectedTypes = customEvent?.detail?.selectedTypes;

      setSelectedCuePointTypes(
        Array.isArray(selectedTypes)
          ? selectedTypes
          : getStoredCuePointFilterSelection(),
      );
    };

    syncCuePointFilterSelection();
    window.addEventListener(
      CUE_POINT_FILTER_SELECTION_EVENT,
      syncCuePointFilterSelection,
    );
    window.addEventListener("storage", syncCuePointFilterSelection);

    return () => {
      window.removeEventListener(
        CUE_POINT_FILTER_SELECTION_EVENT,
        syncCuePointFilterSelection,
      );
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

    const t = window.setTimeout(updateWidth, 50);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(t);
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

  const jumpToCuePoint = (marker: CuePointMarker | null) => {
    if (!marker || !currentSong.duration) return;

    seekTo(
      currentSong,
      Math.max(0, Math.min(1, marker.time / currentSong.duration)),
      isPlaying,
    );
  };

  async function handleCreatePlaylist() {
    if (!newPlaylistName.trim() || isCreatingPlaylist) return;

    setIsCreatingPlaylist(true);

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPlaylistName,
          cover_image_url: newPlaylistCoverPreview,
        }),
      });

      if (!res.ok) {
        console.error("Failed to create playlist");
        return;
      }

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
        className="fixed bottom-0 left-0 right-0 z-[45] grid h-[72px] items-center justify-between overflow-visible border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4"
        style={{
          gridTemplateColumns,
          columnGap: `${mainGap}px`,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          {currentSong.coverArt ? (
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-none">
              <Image
                src={currentSong.coverArt}
                alt={currentSong.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 flex-shrink-0 rounded-none bg-[var(--bg-hover)]" />
          )}

          <div className="min-w-0">
            <div
              title={currentSong.title}
              className="truncate text-sm font-medium text-[var(--text-primary)]"
            >
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
                    const label =
                      marker.label || getEditPointFilterLabel(markerType);
                    const selected = selectedCuePointTypeSet.has(markerType);
                    const dimmed = hasSelectedCuePointTypes && !selected;
                    const progressValue = currentSong.duration
                      ? marker.time / currentSong.duration
                      : 0;
                    const left = Math.max(
                      0,
                      Math.min(100, progressValue * 100),
                    );

                    return (
                      <button
                        key={marker.id}
                        type="button"
                        aria-label={`Jump to ${label}`}
                        className="group/player-cue-point absolute top-1/2 z-30 h-[34px] w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0"
                        style={{
                          left: `${left}%`,
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          jumpToCuePoint(marker);
                        }}
                      >
                        <span
                          className="absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-full bg-[var(--cue-marker-color)]"
                          style={{
                            width: hasSelectedCuePointTypes
                              ? selected
                                ? "var(--cue-marker-width-active)"
                                : "var(--cue-marker-width-muted)"
                              : "var(--cue-marker-width)",
                            opacity: dimmed
                              ? "var(--cue-marker-opacity-muted)"
                              : "var(--cue-marker-opacity)",
                          }}
                        />
                        <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[80] flex -translate-x-1/2 translate-y-1 items-center whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition duration-150 group-hover/player-cue-point:translate-y-0 group-hover/player-cue-point:opacity-100">
                          {label} · {formatEditPointTime(marker.time)}
                        </span>
                      </button>
                    );
                  })}

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

                {showCuePointControls && (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title={
                        previousCuePoint
                          ? `Previous cue · ${getCueLabel(previousCuePoint)} · ${formatEditPointTime(previousCuePoint.time)}`
                          : "Previous cue"
                      }
                      aria-label="Jump to previous cue point"
                      onClick={() => jumpToCuePoint(previousCuePoint)}
                      disabled={!previousCuePoint}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)]"
                    >
                      <CuePreviousIcon />
                    </button>

                    <button
                      type="button"
                      title={
                        nextCuePoint
                          ? `Next cue · ${getCueLabel(nextCuePoint)} · ${formatEditPointTime(nextCuePoint.time)}`
                          : "Next cue"
                      }
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
          <IconButton
            label={favorited ? "Remove song from favorites" : "Favorite song"}
            active={favorited}
            onClick={() => toggleFavorite(currentSong)}
          >
            <HeartIcon filled={favorited} />
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

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setAddToProjectOpen(true);
            }}
          >
            <span>Add to Project</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setCreatePlaylistOpen(true);
            }}
          >
            <span>Create New Playlist</span>
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
            className="music-player-more-menu-close danger-hover"
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

      <AddToProjectModal
        isOpen={addToProjectOpen}
        song={currentSong}
        onClose={() => setAddToProjectOpen(false)}
      />

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
