import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import CheckIcon from "../../icons/CheckIcon";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import SyncIcon from "../../icons/SyncIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

const WAVEFORM_BAR_WIDTH = 2;
const WAVEFORM_BAR_GAP = 1;
const WAVEFORM_MIN_VISIBLE_BARS = 8;
const WAVEFORM_MAX_VISIBLE_BARS = 220;
const SONG_DRAG_START_DISTANCE = 5;

type SongSyncStatus = "idle" | "syncing" | "synced" | "error";

function getInterpolatedWaveformHeight(waveform: number[], index: number, total: number) {
  if (waveform.length === 1 || total <= 1) return waveform[0] ?? 12;

  const sourcePosition = (index / (total - 1)) * (waveform.length - 1);
  const lowerIndex = Math.floor(sourcePosition);
  const upperIndex = Math.min(waveform.length - 1, Math.ceil(sourcePosition));
  const progress = sourcePosition - lowerIndex;
  const lowerValue = waveform[lowerIndex] ?? 12;
  const upperValue = waveform[upperIndex] ?? lowerValue;

  return lowerValue + (upperValue - lowerValue) * progress;
}

function getVisibleWaveformBars(waveform: number[], availableWidth: number) {
  if (!waveform.length) return [];
  if (availableWidth <= 0) return waveform;

  const slotWidth = WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP;
  const visibleCount = Math.min(
    WAVEFORM_MAX_VISIBLE_BARS,
    Math.max(
      WAVEFORM_MIN_VISIBLE_BARS,
      Math.floor((availableWidth + WAVEFORM_BAR_GAP) / slotWidth),
    ),
  );

  return Array.from({ length: visibleCount }, (_, index) =>
    getInterpolatedWaveformHeight(waveform, index, visibleCount),
  );
}

export default function DesktopSongCard({
  song,
  favorite,
  markersVisible,
  isPlaying,
  syncStatus = "idle",
  syncedPath,
  onFavoriteToggle,
  onPlay,
  onSync,
}: {
  song: DesktopMusicSong;
  favorite: boolean;
  markersVisible: boolean;
  isPlaying: boolean;
  syncStatus?: SongSyncStatus;
  syncedPath?: string | null;
  onFavoriteToggle: () => void;
  onPlay: () => void;
  onSync: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const songDragStartRef = useRef<{ x: number; y: number; started: boolean } | null>(null);
  const visibleGenres = [song.genre, song.mood].filter(Boolean).join(", ");
  const isSynced = syncStatus === "synced" && Boolean(syncedPath);
  const visibleWaveform = useMemo(
    () => getVisibleWaveformBars(song.waveform, waveformWidth),
    [song.waveform, waveformWidth],
  );

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

  useEffect(() => {
    const element = waveformRef.current;
    if (!element) return;

    let frame = 0;

    function updateWidth() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setWaveformWidth(element.clientWidth);
      });
    }

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  async function startSyncedSongDrag() {
    if (!isSynced || !syncedPath) return;

    try {
      await invoke("start_native_file_drag", { path: syncedPath });
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

  return (
    <article className={`desktop-song-card${isPlaying ? " is-playing" : ""}`}>
      <button type="button" className="desktop-song-cover" aria-label="Play song" onClick={onPlay}>
        {song.coverArt ? (
          <img src={song.coverArt} alt="" className="desktop-song-cover-image" draggable={false} />
        ) : (
          <span className="desktop-song-cover-text">
            {song.title.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="desktop-song-play-overlay" aria-hidden="true">
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </span>
      </button>

      <button type="button" className="desktop-song-info" onClick={onPlay}>
        <h3>{song.title}</h3>
        <p>{song.artist}</p>
      </button>

      <button type="button" className="desktop-song-wave-wrap" onClick={onPlay}>
        <div className="desktop-song-stems-slot">
          {song.markers > 0 && <span>+{song.markers}</span>}
        </div>

        <div ref={waveformRef} className="desktop-song-wave" aria-hidden="true">
          {visibleWaveform.map((height, index) => (
            <span
              key={`${song.id}-${index}`}
              style={{ height: `${Math.max(12, height)}%` }}
            />
          ))}
          {markersVisible && <i style={{ left: "34%" }} />}
          {markersVisible && <i style={{ left: "68%" }} />}
        </div>

        <span className="desktop-song-duration">{song.duration}</span>
      </button>

      <div className="desktop-song-genre-slot">
        <span>{visibleGenres}</span>
      </div>

      <div className="desktop-song-key-bpm">
        <span>{song.key || "—"}</span>
        <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>
      </div>

      <div className="desktop-song-actions" ref={actionsRef}>
        <button
          type="button"
          onClick={onFavoriteToggle}
          aria-label={favorite ? "Remove song from favorites" : "Favorite song"}
          className={favorite ? "is-active" : ""}
        >
          <HeartIcon size={14} filled={favorite} />
        </button>

        <div className="desktop-song-action-menu-wrap">
          <button
            type="button"
            aria-label="Song options"
            aria-expanded={actionsOpen}
            className={actionsOpen ? "is-active" : ""}
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
          className={`desktop-song-sync-button${isSynced ? " is-synced" : ""}${syncStatus === "syncing" ? " is-syncing" : ""}`}
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
    </article>
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
