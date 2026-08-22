export const DISCOVER_SECTION_SHELF_KEYS = [
  "discover_feature_cards",
  "discover_moods",
  "discover_curated",
  "discover_production",
] as const;

export type DiscoverSectionShelfKey =
  (typeof DISCOVER_SECTION_SHELF_KEYS)[number];

export type DiscoverSectionShelfItem = {
  playlist_id: number;
  position: number;
};

export type DiscoverSectionShelfState = Record<
  DiscoverSectionShelfKey,
  DiscoverSectionShelfItem[]
>;

export const EMPTY_DISCOVER_SECTION_SHELVES: DiscoverSectionShelfState = {
  discover_feature_cards: [],
  discover_moods: [],
  discover_curated: [],
  discover_production: [],
};

export const DISCOVER_SECTION_SHELF_LABELS: Record<
  DiscoverSectionShelfKey,
  string
> = {
  discover_feature_cards: "Featured Cards",
  discover_moods: "Explore These Moods",
  discover_curated: "Curated Playlists",
  discover_production: "Browse by Production Style",
};

export function isDiscoverSectionShelfKey(
  value: unknown,
): value is DiscoverSectionShelfKey {
  return (
    typeof value === "string" &&
    DISCOVER_SECTION_SHELF_KEYS.includes(value as DiscoverSectionShelfKey)
  );
}
