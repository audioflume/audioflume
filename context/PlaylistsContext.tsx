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

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async () => {
    if (!isLoaded) return;

    if (!user) {
      setPlaylists([]);
      setLoading(false);
      setHasLoaded(true);
      setError(null);
      return;
    }

    if (!hasLoaded) {
      setLoading(true);
    }

    setError(null);

    try {
      const res = await fetch("/api/playlists");
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load playlists");
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid playlists response");
      }

      setPlaylists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playlists");

      if (!hasLoaded) {
        setPlaylists([]);
      }
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [isLoaded, user, hasLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    setHasLoaded(false);
    setPlaylists([]);
    setError(null);
  }, [isLoaded, user?.id]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const value = useMemo(
    () => ({
      playlists,
      setPlaylists,
      loading,
      error,
      refetchPlaylists: fetchPlaylists,
    }),
    [playlists, loading, error, fetchPlaylists],
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
