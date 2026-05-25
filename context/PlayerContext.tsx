"use client";

import type { Song } from "@/lib/types";
import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

type WaveformHandle = {
  seekTo: (progress: number) => void;
};

type StoredPlayerState = {
  currentSong: Song;
  currentTime: number;
  duration: number;
};

type PlayerBroadcastMessage =
  | {
      type: "playing";
      tabId: string;
      song: Song;
      currentTime: number;
      duration: number;
    }
  | {
      type: "paused";
      tabId: string;
      songId: string | null;
      currentTime: number;
      duration: number;
    }
  | {
      type: "closed";
      tabId: string;
    };

type PlayerContextType = {
  currentSong: Song | null;
  isPlaying: boolean;
  remotePlayingInAnotherTab: boolean;
  currentTime: number;
  duration: number;
  togglePlayPause: (song: Song) => void;
  seekTo: (song: Song, progress: number, shouldPlay: boolean) => void;
  registerWaveform: (songId: string, handle: WaveformHandle) => void;
  unregisterWaveform: (songId: string) => void;
  setQueue: (songs: Song[]) => void;
  navigateTrack: (direction: "prev" | "next") => void;
  closePlayer: () => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

const PLAYER_STORAGE_KEY = "filmwave-player-state";
const CLOSE_PLAYER_EVENT = "filmwave:close-player";
const PLAYER_BROADCAST_CHANNEL = "filmwave-player";

// Throttle localStorage writes during playback — the song object includes
// waveformPeaks which is large. We write immediately on song change / pause,
// and at most once every 5 s while playing.
const STORAGE_WRITE_INTERVAL_MS = 5000;

function createTabId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isInterruptedPlayError(err: unknown) {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === "AbortError" ||
    err.message.includes("interrupted by a call to pause") ||
    err.message.includes("interrupted by a new load request")
  );
}

function isValidStoredSong(value: unknown): value is Song {
  if (!value || typeof value !== "object") return false;
  const song = value as Partial<Song>;
  return (
    typeof song.id === "string" &&
    typeof song.title === "string" &&
    typeof song.artist === "string" &&
    typeof song.audioUrl === "string" &&
    Array.isArray(song.stems) &&
    typeof song.waveformPeaks === "string"
  );
}

function isPlayerBroadcastMessage(
  value: unknown,
): value is PlayerBroadcastMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<PlayerBroadcastMessage>;
  if (typeof message.tabId !== "string") return false;
  if (message.type === "closed") return true;
  if (message.type === "paused") {
    return (
      (typeof message.songId === "string" || message.songId === null) &&
      typeof message.currentTime === "number" &&
      typeof message.duration === "number"
    );
  }
  if (message.type === "playing") {
    return (
      isValidStoredSong(message.song) &&
      typeof message.currentTime === "number" &&
      typeof message.duration === "number"
    );
  }
  return false;
}

