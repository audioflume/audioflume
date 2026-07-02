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
    } catch (err) {
      if (!cachedSongs) {
        setSongs([]);
      }
      setError(err instanceof Error ? err.message : "Failed to load songs");
    } finally {
      setLoading(false);
    }
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
