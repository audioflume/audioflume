"use client";

import { MusicPlaylistFilter } from "@filmwave/shared";
import type { PlaylistRef } from "@/lib/types";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import CheckIcon from "@/components/icons/CheckIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import PlusIcon from "@/components/icons/PlusIcon";

type PlaylistFilterProps = {
  selected: PlaylistRef | null;
  onChange: (selected: PlaylistRef | null) => void;
};

export default function PlaylistFilter({
  selected,
  onChange,
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
      playlistIcon={<PlaylistIcon size={13} />}
      checkIcon={<CheckIcon size={11} />}
      plusIcon={<PlusIcon size={11} />}
      onOpen={loadPlaylists}
      onChange={onChange}
    />
  );
}
