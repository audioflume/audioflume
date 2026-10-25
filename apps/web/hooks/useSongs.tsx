"use client";

import type { Song } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

let cachedSongs: Song[] | null = null;

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>(() => cachedSongs ?? []);
  const [loading, setLoading] = useState(() => !cachedSongs);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    setLoading(!cachedSongs);
    setError(null);

    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await fetch("/api/songs", { cache: "no-store" });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load songs");
        }

        const songsData = Array.isArray(data)
          ? data
          : Array.isArray(data?.songs)
            ? data.songs
            : null;

        if (!songsData) {
          throw new Error("Invalid songs response");
        }

        cachedSongs = songsData;
        setSongs(songsData);
        setLoading(false);
        return;
      } catch (err) {
        lastError = err;

        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      }
    }

    if (!cachedSongs) {
      setSongs([]);
    }
    setError(
      lastError instanceof Error ? lastError.message : "Failed to load songs",
    );
    setLoading(false);
  }, []);

  const refetchSongs = useCallback(async () => {
    cachedSongs = null;
    await fetchSongs();
  }, [fetchSongs]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  return {
    songs,
    setSongs,
    loading,
    error,
    refetchSongs,
  };
}
