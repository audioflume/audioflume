"use client";

import type { Song } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  ReactNode,
} from "react";

type WaveformHandle = {
  seekTo: (progress: number) => void;
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

type PlayerProgressSnapshot = {
  currentTime: number;
  duration: number;
};

type PlayerProgressStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PlayerProgressSnapshot;
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
const PlayerProgressContext = createContext<PlayerProgressStore | null>(null);

const PLAYER_STORAGE_KEY = "filmwave-player-state";
const CLOSE_PLAYER_EVENT = "filmwave:close-player";
const PLAYER_BROADCAST_CHANNEL = "filmwave-player";
const STORAGE_WRITE_INTERVAL_MS = 5000;
const DEBUG_PLAYER_AUDIO = false;

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
  const progressSnapshotRef = useRef<PlayerProgressSnapshot>({
    currentTime: 0,
    duration: 0,
  });
  const progressSubscribersRef = useRef<Set<() => void>>(new Set());
  const queueRef = useRef<Song[]>([]);
  const playRequestIdRef = useRef(0);
  const pendingSeekRequestIdRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef(createTabId());
  const remoteOwnerTabIdRef = useRef<string | null>(null);
  const lastBroadcastTimeRef = useRef(0);
  const lastStorageWriteTimeRef = useRef(0);
  const lastDebugLogTimeRef = useRef(0);

  const playSongDirectlyRef = useRef<
    (song: Song, shouldPlay?: boolean) => void
  >(() => {});
  const navigateTrackRef = useRef<
    (direction: "prev" | "next", forcePlay?: boolean) => void
  >(() => {});

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remotePlayingInAnotherTab, setRemotePlayingInAnotherTab] =
    useState(false);

  const getAudioDebugPayload = useCallback(
    (
      audio: HTMLAudioElement,
      eventName: string,
      extra: Record<string, unknown> = {},
    ) => {
      const current = currentSongRef.current;

      return {
        event: eventName,
        songId: current?.id,
        title: current?.title,
        artist: current?.artist,
        audioUrl: current?.audioUrl,
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : null,
        readyState: audio.readyState,
        networkState: audio.networkState,
        paused: audio.paused,
        seeking: audio.seeking,
        src: audio.currentSrc || audio.src,
        buffered: Array.from({ length: audio.buffered.length }, (_, index) => ({
          start: audio.buffered.start(index),
          end: audio.buffered.end(index),
        })),
        ...extra,
      };
    },
    [],
  );

  const logAudioDebug = useCallback(
    (
      eventName: string,
      audio: HTMLAudioElement,
      extra: Record<string, unknown> = {},
      force = false,
    ) => {
      if (!DEBUG_PLAYER_AUDIO) return;

      const now = Date.now();
      if (!force && now - lastDebugLogTimeRef.current < 250) return;
      lastDebugLogTimeRef.current = now;

      console.warn(
        `[PlayerDebug] ${eventName} ${JSON.stringify(
          getAudioDebugPayload(audio, eventName, extra),
          null,
          2,
        )}`,
      );
    },
    [getAudioDebugPayload],
  );

  const emitProgressUpdate = useCallback(() => {
    progressSnapshotRef.current = {
      currentTime: currentTimeRef.current,
      duration: durationRef.current,
    };

    progressSubscribersRef.current.forEach((listener) => listener());
  }, []);

  const subscribeToProgress = useCallback((listener: () => void) => {
    progressSubscribersRef.current.add(listener);

    return () => {
      progressSubscribersRef.current.delete(listener);
    };
  }, []);

  const getProgressSnapshot = useCallback(
    () => progressSnapshotRef.current,
    [],
  );

  const progressStore = useMemo<PlayerProgressStore>(
    () => ({
      subscribe: subscribeToProgress,
      getSnapshot: getProgressSnapshot,
    }),
    [getProgressSnapshot, subscribeToProgress],
  );

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

  const setCurrentTimeState = useCallback(
    (value: number) => {
      currentTimeRef.current = value;
      emitProgressUpdate();
    },
    [emitProgressUpdate],
  );

  const setDurationState = useCallback(
    (value: number) => {
      durationRef.current = value;
      emitProgressUpdate();
    },
    [emitProgressUpdate],
  );

  const playAudio = useCallback(
    (audio: HTMLAudioElement) => {
      const requestId = ++playRequestIdRef.current;

      remoteOwnerTabIdRef.current = null;
      setRemotePlayingInAnotherTab(false);

      audio.play().catch((err) => {
        if (requestId !== playRequestIdRef.current) return;
        if (isInterruptedPlayError(err)) return;

        logAudioDebug("play-rejected", audio, { error: String(err) }, true);
        setIsPlaying(false);
        postPausedState();
      });
    },
    [logAudioDebug, postPausedState],
  );

  function getAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";

      audio.addEventListener("play", () => {
        remoteOwnerTabIdRef.current = null;
        setRemotePlayingInAnotherTab(false);
        setIsPlaying(true);
        logAudioDebug("play", audio);
        postPlayingState();
      });

      audio.addEventListener("pause", () => {
        logAudioDebug("pause", audio);
        setIsPlaying(false);
      });

      audio.addEventListener("seeking", () => {
        logAudioDebug("seeking", audio, {}, true);
      });

      audio.addEventListener("seeked", () => {
        logAudioDebug("seeked", audio, {}, true);
      });

      audio.addEventListener("waiting", () => {
        logAudioDebug("waiting", audio, {}, true);
      });

      audio.addEventListener("canplay", () => {
        logAudioDebug("canplay", audio);
      });

      audio.addEventListener("playing", () => {
        logAudioDebug("playing", audio, {}, true);
      });

      audio.addEventListener("stalled", () => {
        const stalledTime = audio.currentTime;
        logAudioDebug("stalled", audio, { stalledTime }, true);
      });

      audio.addEventListener("ended", () => {
        const current = currentSongRef.current;
        const queue = queueRef.current;
        logAudioDebug("ended", audio, {}, true);

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
        logAudioDebug("loadedmetadata", audio, {}, true);
      });

      audio.addEventListener("error", () => {
        const error = audio.error;

        logAudioDebug(
          "error",
          audio,
          {
            errorCode: error?.code,
            errorMessage: error?.message,
          },
          true,
        );

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

      const needsSource = !audio.src || audio.src !== current.audioUrl;

      if (needsSource) {
        const desiredTime = currentTimeRef.current;
        audio.src = current.audioUrl;
        logAudioDebug("source-change", audio, { desiredTime }, true);

        if (desiredTime > 0) {
          const applyTime = () => {
            if (!audio.duration || !isFinite(audio.duration)) return;

            const safeTime = Math.max(0, Math.min(desiredTime, audio.duration));
            audio.currentTime = safeTime;
            setCurrentTimeState(safeTime);
            setDurationState(audio.duration);
          };

          if (audio.readyState >= 1) {
            applyTime();
          } else {
            audio.addEventListener("loadedmetadata", applyTime, { once: true });
          }
        }
      }

      return true;
    },
    [logAudioDebug, setCurrentTimeState, setDurationState],
  );

  const safePlay = useCallback(() => {
    const audio = getAudio();

    if (!ensureAudioSourceForCurrentSong(audio)) return;

    playAudio(audio);
  }, [ensureAudioSourceForCurrentSong, playAudio]);

  const safePause = useCallback(() => {
    playRequestIdRef.current += 1;

    const audio = getAudio();
    audio.pause();
    setIsPlaying(false);

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
    pendingSeekRequestIdRef.current += 1;

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
    progressSnapshotRef.current = { currentTime: 0, duration: 0 };
    remoteOwnerTabIdRef.current = null;

    setCurrentSong(null);
    setIsPlaying(false);
    setRemotePlayingInAnotherTab(false);
    emitProgressUpdate();

    window.localStorage.removeItem(PLAYER_STORAGE_KEY);

    postPlayerMessage({ type: "closed", tabId: tabIdRef.current });
  }, [emitProgressUpdate, postPlayerMessage]);

  const playSongDirectly = useCallback(
    (song: Song, shouldPlay?: boolean) => {
      const audio = getAudio();
      const wasPlaying = shouldPlay !== undefined ? shouldPlay : !audio.paused;

      playRequestIdRef.current += 1;
      pendingSeekRequestIdRef.current += 1;
      remoteOwnerTabIdRef.current = null;
      setRemotePlayingInAnotherTab(false);

      const previousSong = currentSongRef.current;

      if (previousSong) {
        waveformsRef.current.get(previousSong.id)?.seekTo(0);
      }

      currentSongRef.current = song;
      setCurrentSong(song);
      setCurrentTimeState(0);
      setDurationState(song.duration || 0);

      if (!audio.paused) {
        audio.pause();
      }

      if (audio.src !== song.audioUrl) {
        audio.src = song.audioUrl;
      }

      audio.currentTime = 0;

      logAudioDebug(
        "play-song-directly",
        audio,
        { nextSongId: song.id, shouldPlay },
        true,
      );

      lastStorageWriteTimeRef.current = Date.now();
      writeStoredPlayerState({
        currentSong: song,
        currentTime: 0,
        duration: song.duration || 0,
      });

      if (wasPlaying) {
        playAudio(audio);
      }
    },
    [logAudioDebug, playAudio, setCurrentTimeState, setDurationState],
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
      const isSameSong = currentSongRef.current?.id === song.id;
      const seekRequestId = ++pendingSeekRequestIdRef.current;
      const safeProgress = Number.isFinite(progress)
        ? Math.max(0, Math.min(1, progress))
        : 0;

      remoteOwnerTabIdRef.current = null;
      setRemotePlayingInAnotherTab(false);

      if (!isSameSong) {
        playRequestIdRef.current += 1;

        const previousSong = currentSongRef.current;

        if (previousSong) {
          waveformsRef.current.get(previousSong.id)?.seekTo(0);
        }

        if (!audio.paused) {
          audio.pause();
        }

        currentSongRef.current = song;
        setCurrentSong(song);
        setIsPlaying(false);
        setCurrentTimeState(0);
        setDurationState(song.duration || 0);

        if (audio.src !== song.audioUrl) {
          audio.src = song.audioUrl;
        }

        logAudioDebug(
          "seek-source-change",
          audio,
          { nextSongId: song.id, safeProgress },
          true,
        );

        lastStorageWriteTimeRef.current = Date.now();
        writeStoredPlayerState({
          currentSong: song,
          currentTime: 0,
          duration: song.duration || 0,
        });
      }

      const applySeek = () => {
        if (seekRequestId !== pendingSeekRequestIdRef.current) return;
        if (currentSongRef.current?.id !== song.id) return;
        if (!audio.duration || !isFinite(audio.duration)) return;

        const targetTime = safeProgress * audio.duration;
        const beforeTime = audio.currentTime;

        logAudioDebug(
          "seek-request",
          audio,
          { beforeTime, targetTime, safeProgress, isSameSong, shouldPlay },
          true,
        );

        audio.currentTime = targetTime;
        setCurrentTimeState(targetTime);
        setDurationState(audio.duration);

        if (!isSameSong || !shouldPlay) {
          lastStorageWriteTimeRef.current = Date.now();
          writeStoredPlayerState({
            currentSong: song,
            currentTime: targetTime,
            duration: audio.duration,
          });
        }

        if (shouldPlay) {
          playAudio(audio);
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
    [logAudioDebug, playAudio, postPausedState, setCurrentTimeState, setDurationState],
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
        pendingSeekRequestIdRef.current += 1;
        audio.pause();
      }

      if (existing?.id !== message.song.id) {
        if (existing) {
          waveformsRef.current.get(existing.id)?.seekTo(0);
        }

        currentSongRef.current = message.song;
        setCurrentSong(message.song);

        if (audio.src !== message.song.audioUrl) {
          audio.src = message.song.audioUrl;
        }
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

  const playerValue = useMemo(() => {
    const value = {
      currentSong,
      isPlaying,
      remotePlayingInAnotherTab,
      togglePlayPause,
      seekTo,
      registerWaveform,
      unregisterWaveform,
      setQueue,
      navigateTrack,
      closePlayer,
    } as PlayerContextType;

    Object.defineProperties(value, {
      currentTime: {
        enumerable: true,
        get: () => currentTimeRef.current,
      },
      duration: {
        enumerable: true,
        get: () => durationRef.current,
      },
    });

    return value;
  }, [
    currentSong,
    isPlaying,
    remotePlayingInAnotherTab,
    togglePlayPause,
    seekTo,
    registerWaveform,
    unregisterWaveform,
    setQueue,
    navigateTrack,
    closePlayer,
  ]);

  return (
    <PlayerContext.Provider value={playerValue}>
      <PlayerProgressContext.Provider value={progressStore}>
        {children}
      </PlayerProgressContext.Provider>
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

export function usePlayerProgress() {
  const store = useContext(PlayerProgressContext);

  if (!store) {
    throw new Error("usePlayerProgress must be used within PlayerProvider");
  }

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