function writeStoredPlayerState({
  currentSong,
  currentTime,
  duration,
}: {
  currentSong: Song;
  currentTime: number;
  duration: number;
}) {
  try {
    window.localStorage.setItem(
      PLAYER_STORAGE_KEY,
      JSON.stringify({ currentSong, currentTime, duration }),
    );
  } catch {
    // Ignore storage failures (private browsing, quota exceeded, etc.)
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformsRef = useRef<Map<string, WaveformHandle>>(new Map());
  const currentSongRef = useRef<Song | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const queueRef = useRef<Song[]>([]);
  const playRequestIdRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef(createTabId());
  const remoteOwnerTabIdRef = useRef<string | null>(null);
  const lastBroadcastTimeRef = useRef(0);
  const lastStorageWriteTimeRef = useRef(0);

  const playSongDirectlyRef = useRef<(song: Song, shouldPlay?: boolean) => void>(() => {});
  const navigateTrackRef = useRef<(direction: "prev" | "next", forcePlay?: boolean) => void>(() => {});

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remotePlayingInAnotherTab, setRemotePlayingInAnotherTab] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const postPlayerMessage = useCallback((message: PlayerBroadcastMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  const postPlayingState = useCallback(() => {
    const current = currentSongRef.current;
    if (!current) return;
    postPlayerMessage({
      type: "playing",
      tabId: tabIdRef.current,
      song: current,
      currentTime: currentTimeRef.current,
      duration: durationRef.current || current.duration || 0,
    });
  }, [postPlayerMessage]);

  const postPausedState = useCallback(() => {
    postPlayerMessage({
      type: "paused",
      tabId: tabIdRef.current,
      songId: currentSongRef.current?.id || null,
      currentTime: currentTimeRef.current,
      duration: durationRef.current,
    });
  }, [postPlayerMessage]);

  const setCurrentTimeState = useCallback((value: number) => {
    currentTimeRef.current = value;
    setCurrentTime(value);
  }, []);

  const setDurationState = useCallback((value: number) => {
    durationRef.current = value;
    setDuration(value);
  }, []);

  function getAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";

      audio.addEventListener("play", () => {
        remoteOwnerTabIdRef.current = null;
        setRemotePlayingInAnotherTab(false);
        setIsPlaying(true);
        postPlayingState();
      });

      audio.addEventListener("pause", () => {
        setIsPlaying(false);
      });

      // stalled fires when the browser has stopped receiving data for ~3 seconds
      // while the audio element wants to play. We seek to the current position
      // to force the browser to re-request the stream from the CDN.
      audio.addEventListener("stalled", () => {
        const stalledTime = audio.currentTime;

        if (audio.paused) return;

        window.setTimeout(() => {
          // Only attempt recovery if we're still stuck at the same position
          if (audio.paused) return;
          if (audio.currentTime !== stalledTime) return;

          try {
            audio.currentTime = stalledTime;
            audio.play().catch(() => {});
          } catch {
            // Ignore seek errors during stall recovery
          }
        }, 1200);
      });

      audio.addEventListener("ended", () => {
        const current = currentSongRef.current;
        const queue = queueRef.current;

        if (!current || !queue.length) {
          setCurrentTimeState(0);
          setIsPlaying(false);
          postPausedState();
          return;
        }

        const currentIndex = queue.findIndex((song) => song.id === current.id);
        const nextSong = currentIndex >= 0 ? queue[currentIndex + 1] : null;

        waveformsRef.current.get(current.id)?.seekTo(0);
        setCurrentTimeState(0);

        if (!nextSong) {
          setIsPlaying(false);
          writeStoredPlayerState({
            currentSong: current,
            currentTime: 0,
            duration: durationRef.current || current.duration || 0,
          });
          postPausedState();
          return;
        }

        playSongDirectlyRef.current(nextSong, true);
      });

      audio.addEventListener("timeupdate", () => {
        if (!audio.duration || !isFinite(audio.duration)) return;

        const progress = audio.currentTime / audio.duration;
        const id = currentSongRef.current?.id;

        if (id) {
          waveformsRef.current.get(id)?.seekTo(progress);
        }

        setCurrentTimeState(audio.currentTime);
        setDurationState(audio.duration);

        // Throttle localStorage writes — avoid serializing the full song object
        // (including waveformPeaks) on every timeupdate tick (~4x per second).
        const now = Date.now();
        if (
          currentSongRef.current &&
          !audio.paused &&
          now - lastStorageWriteTimeRef.current > STORAGE_WRITE_INTERVAL_MS
        ) {
          lastStorageWriteTimeRef.current = now;
          writeStoredPlayerState({
            currentSong: currentSongRef.current,
            currentTime: audio.currentTime,
            duration: audio.duration,
          });
        }

        if (!audio.paused && now - lastBroadcastTimeRef.current > 1000) {
          lastBroadcastTimeRef.current = now;
          postPlayingState();
        }
      });

      audio.addEventListener("loadedmetadata", () => {
        if (isFinite(audio.duration)) {
          setDurationState(audio.duration);
        }
      });

      audio.addEventListener("error", () => {
        // Audio decode / network errors are normal in a music player.
        // Use warn so this doesn't trigger the Next.js error overlay.
        if (audio.error) {
          console.warn(
            `[Player] Audio error — code: ${audio.error.code}, message: ${audio.error.message}`,
          );
        }
        setIsPlaying(false);
        postPausedState();
      });

      audioRef.current = audio;
    }

    return audioRef.current;
  }

  const ensureAudioSourceForCurrentSong = useCallback(
    (audio: HTMLAudioElement) => {
      const current = currentSongRef.current;
      if (!current) return false;

      const desiredTime = currentTimeRef.current;
      const needsSource = !audio.src || audio.src !== current.audioUrl;

      if (needsSource) {
        audio.src = current.audioUrl;
      }

      const applyTime = () => {
        if (!audio.duration || !isFinite(audio.duration)) return;
        const safeTime = Math.max(0, Math.min(desiredTime, audio.duration));
        audio.currentTime = safeTime;
        setCurrentTimeState(safeTime);
        setDurationState(audio.duration);
      };

      if (desiredTime > 0) {
        if (audio.readyState >= 1) {
          applyTime();
        } else {
          audio.addEventListener("loadedmetadata", applyTime, { once: true });
        }
      }

      return true;
    },
    [setCurrentTimeState, setDurationState],
  );

  const safePlay = useCallback(() => {
    const audio = getAudio();
    const requestId = ++playRequestIdRef.current;

    if (!ensureAudioSourceForCurrentSong(audio)) return;

    remoteOwnerTabIdRef.current = null;
    setRemotePlayingInAnotherTab(false);

    audio.play().catch((err) => {
      if (requestId !== playRequestIdRef.current) return;
      if (isInterruptedPlayError(err)) return;
      console.warn("[Player] play() rejected:", err);
      setIsPlaying(false);
      postPausedState();
    });
  }, [ensureAudioSourceForCurrentSong, postPausedState]);

  const safePause = useCallback(() => {
    playRequestIdRef.current += 1;
    const audio = getAudio();
    audio.pause();
    setIsPlaying(false);

    // Write current position immediately on pause
    if (currentSongRef.current) {
      lastStorageWriteTimeRef.current = Date.now();
      writeStoredPlayerState({
        currentSong: currentSongRef.current,
        currentTime: currentTimeRef.current,
        duration: durationRef.current,
      });
    }

    postPausedState();
  }, [postPausedState]);

  const closePlayer = useCallback(() => {
    playRequestIdRef.current += 1;

    const audio = audioRef.current;
    const current = currentSongRef.current;

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    if (current) {
      waveformsRef.current.get(current.id)?.seekTo(0);
    }

    currentSongRef.current = null;
    currentTimeRef.current = 0;
    durationRef.current = 0;
    remoteOwnerTabIdRef.current = null;

    setCurrentSong(null);
    setIsPlaying(false);
    setRemotePlayingInAnotherTab(false);
    setCurrentTime(0);
    setDuration(0);

    window.localStorage.removeItem(PLAYER_STORAGE_KEY);

    postPlayerMessage({ type: "closed", tabId: tabIdRef.current });
  }, [postPlayerMessage]);

  const playSongDirectly = useCallback(
    (song: Song, shouldPlay?: boolean) => {
      const audio = getAudio();
      const wasPlaying = shouldPlay !== undefined ? shouldPlay : !audio.paused;

      playRequestIdRef.current += 1;
      remoteOwnerTabIdRef.current = null;
      setRemotePlayingInAnotherTab(false);

      if (currentSongRef.current) {
        waveformsRef.current.get(currentSongRef.current.id)?.seekTo(0);
      }

      audio.src = song.audioUrl;
      audio.currentTime = 0;

      currentSongRef.current = song;
      setCurrentSong(song);
      setCurrentTimeState(0);
      setDurationState(song.duration || 0);

      lastStorageWriteTimeRef.current = Date.now();
      writeStoredPlayerState({
        currentSong: song,
        currentTime: 0,
        duration: song.duration || 0,
      });

      if (wasPlaying) {
        safePlay();
      }
    },
    [safePlay, setCurrentTimeState, setDurationState],
  );

  playSongDirectlyRef.current = playSongDirectly;

  const togglePlayPause = useCallback(
    (song: Song) => {
      const audio = getAudio();

      if (currentSongRef.current?.id === song.id) {
        if (audio.paused) {
          safePlay();
        } else {
          safePause();
        }
        return;
      }

      playSongDirectly(song, true);
    },
    [playSongDirectly, safePause, safePlay],
  );

  const seekTo = useCallback(
    (song: Song, progress: number, shouldPlay: boolean) => {
      const audio = getAudio();

      const safeProgress = Number.isFinite(progress)
        ? Math.max(0, Math.min(1, progress))
        : 0;

      remoteOwnerTabIdRef.current = null;
      setRemotePlayingInAnotherTab(false);

      if (currentSongRef.current?.id !== song.id) {
        playRequestIdRef.current += 1;

        if (currentSongRef.current) {
          waveformsRef.current.get(currentSongRef.current.id)?.seekTo(0);
        }

        audio.src = song.audioUrl;
        currentSongRef.current = song;
        setCurrentSong(song);
        setDurationState(song.duration || 0);

        lastStorageWriteTimeRef.current = Date.now();
        writeStoredPlayerState({
          currentSong: song,
          currentTime: 0,
          duration: song.duration || 0,
        });
      }

      const applySeek = () => {
        if (!audio.duration || !isFinite(audio.duration)) return;

        audio.currentTime = safeProgress * audio.duration;
        setCurrentTimeState(audio.currentTime);
        setDurationState(audio.duration);

        lastStorageWriteTimeRef.current = Date.now();
        writeStoredPlayerState({
          currentSong: song,
          currentTime: audio.currentTime,
          duration: audio.duration,
        });

        if (shouldPlay) {
          safePlay();
        } else {
          postPausedState();
        }
      };

      if (audio.duration && isFinite(audio.duration)) {
        applySeek();
      } else {
        audio.addEventListener("loadedmetadata", applySeek, { once: true });
      }
    },
    [postPausedState, safePlay, setCurrentTimeState, setDurationState],
  );

  const registerWaveform = useCallback(
    (songId: string, handle: WaveformHandle) => {
      waveformsRef.current.set(songId, handle);
    },
    [],
  );

  const unregisterWaveform = useCallback((songId: string) => {
    waveformsRef.current.delete(songId);
  }, []);

  const setQueue = useCallback((songs: Song[]) => {
    queueRef.current = songs;
  }, []);

  const navigateTrack = useCallback(
    (direction: "prev" | "next", forcePlay = false) => {
      const queue = queueRef.current;
      const current = currentSongRef.current;

      if (!queue.length || !current) return;

      const idx = queue.findIndex((song) => song.id === current.id);
      if (idx === -1) return;

      const nextIdx = direction === "next" ? idx + 1 : idx - 1;

      if (nextIdx < 0 || nextIdx >= queue.length) {
        setIsPlaying(false);
        postPausedState();
        return;
      }

      const shouldPlay = forcePlay || !audioRef.current?.paused;
      playSongDirectly(queue[nextIdx], shouldPlay);
    },
    [playSongDirectly, postPausedState],
  );

  navigateTrackRef.current = navigateTrack;

  // Clear any stale player state from a previous session on mount.
  // We intentionally don't auto-restore — the user should choose to play.
  useEffect(() => {
    window.localStorage.removeItem(PLAYER_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(PLAYER_BROADCAST_CHANNEL);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data;

      if (!isPlayerBroadcastMessage(message)) return;
      if (message.tabId === tabIdRef.current) return;

      if (message.type === "closed") {
        if (remoteOwnerTabIdRef.current === message.tabId) {
          remoteOwnerTabIdRef.current = null;
          setRemotePlayingInAnotherTab(false);
        }
        return;
      }

      if (message.type === "paused") {
        if (remoteOwnerTabIdRef.current === message.tabId) {
          remoteOwnerTabIdRef.current = null;
          setRemotePlayingInAnotherTab(false);
          setIsPlaying(false);
        }
        return;
      }

      const audio = getAudio();
      const existing = currentSongRef.current;

      if (!audio.paused) {
        playRequestIdRef.current += 1;
        audio.pause();
      }

      if (existing?.id !== message.song.id) {
        if (existing) {
          waveformsRef.current.get(existing.id)?.seekTo(0);
        }
        audio.src = message.song.audioUrl;
        currentSongRef.current = message.song;
        setCurrentSong(message.song);
      }

      if (!audio.src || audio.src !== message.song.audioUrl) {
        audio.src = message.song.audioUrl;
      }

      const safeTime = Math.max(0, message.currentTime || 0);
      const nextDuration = message.duration || message.song.duration || 0;

      const applyRemoteTime = () => {
        try {
          if (audio.duration && isFinite(audio.duration)) {
            audio.currentTime = Math.max(0, Math.min(safeTime, audio.duration));
          }
        } catch {
          // Ignore remote seek sync failures
        }
      };

      if (audio.readyState >= 1) {
        applyRemoteTime();
      } else {
        audio.addEventListener("loadedmetadata", applyRemoteTime, { once: true });
      }

      const progress = nextDuration > 0 ? safeTime / nextDuration : 0;
      waveformsRef.current.get(message.song.id)?.seekTo(progress);

      remoteOwnerTabIdRef.current = message.tabId;
      setRemotePlayingInAnotherTab(true);
      setIsPlaying(false);
      setCurrentTimeState(safeTime);
      setDurationState(nextDuration);

      writeStoredPlayerState({
        currentSong: message.song,
        currentTime: safeTime,
        duration: nextDuration,
      });
    };

    return () => {
      channel.close();
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [setCurrentTimeState, setDurationState]);

  useEffect(() => {
    window.addEventListener(CLOSE_PLAYER_EVENT, closePlayer);
    return () => window.removeEventListener(CLOSE_PLAYER_EVENT, closePlayer);
  }, [closePlayer]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!currentSongRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      setCurrentTimeState(audio.currentTime || currentTimeRef.current);
      setDurationState(
        audio.duration && isFinite(audio.duration)
          ? audio.duration
          : durationRef.current,
      );
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [setCurrentTimeState, setDurationState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        const audio = getAudio();
        if (currentSongRef.current) {
          if (audio.paused) {
            safePlay();
          } else {
            safePause();
          }
        }
      }

      if (e.code === "ArrowDown") {
        e.preventDefault();
        navigateTrackRef.current("next");
      }

      if (e.code === "ArrowUp") {
        e.preventDefault();
        navigateTrackRef.current("prev");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safePause, safePlay]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        remotePlayingInAnotherTab,
        currentTime,
        duration,
        togglePlayPause,
        seekTo,
        registerWaveform,
        unregisterWaveform,
        setQueue,
        navigateTrack,
        closePlayer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
