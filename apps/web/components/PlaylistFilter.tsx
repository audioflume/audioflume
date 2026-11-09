"use client";

import {
  MusicCheckIcon,
  MusicPlaylistFilter,
  MusicPlaylistIcon,
  MusicPlusIcon,
} from "@filmwave/shared";
import type { PlaylistRef } from "@/lib/types";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type PlaylistFilterProps = {
  selected: PlaylistRef | null;
  onChange: (selected: PlaylistRef | null) => void;
  iconOnly?: boolean;
};

export default function PlaylistFilter({
  selected,
  onChange,
  iconOnly = false,
}: PlaylistFilterProps) {
  const [playlists, setPlaylists] = useState<PlaylistRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const { userId } = useAuth();

  const loadPlaylists = useCallback(() => {
    if (playlistsLoaded) return;

    if (!userId) {
      setLoading(false);
      setPlaylistsLoaded(true);
      setPlaylists([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/playlists/filter-options", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setLoadError(data?.error ?? "Unable to load playlists.");
          setPlaylists([]);
        } else {
          setPlaylists(data ?? []);
        }
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load playlists.");
        setPlaylists([]);
      }

      if (cancelled) return;
      setLoading(false);
      setPlaylistsLoaded(true);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [playlistsLoaded, userId]);

  return (
    <MusicPlaylistFilter
      selected={selected}
      playlists={playlists}
      loading={loading}
      loaded={playlistsLoaded}
      loadError={loadError}
      playlistIcon={<MusicPlaylistIcon size={13} />}
      checkIcon={<MusicCheckIcon size={11} />}
      plusIcon={<MusicPlusIcon size={11} />}
      iconOnly={iconOnly}
      onOpen={loadPlaylists}
      onChange={onChange}
    />
  );
}
