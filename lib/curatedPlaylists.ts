import type { Song } from "@/lib/types";

export type CuratedPlaylist = {
  id: number;
  name: string;
  kicker: string;
  cover_image_url: string | null;
  playlist_group: string;
  position: number;
  created_at?: string;
  song_count?: number;
};

export type CuratedPlaylistSong = Song & {
  curated_playlist_song_id: number;
  curated_playlist_id: number;
  song_id: string;
  position: number;
  created_at: string;
};

export type CuratedPlaylistGroup = {
  id: number;
  name: string;
  position: number;
  created_at?: string;
  playlist_count?: number;
};

type CuratedPlaylistRow = {
  id: string | number;
  name: string | null;
  kicker: string | null;
  cover_image_url: string | null;
  playlist_group: string | null;
  position: number | null;
  created_at?: string | null;
  song_count?: number | null;
};

type CuratedPlaylistGroupRow = {
  id: string | number;
  name: string | null;
  position: number | null;
  created_at?: string | null;
  playlist_count?: number | null;
};

export const DEFAULT_CURATED_PLAYLIST_GROUP = "Editor Picks";

export const FALLBACK_CURATED_PLAYLIST_GROUPS = [
  "Editor Picks",
  "Documentary",
  "Commercial",
  "Travel",
  "Tension",
  "Ambient",
];

export function normalizeCuratedPlaylist(
  row: CuratedPlaylistRow,
): CuratedPlaylist {
  return {
    id: Number(row.id),
    name: String(row.name || "Untitled playlist"),
    kicker: String(row.kicker || "Curated selection"),
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    playlist_group: String(row.playlist_group || DEFAULT_CURATED_PLAYLIST_GROUP),
    position: Number(row.position || 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    song_count: Number(row.song_count || 0),
  };
}

export function normalizeCuratedPlaylistGroup(
  row: CuratedPlaylistGroupRow,
): CuratedPlaylistGroup {
  return {
    id: Number(row.id),
    name: String(row.name || DEFAULT_CURATED_PLAYLIST_GROUP),
    position: Number(row.position || 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    playlist_count: Number(row.playlist_count || 0),
  };
}

export function getCuratedPlaylistError(err: unknown, fallback: string) {
  return {
    error: err instanceof Error ? err.message : fallback,
  };
}
