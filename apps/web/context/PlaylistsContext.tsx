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

type PlaylistCoverMigrationResponse = {
  found: number;
  migrated: number;
  failed: number;
  failures?: Array<{
    id: number;
    name: string;
    error: string;
  }>;
};

const PlaylistsContext = createContext<PlaylistsContextValue | null>(null);
const PLAYLISTS_STORAGE_PREFIX = "filmwave-playlists:";
const PLAYLIST_COVER_MIGRATION_STORAGE_PREFIX =
  "filmwave-playlist-cover-migration-v1:";
const MAX_STORED_PLAYLISTS_CHARACTERS = 2_000_000;

let cachedUserId: string | null = null;
let cachedPlaylists: Playlist[] | null = null;
let pendingPlaylistsRequest: Promise<Playlist[]> | null = null;
let pendingPlaylistCoverMigration: Promise<PlaylistCoverMigrationResponse> | null =
  null;
let pendingPlaylistCoverMigrationUserId: string | null = null;
let playlistMutationVersion = 0;

function getPlaylistsStorageKey(userId: string) {
  return `${PLAYLISTS_STORAGE_PREFIX}${userId}`;
}

function getPlaylistCoverMigrationStorageKey(userId: string) {
  return `${PLAYLIST_COVER_MIGRATION_STORAGE_PREFIX}${userId}`;
}

function sanitizePlaylist(playlist: Playlist): Playlist {
  const coverImageUrl = playlist.cover_image_url;

  if (
    typeof coverImageUrl === "string" &&
    (coverImageUrl.startsWith("data:") || coverImageUrl.startsWith("blob:"))
  ) {
    return {
      ...playlist,
      cover_image_url: null,
    };
  }

  return playlist;
}

function sanitizePlaylists(value: unknown): Playlist[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((playlist) => sanitizePlaylist(playlist as Playlist));
}

function readStoredPlaylists(userId: string) {
  if (typeof window === "undefined") return null;

  const storageKey = getPlaylistsStorageKey(userId);

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;

    if (stored.length > MAX_STORED_PLAYLISTS_CHARACTERS) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    const sanitized = sanitizePlaylists(JSON.parse(stored));
    if (!sanitized) return null;

    const cleanStored = JSON.stringify(sanitized);
    if (cleanStored !== stored) {
      window.localStorage.setItem(storageKey, cleanStored);
    }

    return sanitized;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function writeStoredPlaylists(userId: string, playlists: Playlist[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getPlaylistsStorageKey(userId),
      JSON.stringify(playlists.map(sanitizePlaylist)),
    );
  } catch {
    // The in-memory cache remains available if browser storage is unavailable.
  }
}

function hasCompletedPlaylistCoverMigration(userId: string) {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.localStorage.getItem(
        getPlaylistCoverMigrationStorageKey(userId),
      ) === "complete"
    );
  } catch {
    return false;
  }
}

function markPlaylistCoverMigrationComplete(userId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getPlaylistCoverMigrationStorageKey(userId),
      "complete",
    );
  } catch {
    // A future page load can safely retry the idempotent migration check.
  }
}

async function requestPlaylists() {
  const res = await fetch("/api/playlists");
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || "Failed to load playlists");
  }

  const sanitized = sanitizePlaylists(data);

  if (!sanitized) {
    throw new Error("Invalid playlists response");
  }

  return sanitized;
}

function requestPlaylistCoverMigration(userId: string) {
  if (
    pendingPlaylistCoverMigration &&
    pendingPlaylistCoverMigrationUserId === userId
  ) {
    return pendingPlaylistCoverMigration;
  }

  pendingPlaylistCoverMigrationUserId = userId;
  pendingPlaylistCoverMigration = fetch("/api/playlists/migrate-covers", {
    method: "POST",
  })
    .then(async (res) => {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to restore playlist covers");
      }

      return data as PlaylistCoverMigrationResponse;
    })
    .finally(() => {
      if (pendingPlaylistCoverMigrationUserId === userId) {
        pendingPlaylistCoverMigration = null;
        pendingPlaylistCoverMigrationUserId = null;
      }
    });

  return pendingPlaylistCoverMigration;
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
        const sanitizedNext = next.map(sanitizePlaylist);

        playlistMutationVersion += 1;

        if (userId) {
          cachedUserId = userId;
          cachedPlaylists = sanitizedNext;
          writeStoredPlaylists(userId, sanitizedNext);
        }

        return sanitizedNext;
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
      const requestMutationVersion = playlistMutationVersion;

      try {
        if (
          cachedUserId !== userId ||
          !pendingPlaylistsRequest ||
          (force && !background)
        ) {
          pendingPlaylistsRequest = requestPlaylists();
        }

        const nextPlaylists = await pendingPlaylistsRequest;
        pendingPlaylistsRequest = null;

        if (
          background &&
          requestMutationVersion !== playlistMutationVersion
        ) {
          return;
        }

        cachedUserId = userId;
        cachedPlaylists = nextPlaylists;

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

  useEffect(() => {
    if (!isLoaded || !userId || hasCompletedPlaylistCoverMigration(userId)) {
      return;
    }

    let cancelled = false;

    async function restoreLegacyPlaylistCovers() {
      try {
        if (pendingPlaylistsRequest) {
          try {
            await pendingPlaylistsRequest;
          } catch {
            // The migration check can still run if the initial list request failed.
          }
        }

        const result = await requestPlaylistCoverMigration(userId);
        if (cancelled) return;

        if (result.migrated > 0) {
          cachedPlaylists = null;
          pendingPlaylistsRequest = null;
          await fetchPlaylists({ force: true, background: true });
        }

        if (result.failed === 0) {
          markPlaylistCoverMigrationComplete(userId);
        } else {
          console.warn("Some playlist covers could not be restored", result.failures);
        }
      } catch (migrationError) {
        console.warn("Playlist cover restoration failed", migrationError);
      }
    }

    void restoreLegacyPlaylistCovers();

    return () => {
      cancelled = true;
    };
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
