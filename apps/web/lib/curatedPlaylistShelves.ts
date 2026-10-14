export const CURATED_PLAYLIST_SHELF_KEYS = ["featured", "popular", "trending"] as const;

export type CuratedPlaylistShelfKey =
  (typeof CURATED_PLAYLIST_SHELF_KEYS)[number];

export type CuratedPlaylistShelfItem = {
  playlist_id: number;
  position: number;
};

export type CuratedPlaylistShelfState = Record<
  CuratedPlaylistShelfKey,
  CuratedPlaylistShelfItem[]
>;

export const EMPTY_CURATED_PLAYLIST_SHELVES: CuratedPlaylistShelfState = {
  featured: [],
  popular: [],
  trending: [],
};

export const CURATED_PLAYLIST_SHELF_LABELS: Record<
  CuratedPlaylistShelfKey,
  string
> = {
  featured: "Featured Playlists",
  popular: "Popular Right Now",
  trending: "Trending Playlists",
};

export const CURATED_PLAYLIST_SPECIAL_GROUPS = [
  "Featured Playlists",
  "Popular Right Now",
  "Newly Added",
  "Trending Playlists",
] as const;

export function isCuratedPlaylistShelfKey(
  value: unknown,
): value is CuratedPlaylistShelfKey {
  return (
    typeof value === "string" &&
    CURATED_PLAYLIST_SHELF_KEYS.includes(value as CuratedPlaylistShelfKey)
  );
}
