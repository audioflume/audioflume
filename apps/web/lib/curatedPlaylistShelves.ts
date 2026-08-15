export const CURATED_PLAYLIST_SHELF_KEYS = ["popular", "trending"] as const;

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
  popular: [],
  trending: [],
};

export const CURATED_PLAYLIST_SHELF_LABELS: Record<
  CuratedPlaylistShelfKey,
  string
> = {
  popular: "Popular Right Now",
  trending: "Trending Playlists",
};

export const CURATED_PLAYLIST_SPECIAL_GROUPS = [
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
