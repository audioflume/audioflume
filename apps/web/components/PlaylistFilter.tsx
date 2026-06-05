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
import { supabase } from "@/lib/supabase";

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

      const { data, error } = await supabase
        .from("playlists")
        .select("id, name")
        .eq("clerk_user_id", userId)
        .order("name");

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
        setPlaylists([]);
      } else {
        setPlaylists(data ?? []);
      }

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
