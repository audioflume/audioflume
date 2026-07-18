"use client";

import type { Playlist } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PlaylistsContextValue = {
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  loading: boolean;
  error: string | null;
  refetchPlaylists: () => Promise<void>;
};

type FetchPlaylistsOptions = {
  force?: boolean;
  background?: boolean;
};

const PlaylistsContext = createContext<PlaylistsContextValue | null>(null);
const PLAYLISTS_STORAGE_PREFIX = "filmwave-playlists:";

let cachedUserId: string | null = null;
let cachedPlaylists: Playlist[] | null = null;
let pendingPlaylistsRequest: Promise<Playlist[]> | null = null;

function getPlaylistsStorageKey(userId: string) {
  return `${PLAYLISTS_STORAGE_PREFIX}${userId}`;
}

function readStoredPlaylists(userId: string) {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(getPlaylistsStorageKey(userId));
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Playlist[]) : null;
  } catch {
    return null;
  }
}

function writeStoredPlaylists(userId: string, playlists: Playlist[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getPlaylistsStorageKey(userId),
      JSON.stringify(playlists),
    );
  } catch {
    // The in-memory cache remains available if browser storage is unavailable.
  }
}

async function requestPlaylists() {
  const res = await fetch("/api/playlists");
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || "Failed to load playlists");
  }

  if (!Array.isArray(data)) {
    throw new Error("Invalid playlists response");
  }

  return data as Playlist[];
}

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;

  const [playlists, setPlaylistsState] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const setPlaylists = useCallback<
    React.Dispatch<React.SetStateAction<Playlist[]>>
  >(
    (update) => {
      setPlaylistsState((current) => {
        const next =
          typeof update === "function"
            ? (update as (previous: Playlist[]) => Playlist[])(current)
            : update;

        if (userId) {
          cachedUserId = userId;
          cachedPlaylists = next;
          writeStoredPlaylists(userId, next);
        }

        return next;
      });
    },
    [userId],
  );

  const fetchPlaylists = useCallback(
    async ({ force = false, background = false }: FetchPlaylistsOptions = {}) => {
      if (!isLoaded) return;

      if (!userId) {
        cachedUserId = null;
        cachedPlaylists = null;
        pendingPlaylistsRequest = null;

        if (!mountedRef.current) return;

        setPlaylistsState([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (!force && cachedUserId === userId && cachedPlaylists) {
        setPlaylistsState(cachedPlaylists);
        setLoading(false);
        setError(null);
        return;
      }

      if (!background) setLoading(true);
      setError(null);

      try {
        if (
          cachedUserId !== userId ||
          !pendingPlaylistsRequest ||
          (force && !background)
        ) {
          pendingPlaylistsRequest = requestPlaylists();
        }

        const nextPlaylists = await pendingPlaylistsRequest;

        cachedUserId = userId;
        cachedPlaylists = nextPlaylists;
        pendingPlaylistsRequest = null;

        if (!mountedRef.current) return;

        setPlaylists(nextPlaylists);
      } catch (err) {
        pendingPlaylistsRequest = null;

        if (!mountedRef.current) return;

        if (!background || !cachedPlaylists || cachedUserId !== userId) {
          setError(
            err instanceof Error ? err.message : "Failed to load playlists",
          );
        }

        if (!cachedPlaylists || cachedUserId !== userId) {
          setPlaylistsState([]);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [isLoaded, setPlaylists, userId],
  );

  const refetchPlaylists = useCallback(async () => {
    cachedPlaylists = null;
    pendingPlaylistsRequest = null;
    await fetchPlaylists({ force: true });
  }, [fetchPlaylists]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      void fetchPlaylists();
      return;
    }

    if (cachedUserId === userId && cachedPlaylists) {
      void fetchPlaylists();
      return;
    }

    const storedPlaylists = readStoredPlaylists(userId);

    if (storedPlaylists) {
      cachedUserId = userId;
      cachedPlaylists = storedPlaylists;
      setPlaylistsState(storedPlaylists);
      setLoading(false);
      setError(null);
      void fetchPlaylists({ force: true, background: true });
      return;
    }

    void fetchPlaylists();
  }, [fetchPlaylists, isLoaded, userId]);

  const value = useMemo(
    () => ({
      playlists,
      setPlaylists,
      loading,
      error,
      refetchPlaylists,
    }),
    [playlists, setPlaylists, loading, error, refetchPlaylists],
  );

  return (
    <PlaylistsContext.Provider value={value}>
      {children}
    </PlaylistsContext.Provider>
  );
}

export function usePlaylistsContext() {
  const context = useContext(PlaylistsContext);

  if (!context) {
    throw new Error(
      "usePlaylistsContext must be used inside PlaylistsProvider",
    );
  }

  return context;
}
