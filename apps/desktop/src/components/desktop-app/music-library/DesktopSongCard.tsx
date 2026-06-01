import {
  getSongCuePointMarkers,
  normalizeEditPointType,
  parseEditPoints,
  SongCardCuePointOverlay,
  SongCardShell,
  SongCardStemsSlot,
  SongCardWaveform,
  type SharedWaveformCanvasHandle,
} from "@filmwave/shared";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import CheckIcon from "../../icons/CheckIcon";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import SyncIcon from "../../icons/SyncIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

const SONG_DRAG_START_DISTANCE = 5;
const NATIVE_FILE_DRAG_COMMAND = ["start", "native", "file", "drag"].join("_");

type SongSyncStatus = "idle" | "syncing" | "synced" | "error";

export default function DesktopSongCard({
  song,
  favorite,
  markersVisible,
  selectedCuePointTypes = [],
  isSelected,
  isPlaying,
  playbackProgress = 0,
  pendingSeekProgress = null,
  syncStatus = "idle",
  syncedPath,
  cardRef,
  onFavoriteToggle,
  onPlay,
  onSeek,
  onSync,
}: {
  song: DesktopMusicSong;
  favorite: boolean;
  markersVisible: boolean;
  selectedCuePointTypes?: string[];
  isSelected: boolean;
  isPlaying: boolean;
  playbackProgress?: number;
  pendingSeekProgress?: number | null;
  syncStatus?: SongSyncStatus;
  syncedPath?: string | null;
  cardRef?: Ref<HTMLElement>;
  onFavoriteToggle: () => void;
  onPlay: () => void;
  onSeek: (progress: number) => void;
  onSync: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [stemsOpen, setStemsOpen] = useState(false);
  const [visualProgress, setVisualProgress] = useState(pendingSeekProgress ?? playbackProgress);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const waveformRef = useRef<SharedWaveformCanvasHandle | null>(null);
  const songDragStartRef = useRef<{ x: number; y: number; started: boolean } | null>(null);
  const visibleGenres = [song.genre, song.mood].filter(Boolean).join(", ");
  const isSynced = syncStatus === "synced" && Boolean(syncedPath);
  const normalizedSelectedCuePointTypes = useMemo(
    () => selectedCuePointTypes.map(normalizeEditPointType),
    [selectedCuePointTypes],
  );
  const editPoints = useMemo(() => parseEditPoints(song.editPoints), [song.editPoints]);
  const cuePoints = useMemo(() => getSongCuePointMarkers(song), [song]);

  useEffect(() => {
    const nextProgress = pendingSeekProgress ?? playbackProgress;
    setVisualProgress(nextProgress);
    waveformRef.current?.seekTo(nextProgress);
  }, [pendingSeekProgress, playbackProgress, song.id]);

  useEffect(() => {
    if (!actionsOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActionsOpen(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [actionsOpen]);

  async function startSyncedSongDrag() {
    if (!isSynced || !syncedPath) return;

    try {
      await invoke(NATIVE_FILE_DRAG_COMMAND, { path: syncedPath });
    } catch (error) {
      console.warn("Could not start native song drag", error);
    }
  }

  function handleSyncedSongPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isSynced) return;

    event.preventDefault();
    event.stopPropagation();
    songDragStartRef.current = { x: event.clientX, y: event.clientY, started: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSyncedSongPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const dragStart = songDragStartRef.current;

    if (!isSynced || !dragStart || dragStart.started) return;

    const distance = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y);

    if (distance < SONG_DRAG_START_DISTANCE) return;

    dragStart.started = true;
    void startSyncedSongDrag();
  }

  function handleSyncedSongPointerEnd() {
    songDragStartRef.current = null;
  }

  function handleWaveformSeek(progress: number) {
    const safeProgress = Number.isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;

    setVisualProgress(safeProgress);
    waveformRef.current?.seekTo(safeProgress);
    onSeek(safeProgress);
  }

  const markerOverlay = markersVisible && cuePoints.length > 0 ? (
    <SongCardCuePointOverlay
      editPoints={editPoints}
      duration={song.durationSeconds}
      highlightedEditPointTypes={normalizedSelectedCuePointTypes}
      onSeek={handleWaveformSeek}
    />
  ) : null;

  return (
    <SongCardShell
      cardRef={cardRef}
      className={`desktop-song-card${isSelected ? " is-current" : ""}${isPlaying ? " is-playing" : ""}`}
      coverLabel="Play song"
      onCoverClick={onPlay}
      onInfoClick={onPlay}
      cover={
        song.coverArt ? (
          <img src={song.coverArt} alt="" className="desktop-song-cover-image" draggable={false} />
        ) : (
          <span className="desktop-song-cover-text">
            {song.title.slice(0, 1).toUpperCase()}
          </span>
        )
      }
      playOverlay={isPlaying ? <PauseIcon /> : <PlayIcon />}
      title={song.title}
      artist={song.artist}
      stems={
        <SongCardStemsSlot
          stems={song.stems}
          open={stemsOpen}
          onOpenChange={setStemsOpen}
        />
      }
      waveform={
        <SongCardWaveform
          ref={waveformRef}
          peaks={song.waveform}
          progress={visualProgress}
          onSeek={handleWaveformSeek}
          overlay={markerOverlay}
          ariaLabel={`Seek ${song.title}`}
        />
      }
      duration={song.duration}
      genre={visibleGenres}
      keyMeta={song.key || "—"}
      bpmMeta={song.bpm ? `${song.bpm} BPM` : "—"}
      actions={
        <div ref={actionsRef} className="desktop-song-actions-inner">
          <button
            type="button"
            onClick={onFavoriteToggle}
            aria-label={favorite ? "Remove song from favorites" : "Favorite song"}
            className={`filmwave-song-action-button${favorite ? " is-active" : ""}`}
          >
            <HeartIcon size={14} filled={favorite} />
          </button>

          <div className="desktop-song-action-menu-wrap">
            <button
              type="button"
              aria-label="Song options"
              aria-expanded={actionsOpen}
              className={`filmwave-song-action-button${actionsOpen ? " is-active" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                setActionsOpen((open) => !open);
              }}
            >
              <MoreIcon size={14} />
            </button>

            {actionsOpen && (
              <div className="desktop-song-action-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => setActionsOpen(false)}>
                  Add to Playlist
                </button>
                <button type="button" role="menuitem" onClick={() => setActionsOpen(false)}>
                  Add to Project
                </button>
                <button type="button" role="menuitem" onClick={() => setActionsOpen(false)}>
                  Create New Playlist
                </button>
                <button type="button" role="menuitem" disabled>
                  Share Song
                </button>
                <button type="button" role="menuitem" disabled>
                  Sync Song
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={isSynced ? "Drag synced song file" : "Sync song"}
            className={`filmwave-song-action-button desktop-song-sync-button${isSynced ? " is-synced" : ""}${syncStatus === "syncing" ? " is-syncing" : ""}`}
            disabled={syncStatus === "syncing"}
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
              {isSynced ? <CheckIcon size={10} strokeWidth={3} /> : <SyncIcon size={14} />}
            </span>
          </button>
        </div>
      }
    />
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3.5L12 8L5 12.5V3.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3H7V13H5V3Z" fill="currentColor" />
      <path d="M9 3H11V13H9V3Z" fill="currentColor" />
    </svg>
  );
}
