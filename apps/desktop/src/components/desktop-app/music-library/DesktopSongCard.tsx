import {
  DropdownShell,
  getSongCuePointMarkers,
  normalizeEditPointType,
  parseEditPoints,
  SongActionButton,
  SongCardCuePointOverlay,
  SongCardShell,
  SongCardStemsSlot,
  SongCardWaveform,
  type SharedWaveformCanvasHandle,
} from "@filmwave/shared";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import SyncIcon from "../../icons/SyncIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

const SONG_DRAG_START_DISTANCE = 5;
const NATIVE_FILE_DRAG_COMMAND = ["start", "native", "file", "drag"].join("_");
const SONG_CARD_DROPDOWN_COLLISION_PADDING = {
  top: 163,
  right: 16,
  bottom: 85,
  left: 16,
};

function getDesktopSongDisplayMeta(song: DesktopMusicSong) {
  const title = song.title.trim() || "Untitled Song";
  const artist = song.artist.trim() || "Unknown Artist";

  if (artist.toLowerCase() !== "filmwave" || !title.includes(" - ")) {
    return { title, artist };
  }

  const [songTitle, ...artistParts] = title.split(" - ");
  const parsedTitle = songTitle.trim();
  const parsedArtist = artistParts.join(" - ").trim();

  return {
    title: parsedTitle || title,
    artist: parsedArtist || artist,
  };
}

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
  const waveformRef = useRef<SharedWaveformCanvasHandle | null>(null);
  const songDragStartRef = useRef<{ x: number; y: number; started: boolean } | null>(null);
  const visibleGenres = [song.genre, song.mood].filter(Boolean).join(", ");
  const isSynced = syncStatus === "synced" && Boolean(syncedPath);
  const displayMeta = useMemo(() => getDesktopSongDisplayMeta(song), [song]);
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

  async function startSyncedSongDrag(x: number, y: number) {
    if (!isSynced || !syncedPath) return;

    try {
      await invoke(NATIVE_FILE_DRAG_COMMAND, {
        path: syncedPath,
        x,
        y,
        windowHeight: window.innerHeight,
      });
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
    void startSyncedSongDrag(event.clientX, event.clientY);
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
            {displayMeta.title.slice(0, 1).toUpperCase()}
          </span>
        )
      }
      coverBadge={
        song.aiGenerated ? (
          <span className="filmwave-song-ai-badge" aria-label="Made with AI" title="Made with AI">
            <AiGeneratedIcon />
          </span>
        ) : null
      }
      playOverlay={isPlaying ? <PauseIcon /> : <PlayIcon />}
      title={displayMeta.title}
      artist={displayMeta.artist}
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
          ariaLabel={`Seek ${displayMeta.title}`}
        />
      }
      duration={song.duration}
      genre={visibleGenres}
      keyMeta={song.key || "—"}
      bpmMeta={song.bpm ? `${song.bpm} BPM` : "—"}
      actions={
        <div className="desktop-song-actions-inner">
          <SongActionButton
            label={favorite ? "Remove song from favorites" : "Favorite song"}
            active={favorite}
            activeMode="plain-icon"
            onClick={onFavoriteToggle}
          >
            <HeartIcon size={14} filled={favorite} />
          </SongActionButton>

          <div className="desktop-song-action-menu-wrap">
            <DropdownShell
              open={actionsOpen}
              onOpenChange={setActionsOpen}
              placement="bottom-end"
              strategy="absolute"
              usePortal={false}
              className="desktop-song-action-menu"
              offsetAmount={6}
              flippedOffsetAmount={6}
              collisionPadding={SONG_CARD_DROPDOWN_COLLISION_PADDING}
              trigger={({ open }) => (
                <SongActionButton
                  label="Song options"
                  active={open}
                  aria-expanded={open}
                >
                  <MoreIcon size={14} />
                </SongActionButton>
              )}
            >
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
                Download Song
              </button>
            </DropdownShell>
          </div>

          <SongActionButton
            label={isSynced ? "Drag synced song file" : "Sync song"}
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
              {isSynced ? <SyncedFileIcon /> : <SyncIcon size={14} />}
            </span>
          </SongActionButton>
        </div>
      }
    />
  );
}

function AiGeneratedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.4 3.8L9.7 7.1L13 8.4L9.7 9.7L8.4 13L7.1 9.7L3.8 8.4L7.1 7.1L8.4 3.8Z" fill="currentColor" />
      <path d="M15.6 10.8L16.7 13.3L19.2 14.4L16.7 15.5L15.6 18L14.5 15.5L12 14.4L14.5 13.3L15.6 10.8Z" fill="currentColor" />
    </svg>
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

function SyncedFileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.75" y="4.25" width="10.5" height="10.5" rx="2.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3.1 2.8" />
      <rect x="9.75" y="9.25" width="10.5" height="10.5" rx="2.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
