"use client";

import type { Song } from "@/lib/types";
import Hls from "hls.js";
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

// Fine-grained playback store — used by useIsCurrentSong / useIsCurrentSongPlaying.
// Emits on every song change or play/pause toggle.
// SongCards subscribe with a boolean snapshot so only the 2 affected cards re-render
// instead of all 50+ when currentSong changes.
type PlaybackStore = {
  subscribe: (listener: () => void) => () => void;
  getSongId: () => string | null;
  getIsPlaying: () => boolean;
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
const PlaybackStoreContext = createContext<PlaybackStore | null>(null);

const PLAYER_STORAGE_KEY = "filmwave-player-state";
const CLOSE_PLAYER_EVENT = "filmwave:close-player";
const PLAYER_BROADCAST_CHANNEL = "filmwave-player";
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

function getSongSource(song: Song) {
  return song.hlsUrl || song.playbackUrl || song.audioUrl;
}

function canPlayNativeHls(audio: HTMLAudioElement) {
  return Boolean(audio.canPlayType("application/vnd.apple.mpegurl"));
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
    // Ignore storage failures
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const activeSourceRef = useRef("");
  const pendingPlayAfterManifestRef = useRef(false);

  const waveformsRef = useRef<Map<string, WaveformHandle>>(new Map());
  const currentSongRef = useRef<Song | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  // Refs mirroring React state — used by the fine-grained playback store so
  // useSyncExternalStore snapshots always read the latest value synchronously.
  const isPlayingRef = useRef(false);

  const progressSnapshotRef = useRef<PlayerProgressSnapshot>({
    currentTime: 0,
    duration: 0,
  });
  const progressSubscribersRef = useRef<Set<() => void>>(new Set());

  // Separate subscriber set for the fine-grained playback store (song id + playing).
  const playbackSubscribersRef = useRef<Set<() => void>>(new Set());

  const queueRef = useRef<Song[]>([]);
  const playRequestIdRef = useRef(0);
  const pendingSeekRequestIdRef = useRef(0);
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

  // ─── Playback store helpers ────────────────────────────────────────────────

  const emitPlaybackUpdate = useCallback(() => {
    playbackSubscribersRef.current.forEach((l) => l());
  }, []);

  // Wrapper so every setIsPlaying call also updates the ref + notifies the
  // fine-grained playback store in the same synchronous tick.
  const setIsPlayingState = useCallback(
    (value: boolean) => {
      isPlayingRef.current = value;
      setIsPlaying(value);
      emitPlaybackUpdate();
    },
    [emitPlaybackUpdate],
  );

  const subscribeToPlayback = useCallback((listener: () => void) => {
    playbackSubscribersRef.current.add(listener);
    return () => { playbackSubscribersRef.current.delete(listener); };
  }, []);

  const getPlaybackSongId = useCallback(() => currentSongRef.current?.id ?? null, []);
  const getPlaybackIsPlaying = useCallback(() => isPlayingRef.current, []);

  const playbackStore = useMemo<PlaybackStore>(
    () => ({
      subscribe: subscribeToPlayback,
      getSongId: getPlaybackSongId,
      getIsPlaying: getPlaybackIsPlaying,
    }),
    [subscribeToPlayback, getPlaybackSongId, getPlaybackIsPlaying],
  );

  // ─── Progress store helpers ────────────────────────────────────────────────

  const emitProgressUpdate = useCallback(() => {
    progressSnapshotRef.current = {
      currentTime: currentTimeRef.current,
      duration: durationRef.current,
    };
    progressSubscribersRef.current.forEach((l) => l());
  }, []);

  const subscribeToProgress = useCallback((listener: () => void) => {
    progressSubscribersRef.current.add(listener);
    return () => { progressSubscribersRef.current.delete(listener); };
  }, []);

  const getProgressSnapshot = useCallback(() => progressSnapshotRef.current, []);

  const progressStore = useMemo<PlayerProgressStore>(
    () => ({
      subscribe: subscribeToProgress,
      getSnapshot: getProgressSnapshot,
    }),
    [subscribeToProgress, getProgressSnapshot],
  );

  // ─── Broadcast helpers ─────────────────────────────────────────────────────

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

  // ─── HLS helpers ──────────────────────────────────────────────────────────

  const destroyHls = useCallback(() => {
    pendingPlayAfterManifestRef.current = false;
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  const loadSongSource = useCallback(
    (audio: HTMLAudioElement, song: Song, playAfterLoad = false) => {
      const nextSource = getSongSource(song);
      if (!nextSource) return;

      if (activeSourceRef.current === nextSource) {
        if (playAfterLoad && audio.paused) {
          audio.play().catch((err) => {
            if (!isInterruptedPlayError(err)) console.warn("[Player] play() rejected:", err);
          });
        }
        return;
      }

      activeSourceRef.current = nextSource;
      destroyHls();

      if (song.hlsUrl && nextSource === song.hlsUrl) {
        if (canPlayNativeHls(audio)) {
          audio.src = song.hlsUrl;
          if (playAfterLoad) {
            audio.play().catch((err) => {
              if (!isInterruptedPlayError(err)) console.warn("[Player] play() rejected:", err);
            });
          }
          return;
        }

        if (Hls.isSupported()) {
          const hls = new Hls({
            lowLatencyMode: false,
            backBufferLength: 30,
            maxBufferLength: 30,
            startFragPrefetch: true,
          });

          hls.loadSource(song.hlsUrl);
          hls.attachMedia(audio);
          hlsRef.current = hls;

          if (playAfterLoad) {
            pendingPlayAfterManifestRef.current = true;

            hls.once(Hls.Events.MANIFEST_PARSED, () => {
              if (!pendingPlayAfterManifestRef.current) return;
              pendingPlayAfterManifestRef.current = false;

              audio.play().catch((err) => {
                if (!isInterruptedPlayError(err)) {
                  console.warn("[Player] play() rejected after manifest:", err);
                }
              });
            });
          }

          return;
        }
      }

      audio.src = song.playbackUrl || song.audioUrl;
      activeSourceRef.current = audio.src;

      if (playAfterLoad) {
        audio.play().catch((err) => {
          if (!isInterruptedPlayError(err)) console.warn("[Player] play() rejected:", err);
        });
      }
    },
    [destroyHls],
  );

  const clearAudioSource = useCallback((audio: HTMLAudioElement) => {
    destroyHls();
    activeSourceRef.current = "";
    audio.removeAttribute("src");
    audio.load();
  }, [destroyHls]);

  // ─── Audio element (created once) ─────────────────────────────────────────

  function getAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";

      audio.addEventListener("play", () => {
        remoteOwnerTabIdRef.current = null;
        setRemotePlayingInAnotherTab(false);
        setIsPlayingState(true);
        postPlayingState();
      });

      audio.addEventListener("pause", () => {
        setIsPlayingState(false);
      });

      audio.addEventListener("stalled", () => {
        const stalledTime = audio.currentTime;
        if (audio.paused) return;
        window.setTimeout(() => {
          if (audio.paused || audio.currentTime !== stalledTime) return;
          try {
            audio.currentTime = stalledTime;
            audio.play().catch(() => {});
          } catch { /* ignore */ }
        }, 1200);
      });

      audio.addEventListener("ended", () => {
        const current = currentSongRef.current;
        const queue = queueRef.current;

        if (!current || !queue.length) {
          setCurrentTimeState(0);
          setIsPlayingState(false);
          postPausedState();
          return;
        }

        const currentIndex = queue.findIndex((s) => s.id === current.id);
        const nextSong = currentIndex >= 0 ? queue[currentIndex + 1] : null;

        waveformsRef.current.get(current.id)?.seekTo(0);
        setCurrentTimeState(0);

        if (!nextSong) {
          setIsPlayingState(false);
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
        if (id) waveformsRef.current.get(id)?.seekTo(progress);

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
        if (isFinite(audio.duration)) setDurationState(audio.duration);
      });

      audio.addEventListener("error", () => {
        if (audio.error) {
          console.warn(`[Player] Audio error — code: ${audio.error.code}, message: ${audio.error.message}`);
        }
        setIsPlayingState(false);
        postPausedState();
      });

      audioRef.current = audio;
    }

    return audioRef.current;
  }

  // ─── Playback actions ──────────────────────────────────────────────────────

  const safePlay = useCallback(() => {
    const audio = getAudio();
    const current = currentSongRef.current;
    if (!current) return;
    loadSongSource(audio, current, true);
  }, [loadSongSource]);

  const safePause = useCallback(() => {
    playRequestIdRef.current += 1;
    pendingPlayAfterManifestRef.current = false;

    const audio = getAudio();
    audio.pause();
    setIsPlayingState(false);

    if (currentSongRef.current) {
      lastStorageWriteTimeRef.current = Date.now();
      writeStoredPlayerState({
        currentSong: currentSongRef.current,
        currentTime: currentTimeRef.current,
        duration: durationRef.current,
      });
    }

    postPausedState();
  }, [postPausedState, setIsPlayingState]);

  const closePlayer = useCallback(() => {
    playRequestIdRef.current += 1;
    pendingSeekRequestIdRef.current += 1;

    const audio = audioRef.current;
    const current = currentSongRef.current;

    if (audio) { audio.pause(); clearAudioSource(audio); }
    if (current) waveformsRef.current.get(current.id)?.seekTo(0);

    currentSongRef.current = null;
    currentTimeRef.current = 0;
    durationRef.current = 0;
    progressSnapshotRef.current = { currentTime: 0, duration: 0 };
    remoteOwnerTabIdRef.current = null;

    setCurrentSong(null);
    setIsPlayingState(false);
    setRemotePlayingInAnotherTab(false);
    emitProgressUpdate();
    emitPlaybackUpdate();

    window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    postPlayerMessage({ type: "closed", tabId: tabIdRef.current });
  }, [clearAudioSource, emitPlaybackUpdate, emitProgressUpdate, postPlayerMessage, setIsPlayingState]);

  const playSongDirectly = useCallback(
    (song: Song, shouldPlay?: boolean) => {
      const audio = getAudio();
      const wasPlaying = shouldPlay !== undefined ? shouldPlay : !audio.paused;

      playRequestIdRef.current += 1;
      pendingSeekRequestIdRef.current += 1;
      pendingPlayAfterManifestRef.current = false;
      remoteOwnerTabIdRef.current = null;
      setRemotePlayingInAnotherTab(false);

      const previousSong = currentSongRef.current;
      if (previousSong) waveformsRef.current.get(previousSong.id)?.seekTo(0);

      if (!audio.paused) audio.pause();

      // Update song ref BEFORE emitting so snapshot readers see the new id
      currentSongRef.current = song;
      setCurrentSong(song);
      setCurrentTimeState(0);
      setDurationState(song.duration || 0);
      emitPlaybackUpdate(); // notify fine-grained subscribers immediately

      lastStorageWriteTimeRef.current = Date.now();
      writeStoredPlayerState({ currentSong: song, currentTime: 0, duration: song.duration || 0 });

      loadSongSource(audio, song, wasPlaying);
    },
    [emitPlaybackUpdate, loadSongSource, setCurrentTimeState, setDurationState],
  );

  playSongDirectlyRef.current = playSongDirectly;

  const togglePlayPause = useCallback(
    (song: Song) => {
      const audio = getAudio();
      if (currentSongRef.current?.id === song.id) {
        if (audio.paused) { safePlay(); } else { safePause(); }
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
      const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;

      remoteOwnerTabIdRef.current = null;
      setRemotePlayingInAnotherTab(false);

      if (!isSameSong) {
        playRequestIdRef.current += 1;
        pendingPlayAfterManifestRef.current = false;

        const previousSong = currentSongRef.current;
        if (previousSong) waveformsRef.current.get(previousSong.id)?.seekTo(0);
        if (!audio.paused) audio.pause();

        currentSongRef.current = song;
        setCurrentSong(song);
        setIsPlayingState(false);
        setCurrentTimeState(0);
        setDurationState(song.duration || 0);
        emitPlaybackUpdate();
        loadSongSource(audio, song, false);

        lastStorageWriteTimeRef.current = Date.now();
        writeStoredPlayerState({ currentSong: song, currentTime: 0, duration: song.duration || 0 });
      }

      const applySeek = () => {
        if (seekRequestId !== pendingSeekRequestIdRef.current) return;
        if (currentSongRef.current?.id !== song.id) return;
        if (!audio.duration || !isFinite(audio.duration)) return;

        const targetTime = safeProgress * audio.duration;
        audio.currentTime = targetTime;
        setCurrentTimeState(targetTime);
        setDurationState(audio.duration);

        if (!isSameSong || !shouldPlay) {
          lastStorageWriteTimeRef.current = Date.now();
          writeStoredPlayerState({ currentSong: song, currentTime: targetTime, duration: audio.duration });
        }

        if (shouldPlay) {
          if (!audio.paused) { postPlayingState(); } else {
            audio.play().catch((err) => {
              if (!isInterruptedPlayError(err)) console.warn("[Player] play() rejected after seek:", err);
            });
          }
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
    [emitPlaybackUpdate, loadSongSource, postPausedState, postPlayingState, setCurrentTimeState, setDurationState, setIsPlayingState],
  );

  const registerWaveform = useCallback((songId: string, handle: WaveformHandle) => {
    waveformsRef.current.set(songId, handle);
  }, []);

  const unregisterWaveform = useCallback((songId: string) => {
    waveformsRef.current.delete(songId);
  }, []);

  const setQueue = useCallback((songs: Song[]) => { queueRef.current = songs; }, []);

  const navigateTrack = useCallback(
    (direction: "prev" | "next", forcePlay = false) => {
      const queue = queueRef.current;
      const current = currentSongRef.current;
      if (!queue.length || !current) return;

      const idx = queue.findIndex((s) => s.id === current.id);
      if (idx === -1) return;

      const nextIdx = direction === "next" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= queue.length) {
        setIsPlayingState(false);
        postPausedState();
        return;
      }

      const shouldPlay = forcePlay || !audioRef.current?.paused;
      playSongDirectly(queue[nextIdx], shouldPlay);
    },
    [playSongDirectly, postPausedState, setIsPlayingState],
  );

  navigateTrackRef.current = navigateTrack;

  // ─── Effects ───────────────────────────────────────────────────────────────

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
          setIsPlayingState(false);
        }
        return;
      }

      const audio = getAudio();
      const existing = currentSongRef.current;

      if (!audio.paused) {
        playRequestIdRef.current += 1;
        pendingSeekRequestIdRef.current += 1;
        pendingPlayAfterManifestRef.current = false;
        audio.pause();
      }

      if (existing?.id !== message.song.id) {
        if (existing) waveformsRef.current.get(existing.id)?.seekTo(0);
        currentSongRef.current = message.song;
        setCurrentSong(message.song);
        loadSongSource(audio, message.song, false);
        emitPlaybackUpdate();
      }

      const safeTime = Math.max(0, message.currentTime || 0);
      const nextDuration = message.duration || message.song.duration || 0;

      const applyRemoteTime = () => {
        try {
          if (audio.duration && isFinite(audio.duration)) {
            audio.currentTime = Math.max(0, Math.min(safeTime, audio.duration));
          }
        } catch { /* ignore */ }
      };

      if (audio.readyState >= 1) { applyRemoteTime(); }
      else { audio.addEventListener("loadedmetadata", applyRemoteTime, { once: true }); }

      const progress = nextDuration > 0 ? safeTime / nextDuration : 0;
      waveformsRef.current.get(message.song.id)?.seekTo(progress);

      remoteOwnerTabIdRef.current = message.tabId;
      setRemotePlayingInAnotherTab(true);
      setIsPlayingState(false);
      setCurrentTimeState(safeTime);
      setDurationState(nextDuration);

      writeStoredPlayerState({ currentSong: message.song, currentTime: safeTime, duration: nextDuration });
    };

    return () => {
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [emitPlaybackUpdate, loadSongSource, setCurrentTimeState, setDurationState, setIsPlayingState]);

  useEffect(() => {
    window.addEventListener(CLOSE_PLAYER_EVENT, closePlayer);
    return () => window.removeEventListener(CLOSE_PLAYER_EVENT, closePlayer);
  }, [closePlayer]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !currentSongRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTimeState(audio.currentTime || currentTimeRef.current);
      setDurationState(
        audio.duration && isFinite(audio.duration) ? audio.duration : durationRef.current,
      );
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [setCurrentTimeState, setDurationState]);

  useEffect(() => () => { destroyHls(); }, [destroyHls]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        const audio = getAudio();
        if (currentSongRef.current) {
          if (audio.paused) { safePlay(); } else { safePause(); }
        }
      }
      if (e.code === "ArrowDown") { e.preventDefault(); navigateTrackRef.current("next"); }
      if (e.code === "ArrowUp") { e.preventDefault(); navigateTrackRef.current("prev"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safePause, safePlay]);

  // ─── Context value ─────────────────────────────────────────────────────────

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
      currentTime: { enumerable: true, get: () => currentTimeRef.current },
      duration: { enumerable: true, get: () => durationRef.current },
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
        <PlaybackStoreContext.Provider value={playbackStore}>
          {children}
        </PlaybackStoreContext.Provider>
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
}

// ─── Public hooks ─────────────────────────────────────────────────────────────

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function usePlayerProgress() {
  const store = useContext(PlayerProgressContext);
  if (!store) throw new Error("usePlayerProgress must be used within PlayerProvider");
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/**
 * Returns true only when this specific song is the current song.
 * Uses useSyncExternalStore with a boolean snapshot so only the 2 SongCards
 * that actually changed (old current → new current) re-render on song switch.
 * All other SongCards are completely skipped.
 */
export function useIsCurrentSong(songId: string): boolean {
  const store = useContext(PlaybackStoreContext);
  if (!store) throw new Error("useIsCurrentSong must be used within PlayerProvider");
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSongId() === songId,
    () => false,
  );
}

/**
 * Returns true only when this song is current AND playing.
 * Combines both checks into one subscription so the play/pause icon
 * only re-renders in the one SongCard that needs it.
 */
export function useIsCurrentSongPlaying(songId: string): boolean {
  const store = useContext(PlaybackStoreContext);
  if (!store) throw new Error("useIsCurrentSongPlaying must be used within PlayerProvider");
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSongId() === songId && store.getIsPlaying(),
    () => false,
  );
}

/**
 * Returns true when any song is loaded in the player.
 * Used to determine bottom collision padding for dropdowns.
 */
export function useHasCurrentSong(): boolean {
  const store = useContext(PlaybackStoreContext);
  if (!store) throw new Error("useHasCurrentSong must be used within PlayerProvider");
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSongId() !== null,
    () => false,
  );
}
