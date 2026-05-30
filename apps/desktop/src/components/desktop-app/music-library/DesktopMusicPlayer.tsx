import { SharedMusicPlayer } from "@filmwave/shared";
import { exists } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMusicLibrarySyncedSongPath,
  syncSongToMusicLibraryFolder,
} from "../../../lib/musicLibrarySync";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
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
    setCurrentTime(0);
    setDuration(song.durationSeconds || 0);
  }, [song.id, song.durationSeconds]);

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

  return (
    <>
      <audio
        ref={audioRef}
        src={audioSource}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration || song.durationSeconds || 0)
        }
        onEnded={onNext}
      />

      <SharedMusicPlayer
        platform="desktop"
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
        className="desktop-music-player"
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
              aria-pressed={syncStatus === "synced"}
              className={`filmwave-icon-button filmwave-icon-button-plain${
                syncStatus === "synced" ? " is-active" : ""
              }`}
              disabled={!syncFolder || syncStatus === "syncing" || syncStatus === "synced"}
              onClick={syncSong}
            >
              <SyncIcon spinning={syncStatus === "syncing"} />
            </button>
          </>
        }
      />
    </>
  );
}

function SyncIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={spinning ? "animate-spin" : undefined}
    >
      <path
        d="M20 7.5V3.5H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16.5V20.5H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 10A7 7 0 0 0 7.05 5.05L4 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14A7 7 0 0 0 16.95 18.95L20 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
