"use client";

import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type FavoritesContextValue = {
  favoriteIds: string[];
  favoriteIdSet: Set<string>;
  favoritesLoaded: boolean;
  isFavorite: (songId: string) => boolean;
  toggleFavorite: (song: Song) => void;
  removeFavorite: (songId: string) => void;
  refetchFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { currentSong } = usePlayer();
  const { isLoaded, userId } = useAuth();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToastMessage(message);

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 1800);
  }, []);

  const refetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavoriteIds([]);
      setFavoritesLoaded(true);
      return;
    }

    try {
      const res = await fetch("/api/favorites", {
        cache: "no-store",
      });

      if (!res.ok) {
        setFavoriteIds([]);
        setFavoritesLoaded(true);
        return;
      }

      const data = await res.json();

      const nextIds = Array.isArray(data?.favorites)
        ? data.favorites
            .map((item: { song_id?: unknown }) => item.song_id)
            .filter(
              (songId: unknown): songId is string => typeof songId === "string",
            )
        : [];

      setFavoriteIds(nextIds);
      setFavoritesLoaded(true);
    } catch {
      setFavoriteIds([]);
      setFavoritesLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      setFavoriteIds([]);
      setFavoritesLoaded(true);
      return;
    }

    setFavoritesLoaded(false);
    refetchFavorites();
  }, [isLoaded, userId, refetchFavorites]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback(
    (songId: string) => favoriteIdSet.has(songId),
    [favoriteIdSet],
  );

  const toggleFavorite = useCallback(
    async (song: Song) => {
      if (!userId) return;

      const exists = favoriteIdSet.has(song.id);

      setFavoriteIds((current) =>
        exists
          ? current.filter((id) => id !== song.id)
          : [song.id, ...current.filter((id) => id !== song.id)],
      );

      showToast(exists ? 'Removed from "Favorites"' : 'Added to "Favorites"');

      try {
        if (exists) {
          const res = await fetch(
            `/api/favorites/${encodeURIComponent(song.id)}`,
            {
              method: "DELETE",
            },
          );

          if (!res.ok) {
            await refetchFavorites();
          }

          return;
        }

        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            song_id: song.id,
          }),
        });

        if (!res.ok) {
          await refetchFavorites();
        }
      } catch {
        await refetchFavorites();
      }
    },
    [favoriteIdSet, refetchFavorites, showToast, userId],
  );

  const removeFavorite = useCallback(
    async (songId: string) => {
      if (!userId) return;
      if (!favoriteIdSet.has(songId)) return;

      setFavoriteIds((current) => current.filter((id) => id !== songId));
      showToast('Removed from "Favorites"');

      try {
        const res = await fetch(
          `/api/favorites/${encodeURIComponent(songId)}`,
          {
            method: "DELETE",
          },
        );

        if (!res.ok) {
          await refetchFavorites();
        }
      } catch {
        await refetchFavorites();
      }
    },
    [favoriteIdSet, refetchFavorites, showToast, userId],
  );

  const value = useMemo(
    () => ({
      favoriteIds,
      favoriteIdSet,
      favoritesLoaded,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      refetchFavorites,
    }),
    [
      favoriteIds,
      favoriteIdSet,
      favoritesLoaded,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      refetchFavorites,
    ],
  );

  return (
    <>
      <FavoritesContext.Provider value={value}>
        {children}
      </FavoritesContext.Provider>

      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }

  return context;
}
