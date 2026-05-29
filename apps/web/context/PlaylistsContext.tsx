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

const PlaylistsContext = createContext<PlaylistsContextValue | null>(null);

let cachedUserId: string | null = null;
let cachedPlaylists: Playlist[] | null = null;
let pendingPlaylistsRequest: Promise<Playlist[]> | null = null;

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

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchPlaylists = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!isLoaded) return;

      if (!userId) {
        cachedUserId = null;
        cachedPlaylists = null;
        pendingPlaylistsRequest = null;

        if (!mountedRef.current) return;

        setPlaylists([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (!force && cachedUserId === userId && cachedPlaylists) {
        setPlaylists(cachedPlaylists);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (force || cachedUserId !== userId || !pendingPlaylistsRequest) {
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

        setError(
          err instanceof Error ? err.message : "Failed to load playlists",
        );

        if (!cachedPlaylists || cachedUserId !== userId) {
          setPlaylists([]);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [isLoaded, userId],
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
    fetchPlaylists();
  }, [fetchPlaylists]);

  const value = useMemo(
    () => ({
      playlists,
      setPlaylists,
      loading,
      error,
      refetchPlaylists,
    }),
    [playlists, loading, error, refetchPlaylists],
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
