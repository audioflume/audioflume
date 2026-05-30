import { MusicPlayerShell } from "@filmwave/shared";
import { exists } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMusicLibrarySyncedSongPath,
  syncSongToMusicLibraryFolder,
} from "../../../lib/musicLibrarySync";
import CheckIcon from "../../icons/CheckIcon";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import SyncIcon from "../../icons/SyncIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

const SETTINGS_STORE = "filmwave-settings.json";

type SongSyncStatus = "idle" | "syncing" | "synced" | "error";

function getAudioSource(song: DesktopMusicSong) {
  return song.playbackUrl || song.audioUrl || song.hlsUrl || "";
}

export default function DesktopMusicPlayer({
  song,
  isPlaying,
  favorite,
  onPlayPause,
  onPrevious,
  onNext,
  onFavoriteToggle,
}: {
  song: DesktopMusicSong;
  isPlaying: boolean;
  favorite: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFavoriteToggle: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.durationSeconds || 0);
  const [syncFolder, setSyncFolder] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SongSyncStatus>("idle");

  const audioSource = useMemo(() => getAudioSource(song), [song]);
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
    setCurrentTime(0);
    setDuration(song.durationSeconds || 0);
  }, [song.id, song.durationSeconds]);

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
