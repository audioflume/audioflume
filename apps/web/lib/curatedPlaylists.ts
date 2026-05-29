import type { Song } from "@/lib/types";

export type CuratedPlaylist = {
  id: number;
  name: string;
  kicker: string;
  cover_image_url: string | null;
  playlist_group: string;
  position: number;
  description: string;
  discover_section: string | null;
  show_on_discover: boolean;
  discover_position: number;
  discover_button_enabled: boolean;
  discover_button_text: string;
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

type CuratedPlaylistRow = {
  id: string | number;
  name: string | null;
  kicker: string | null;
  cover_image_url: string | null;
  playlist_group: string | null;
  position: number | null;
  description?: string | null;
  discover_section?: string | null;
  show_on_discover?: boolean | null;
  discover_position?: number | null;
  discover_button_enabled?: boolean | null;
  discover_button_text?: string | null;
  created_at?: string | null;
  song_count?: number | null;
};

export const DEFAULT_CURATED_PLAYLIST_GROUP = "Editor Picks";

export const DEFAULT_DISCOVER_BUTTON_TEXT = "Explore this mood";

export const CURATED_PLAYLIST_GROUPS = [
  "Editor Picks",
  "Documentary",
  "Commercial",
  "Travel",
  "Tension",
  "Ambient",
];

export const DISCOVER_SECTION_NONE = "";
export const DISCOVER_SECTION_CURATED = "curated_playlists";

export const DISCOVER_SECTION_OPTIONS = [
  { value: "discover_block_1", label: "Discover Block 1", category: "Main Blocks" },
  { value: "discover_block_2", label: "Discover Block 2", category: "Main Blocks" },
  { value: "discover_block_3", label: "Discover Block 3", category: "Main Blocks" },
  { value: "discover_block_4", label: "Discover Block 4", category: "Main Blocks" },
  { value: "production_style_1", label: "Production Style 1", category: "Production Style Blocks" },
  { value: "production_style_2", label: "Production Style 2", category: "Production Style Blocks" },
  { value: "production_style_3", label: "Production Style 3", category: "Production Style Blocks" },
  { value: "production_style_4", label: "Production Style 4", category: "Production Style Blocks" },
] as const;

export const DISCOVER_SECTION_LABELS = new Map(
  DISCOVER_SECTION_OPTIONS.map((option) => [option.value, option.label]),
);

export function normalizeCuratedPlaylist(
  row: CuratedPlaylistRow,
): CuratedPlaylist {
  return {
    id: Number(row.id),
    name: String(row.name || "Untitled playlist"),
    kicker: String(row.kicker || "Curated selection"),
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    playlist_group: String(
      row.playlist_group || DEFAULT_CURATED_PLAYLIST_GROUP,
    ),
    position: Number(row.position || 0),
    description: String(row.description || ""),
    discover_section: row.discover_section ? String(row.discover_section) : null,
    show_on_discover: Boolean(row.show_on_discover),
    discover_position: Number(row.discover_position || 0),
    discover_button_enabled: row.discover_button_enabled !== false,
    discover_button_text: String(row.discover_button_text || DEFAULT_DISCOVER_BUTTON_TEXT),
    created_at: row.created_at ? String(row.created_at) : undefined,
    song_count: Number(row.song_count || 0),
  };
}

export function getCuratedPlaylistError(err: unknown, fallback: string) {
  return {
    error: err instanceof Error ? err.message : fallback,
  };
}

export type CuratedPlaylistGroup = {
  id: number;
  name: string;
  position: number;
  created_at?: string;
  playlist_count: number;
  description: string | null;
};

type CuratedPlaylistGroupRow = {
  id: string | number;
  name: string | null;
  position: number | null;
  created_at?: string | null;
  playlist_count?: number | null;
  description?: string | null;
};

export function normalizeCuratedPlaylistGroup(
  row: CuratedPlaylistGroupRow,
): CuratedPlaylistGroup {
  return {
    id: Number(row.id),
    name: String(row.name || "Unnamed Group"),
    position: Number(row.position || 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    playlist_count: Number(row.playlist_count || 0),
    description: row.description ? String(row.description) : null,
  };
}
