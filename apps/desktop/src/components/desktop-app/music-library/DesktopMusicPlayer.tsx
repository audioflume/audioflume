import {
  DropdownShell,
  formatEditPointTime,
  getEditPointFilterLabel,
  getMarkerType,
  getSongCuePointMarkers,
  MusicPlayerShell,
  normalizeEditPointType,
  type MusicPlayerShellLayout,
} from "@filmwave/shared";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import EditPointsIcon from "../../icons/EditPointsIcon";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import SyncIcon from "../../icons/SyncIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

const PREVIOUS_CUE_SKIP_BACK_SECONDS = 1.35;
const NEXT_CUE_SKIP_AHEAD_SECONDS = 0.25;
const SONG_DRAG_START_DISTANCE = 5;
const NATIVE_FILE_DRAG_COMMAND = ["start", "native", "file", "drag"].join("_");

type SongSyncStatus = "idle" | "syncing" | "synced" | "error";
type CuePointMarker = ReturnType<typeof getSongCuePointMarkers>[number];

type DesktopMusicPlayerProgress = {
  songId: string;
  currentTime: number;
  duration: number;
};

export type DesktopMusicPlayerSeekRequest = {
  id: number;
  songId: string;
  progress: number;
  shouldPlay: boolean;
};

function getAudioSource(song: DesktopMusicSong) {
  return song.playbackUrl || song.audioUrl || song.hlsUrl || "";
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

function CuePreviousIcon() {
  return (
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
}

function CueNextIcon() {
  return (
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

export default function DesktopMusicPlayer({
  song,
  isPlaying,
  favorite,
  markersVisible,
  selectedCuePointTypes = [],
  seekRequest,
  syncStatus = "idle",
  syncedPath,
  canSync,
  onMarkersVisibleChange,
  onPlayPause,
  onPrevious,
  onNext,
  onFavoriteToggle,
  onProgressChange,
  onSync,
  onClosePlayer,
}: {
  song: DesktopMusicSong;
  isPlaying: boolean;
  favorite: boolean;
  markersVisible: boolean;
  selectedCuePointTypes?: string[];
  seekRequest?: DesktopMusicPlayerSeekRequest | null;
  syncStatus?: SongSyncStatus;
  syncedPath?: string | null;
  canSync: boolean;
  onMarkersVisibleChange: (visible: boolean) => void;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFavoriteToggle: () => void;
  onProgressChange?: (progress: DesktopMusicPlayerProgress) => void;
  onSync: () => void;
  onClosePlayer?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handledSeekRequestIdRef = useRef<number | null>(null);
  const pendingSeekRequestRef = useRef<DesktopMusicPlayerSeekRequest | null>(
    null,
  );
  const songDragStartRef = useRef<{
    x: number;
    y: number;
    started: boolean;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.durationSeconds || 0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [playerClosed, setPlayerClosed] = useState(false);

  const audioSource = useMemo(() => getAudioSource(song), [song]);
  const normalizedSelectedCuePointTypes = useMemo(
    () => selectedCuePointTypes.map(normalizeEditPointType),
    [selectedCuePointTypes],
  );
  const selectedCuePointTypeSet = useMemo(
    () => new Set(normalizedSelectedCuePointTypes),
    [normalizedSelectedCuePointTypes],
  );
  const cuePoints = useMemo(() => getSongCuePointMarkers(song), [song]);
  const hasSelectedCuePointTypes = selectedCuePointTypeSet.size > 0;
  const visibleCuePoints = useMemo(() => {
    if (!markersVisible) return [];
    if (!hasSelectedCuePointTypes) return cuePoints;

    return cuePoints.filter((marker) =>
      selectedCuePointTypeSet.has(getMarkerType(marker)),
    );
  }, [
    cuePoints,
    hasSelectedCuePointTypes,
    markersVisible,
    selectedCuePointTypeSet,
  ]);
  const isUnhandledSeekRequest =
    seekRequest?.songId === song.id &&
    handledSeekRequestIdRef.current !== seekRequest.id;
  const displayDuration = duration || song.durationSeconds || 0;
  const displayCurrentTime =
    isUnhandledSeekRequest && displayDuration
      ? Math.max(
          0,
          Math.min(displayDuration, seekRequest.progress * displayDuration),
        )
      : currentTime;
  const previousCuePoint = useMemo(
    () => getAdjacentCuePoint(visibleCuePoints, displayCurrentTime, "previous"),
    [visibleCuePoints, displayCurrentTime],
  );
  const nextCuePoint = useMemo(
    () => getAdjacentCuePoint(visibleCuePoints, displayCurrentTime, "next"),
    [visibleCuePoints, displayCurrentTime],
  );
  const isSynced = syncStatus === "synced" && Boolean(syncedPath);
  const syncLabel = isSynced
    ? "Drag synced song file"
    : syncStatus === "syncing"
      ? "Syncing song"
      : syncStatus === "error"
        ? "Retry sync"
        : canSync
          ? "Sync song"
          : "Choose a sync folder to sync songs";

  useEffect(() => {
    const pendingSeekRequest = pendingSeekRequestRef.current;
    const nextDuration = song.durationSeconds || 0;
    const activeSeekRequest =
      seekRequest?.songId === song.id &&
      handledSeekRequestIdRef.current !== seekRequest.id
        ? seekRequest
        : null;

    if (pendingSeekRequest?.songId === song.id) {
      setCurrentTime(nextDuration * pendingSeekRequest.progress);
      setDuration(nextDuration);
      return;
    }

    if (activeSeekRequest) {
      setCurrentTime(nextDuration * activeSeekRequest.progress);
      setDuration(nextDuration);
      return;
    }

    setCurrentTime(0);
    setDuration(song.durationSeconds || 0);
  }, [seekRequest, song.id, song.durationSeconds]);

  useEffect(() => {
    setMoreOpen(false);
    setPlayerClosed(false);
  }, [song.id]);

  useEffect(() => {
    onProgressChange?.({
      songId: song.id,
      currentTime: displayCurrentTime,
      duration: displayDuration,
    });
  }, [displayCurrentTime, displayDuration, onProgressChange, song.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSource) return;

    if (isPlaying) {
      const playPromise = audio.play();

      if (playPromise) {
        playPromise.catch((error) =>
          console.warn("Could not play audio", error),
        );
      }
    } else {
      audio.pause();
    }
  }, [audioSource, isPlaying]);

  function seek(progress: number) {
    const audio = audioRef.current;
    if (!audio || !displayDuration) return;

    const nextTime = progress * displayDuration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  useEffect(() => {
    if (!seekRequest || seekRequest.songId !== song.id) return;
    if (handledSeekRequestIdRef.current === seekRequest.id) return;

    handledSeekRequestIdRef.current = seekRequest.id;
    pendingSeekRequestRef.current = seekRequest;

    const audio = audioRef.current;
    if (!audio) return;

    const safeProgress = Number.isFinite(seekRequest.progress)
      ? Math.max(0, Math.min(1, seekRequest.progress))
      : 0;

    const applySeek = () => {
      if (pendingSeekRequestRef.current?.id !== seekRequest.id) return;

      const nextDuration =
        audio.duration && Number.isFinite(audio.duration)
          ? audio.duration
          : song.durationSeconds || duration;

      if (!nextDuration) return;

      const nextTime = safeProgress * nextDuration;
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
      setDuration(nextDuration);

      pendingSeekRequestRef.current = null;

      if (seekRequest.shouldPlay && audio.paused) {
        audio
          .play()
          .catch((error) =>
            console.warn("Could not play audio after seek", error),
          );
      } else if (!seekRequest.shouldPlay && !audio.paused) {
        audio.pause();
      }
    };

    if (audio.duration && Number.isFinite(audio.duration)) {
      applySeek();
    } else {
      audio.addEventListener("loadedmetadata", applySeek, { once: true });
    }
  }, [duration, seekRequest, song.durationSeconds, song.id]);

  async function startSyncedSongDrag() {
    if (!isSynced || !syncedPath) return;

    try {
      await invoke(NATIVE_FILE_DRAG_COMMAND, { path: syncedPath });
    } catch (error) {
      console.warn("Could not start native song drag", error);
    }
  }

  function handleSyncedSongPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (!isSynced) return;

    event.preventDefault();
    event.stopPropagation();
    songDragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      started: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSyncedSongPointerMove(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const dragStart = songDragStartRef.current;

    if (!isSynced || !dragStart || dragStart.started) return;

    const distance = Math.hypot(
      event.clientX - dragStart.x,
      event.clientY - dragStart.y,
    );

    if (distance < SONG_DRAG_START_DISTANCE) return;

    dragStart.started = true;
    void startSyncedSongDrag();
  }

  function handleSyncedSongPointerEnd() {
    songDragStartRef.current = null;
  }

  function jumpToCuePoint(marker: CuePointMarker | null) {
    if (!marker || !displayDuration) return;
    seek(Math.max(0, Math.min(1, marker.time / displayDuration)));
  }

  function handleClosePlayer() {
    setMoreOpen(false);
    setPlayerClosed(true);
    audioRef.current?.pause();
    onClosePlayer?.();
  }

  function renderCueMarkerOverlay() {
    if (!markersVisible) return null;

    return visibleCuePoints.map((marker) => {
      const label = getCueLabel(marker);
      const progressValue = displayDuration ? marker.time / displayDuration : 0;
      const left = Math.max(0, Math.min(100, progressValue * 100));

      return (
        <button
          key={marker.id}
          type="button"
          aria-label={`Jump to ${label}`}
          className="filmwave-player-cue-marker"
          style={{ left: `${left}%` }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            jumpToCuePoint(marker);
          }}
        >
          <span
            className="filmwave-player-cue-marker-line"
            style={{
              width: hasSelectedCuePointTypes
                ? "var(--cue-marker-width-active)"
                : "var(--cue-marker-width)",
              opacity: "var(--cue-marker-opacity)",
            }}
          />
          <span className="filmwave-player-cue-marker-label">
            {label} · {formatEditPointTime(marker.time)}
          </span>
        </button>
      );
    });
  }

  function renderCueControls(layout: MusicPlayerShellLayout) {
    if (
      !markersVisible ||
      !layout.showWaveform ||
      layout.playerWidth < 940 ||
      visibleCuePoints.length === 0
    ) {
      return null;
    }

    return (
      <div className="filmwave-player-cue-controls">
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
          className="filmwave-player-cue-button"
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
          className="filmwave-player-cue-button"
        >
          <CueNextIcon />
        </button>
      </div>
    );
  }

  if (playerClosed) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={audioSource}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration || song.durationSeconds || 0)
        }
        onEnded={onNext}
      />

      <MusicPlayerShell
        song={{
          id: song.id,
          title: song.title,
          artist: song.artist,
          coverArt: song.coverArt,
          key: song.key,
          bpm: song.bpm,
          durationSeconds: song.durationSeconds,
        }}
        isPlaying={isPlaying}
        currentTime={displayCurrentTime}
        duration={displayDuration}
        waveformPeaks={song.waveform}
        waveformOverlay={renderCueMarkerOverlay()}
        renderWaveformEndSlot={renderCueControls}
        onPrevious={onPrevious}
        onPlayPause={onPlayPause}
        onNext={onNext}
        onSeek={seek}
        className="filmwave-music-player desktop-music-player"
        dataPlatform="desktop"
        actions={
          <>
            <button
              type="button"
              aria-label={
                favorite ? "Remove song from favorites" : "Favorite song"
              }
              aria-pressed={favorite}
              className={`filmwave-icon-button filmwave-icon-button-plain${
                favorite ? " is-active" : ""
              }`}
              onClick={onFavoriteToggle}
            >
              <HeartIcon size={14} filled={favorite} />
            </button>

            <button
              type="button"
              aria-label={
                markersVisible ? "Hide cue markers" : "Show cue markers"
              }
              aria-pressed={markersVisible}
              className="filmwave-icon-button filmwave-icon-button-plain filmwave-player-marker-toggle"
              onClick={() => onMarkersVisibleChange(!markersVisible)}
            >
              <EditPointsIcon />
            </button>

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
                  className={`filmwave-icon-button filmwave-icon-button-plain${open ? " is-open" : ""}`}
                >
                  <MoreIcon size={14} />
                </button>
              )}
            >
              <button type="button" onClick={() => setMoreOpen(false)}>
                <span>Add to Playlist</span>
              </button>
              <button type="button" onClick={() => setMoreOpen(false)}>
                <span>Add to Project</span>
              </button>
              <button type="button" onClick={() => setMoreOpen(false)}>
                <span>Create New Playlist</span>
              </button>
              {song.audioUrl ? (
                <a
                  href={song.audioUrl}
                  download
                  onClick={() => setMoreOpen(false)}
                >
                  <span>Download Song</span>
                </a>
              ) : (
                <button type="button" disabled>
                  <span>Download Song</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClosePlayer}
                className="danger-hover"
              >
                <span>Close Player</span>
                <CloseIcon />
              </button>
            </DropdownShell>

            <button
              type="button"
              aria-label={syncLabel}
              title={syncLabel}
              aria-pressed={isSynced}
              className={`filmwave-icon-button filmwave-icon-button-plain desktop-song-sync-button${
                isSynced ? " is-synced" : ""
              }${syncStatus === "syncing" ? " is-syncing" : ""}`}
              disabled={syncStatus === "syncing" || (!canSync && !isSynced)}
              onClick={(event) => {
                event.stopPropagation();
                if (!isSynced) onSync();
              }}
              onPointerDown={handleSyncedSongPointerDown}
              onPointerMove={handleSyncedSongPointerMove}
              onPointerUp={handleSyncedSongPointerEnd}
              onPointerCancel={handleSyncedSongPointerEnd}
            >
              <span className="desktop-song-sync-button-inner">
                {isSynced ? <SyncedFileIcon /> : <SyncIcon size={14} />}
              </span>
            </button>
          </>
        }
      />
    </>
  );
}

function SyncedFileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.75"
        y="4.25"
        width="10.5"
        height="10.5"
        rx="2.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="3.1 2.8"
      />
      <rect
        x="9.75"
        y="9.25"
        width="10.5"
        height="10.5"
        rx="2.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
