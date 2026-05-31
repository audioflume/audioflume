import {
  formatEditPointTime,
  getEditPointFilterLabel,
  getMarkerType,
  getSongCuePointMarkers,
  MusicPlayerShell,
  normalizeEditPointType,
  type MusicPlayerShellLayout,
} from "@filmwave/shared";
import { exists } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMusicLibrarySyncedSongPath,
  syncSongToMusicLibraryFolder,
} from "../../../lib/musicLibrarySync";
import CheckIcon from "../../icons/CheckIcon";
import EditPointsIcon from "../../icons/EditPointsIcon";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import SyncIcon from "../../icons/SyncIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

const SETTINGS_STORE = "filmwave-settings.json";
const PREVIOUS_CUE_SKIP_BACK_SECONDS = 1.35;
const NEXT_CUE_SKIP_AHEAD_SECONDS = 0.25;

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
    return sortedCuePoints.find((marker) => marker.time > threshold) || sortedCuePoints[0];
  }

  const threshold = currentTime - PREVIOUS_CUE_SKIP_BACK_SECONDS;
  return (
    [...sortedCuePoints].reverse().find((marker) => marker.time < threshold) ||
    sortedCuePoints[sortedCuePoints.length - 1]
  );
}

function CuePreviousIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CueNextIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
  onMarkersVisibleChange,
  onPlayPause,
  onPrevious,
  onNext,
  onFavoriteToggle,
  onProgressChange,
}: {
  song: DesktopMusicSong;
  isPlaying: boolean;
  favorite: boolean;
  markersVisible: boolean;
  selectedCuePointTypes?: string[];
  seekRequest?: DesktopMusicPlayerSeekRequest | null;
  onMarkersVisibleChange: (visible: boolean) => void;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFavoriteToggle: () => void;
  onProgressChange?: (progress: DesktopMusicPlayerProgress) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handledSeekRequestIdRef = useRef<number | null>(null);
  const pendingSeekRequestRef = useRef<DesktopMusicPlayerSeekRequest | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.durationSeconds || 0);
  const [syncFolder, setSyncFolder] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SongSyncStatus>("idle");

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
  }, [cuePoints, hasSelectedCuePointTypes, markersVisible, selectedCuePointTypeSet]);
  const previousCuePoint = useMemo(
    () => getAdjacentCuePoint(visibleCuePoints, currentTime, "previous"),
    [visibleCuePoints, currentTime],
  );
  const nextCuePoint = useMemo(
    () => getAdjacentCuePoint(visibleCuePoints, currentTime, "next"),
    [visibleCuePoints, currentTime],
  );
  const isSynced = syncStatus === "synced";
  const syncLabel =
    syncStatus === "synced"
      ? "Song synced"
      : syncStatus === "syncing"
        ? "Syncing song"
        : syncStatus === "error"
          ? "Retry sync"
          : syncFolder
            ? "Sync song"
            : "Choose a sync folder to sync songs";

  useEffect(() => {
    let cancelled = false;

    async function loadSyncFolder() {
      const store = await load(SETTINGS_STORE);
      const nextSyncFolder = await store.get<string>("syncFolder");

      if (!cancelled) setSyncFolder(nextSyncFolder ?? null);
    }

    void loadSyncFolder();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkSyncedStatus() {
      setSyncStatus("idle");

      if (!syncFolder) return;

      const localPath = getMusicLibrarySyncedSongPath({ song, syncFolder });
      const synced = await exists(localPath);

      if (!cancelled) setSyncStatus(synced ? "synced" : "idle");
    }

    void checkSyncedStatus();

    return () => {
      cancelled = true;
    };
  }, [song, syncFolder]);

  useEffect(() => {
    const pendingSeekRequest = pendingSeekRequestRef.current;

    if (pendingSeekRequest?.songId === song.id) {
      const nextDuration = song.durationSeconds || 0;
      setCurrentTime(nextDuration * pendingSeekRequest.progress);
      setDuration(nextDuration);
      return;
    }

    setCurrentTime(0);
    setDuration(song.durationSeconds || 0);
  }, [song.id, song.durationSeconds]);

  useEffect(() => {
    onProgressChange?.({
      songId: song.id,
      currentTime,
      duration: duration || song.durationSeconds || 0,
    });
  }, [currentTime, duration, onProgressChange, song.durationSeconds, song.id]);

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
    if (!audio || !duration) return;

    const nextTime = progress * duration;
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

      const nextDuration = audio.duration && Number.isFinite(audio.duration)
        ? audio.duration
        : song.durationSeconds || duration;

      if (!nextDuration) return;

      const nextTime = safeProgress * nextDuration;
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
      setDuration(nextDuration);

      pendingSeekRequestRef.current = null;

      if (seekRequest.shouldPlay && audio.paused) {
        audio.play().catch((error) =>
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

  function jumpToCuePoint(marker: CuePointMarker | null) {
    if (!marker || !duration) return;
    seek(Math.max(0, Math.min(1, marker.time / duration)));
  }

  function renderCueMarkerOverlay() {
    if (!markersVisible) return null;

    return visibleCuePoints.map((marker) => {
      const label = getCueLabel(marker);
      const progressValue = duration ? marker.time / duration : 0;
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
              width: hasSelectedCuePointTypes ? "var(--cue-marker-width-active)" : "var(--cue-marker-width)",
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
    if (!markersVisible || !layout.showWaveform || layout.playerWidth < 940 || visibleCuePoints.length === 0) {
      return null;
    }

    return (
      <div className="filmwave-player-cue-controls">
        <button
          type="button"
          title={previousCuePoint ? `Previous cue · ${getCueLabel(previousCuePoint)} · ${formatEditPointTime(previousCuePoint.time)}` : "Previous cue"}
          aria-label="Jump to previous cue point"
          onClick={() => jumpToCuePoint(previousCuePoint)}
          disabled={!previousCuePoint}
          className="filmwave-player-cue-button"
        >
          <CuePreviousIcon />
        </button>
        <button
          type="button"
          title={nextCuePoint ? `Next cue · ${getCueLabel(nextCuePoint)} · ${formatEditPointTime(nextCuePoint.time)}` : "Next cue"}
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

  async function syncSong() {
    if (!syncFolder || syncStatus === "syncing" || syncStatus === "synced") return;

    setSyncStatus("syncing");

    try {
      await syncSongToMusicLibraryFolder({ song, syncFolder });
      setSyncStatus("synced");
    } catch (error) {
      console.error(error);
      setSyncStatus("error");
    }
  }

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
        currentTime={currentTime}
        duration={duration || song.durationSeconds || 0}
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
              aria-label={favorite ? "Remove song from favorites" : "Favorite song"}
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
              aria-label={markersVisible ? "Hide cue markers" : "Show cue markers"}
              aria-pressed={markersVisible}
              className="filmwave-icon-button filmwave-icon-button-plain filmwave-player-marker-toggle"
              onClick={() => onMarkersVisibleChange(!markersVisible)}
            >
              <EditPointsIcon />
            </button>

            <button
              type="button"
              aria-label="Song options"
              className="filmwave-icon-button filmwave-icon-button-plain"
            >
              <MoreIcon size={14} />
            </button>

            <button
              type="button"
              aria-label={syncLabel}
              title={syncLabel}
              aria-pressed={isSynced}
              className={`filmwave-icon-button filmwave-icon-button-plain desktop-song-sync-button${
                isSynced ? " is-synced" : ""
              }${syncStatus === "syncing" ? " is-syncing" : ""}`}
              disabled={!syncFolder || syncStatus === "syncing" || isSynced}
              onClick={(event) => {
                event.stopPropagation();
                void syncSong();
              }}
            >
              <span className="desktop-song-sync-button-inner">
                {isSynced ? <CheckIcon size={10} strokeWidth={3} /> : <SyncIcon size={14} />}
              </span>
            </button>
          </>
        }
      />
    </>
  );
}
