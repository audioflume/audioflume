"use client";

import { useState } from "react";
import {
  PlaylistManagerLibrarySection,
  PlaylistManagerLoadingGrid,
  sortPlaylistNewestFirst,
} from "@/components/admin/AdminPlaylistManagerShared";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

type Props = {
  playlists: CuratedPlaylist[];
  loading: boolean;
  error: string;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
};

export default function AdminAllPlaylistsView({
  playlists,
  loading,
  error,
  deletingId,
  onDeletePlaylist,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const masterPlaylists = [...playlists].sort(sortPlaylistNewestFirst);

  if (loading) {
    return <PlaylistManagerLoadingGrid count={10} />;
  }

  if (error) {
    return <div className="py-10 text-sm text-[var(--danger)]">{error}</div>;
  }

  return (
    <PlaylistManagerLibrarySection
      title="All Playlists"
      subtitle={`${masterPlaylists.length} playlist${masterPlaylists.length === 1 ? "" : "s"} · Master library`}
      playlists={masterPlaylists}
      emptyMessage="No playlists yet."
      getEditHref={(playlist) =>
        `/admin/playlist-manager/${playlist.id}/edit`
      }
      getMeta={(playlist) => `${playlist.song_count || 0} songs`}
      editLabel="Edit Playlist"
      deleteLabel="Delete Playlist"
      openMenuId={openMenuId}
      setOpenMenuId={setOpenMenuId}
      deletingId={deletingId}
      onDeletePlaylist={onDeletePlaylist}
    />
  );
}
