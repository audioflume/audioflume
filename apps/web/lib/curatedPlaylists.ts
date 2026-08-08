import type { Song } from "@/lib/types";

export const CURATED_BROWSE_FILTERS = [
  {
    value: "editors",
    label: "For Editors",
    subcategories: [
      { value: "editors:openers", label: "Openers" },
      { value: "editors:under-dialogue", label: "Under Dialogue" },
      { value: "editors:montage", label: "Montage" },
      { value: "editors:builds", label: "Builds" },
      { value: "editors:reveals", label: "Reveals" },
      { value: "editors:fast-cuts", label: "Fast Cuts" },
      { value: "editors:slow-burn", label: "Slow Burn" },
      { value: "editors:endings", label: "Endings" },
    ],
  },
  {
    value: "mood",
    label: "By Mood",
    subcategories: [
      { value: "mood:hopeful", label: "Hopeful" },
      { value: "mood:reflective", label: "Reflective" },
      { value: "mood:emotional", label: "Emotional" },
      { value: "mood:playful", label: "Playful" },
      { value: "mood:euphoric", label: "Euphoric" },
      { value: "mood:melancholic", label: "Melancholic" },
      { value: "mood:tense", label: "Tense" },
      { value: "mood:peaceful", label: "Peaceful" },
    ],
  },
  {
    value: "genre",
    label: "By Genre",
    subcategories: [
      { value: "genre:indie", label: "Indie" },
      { value: "genre:electronic", label: "Electronic" },
      { value: "genre:hip-hop", label: "Hip-Hop" },
      { value: "genre:rock", label: "Rock" },
      { value: "genre:folk", label: "Folk" },
      { value: "genre:pop", label: "Pop" },
      { value: "genre:classical", label: "Classical" },
      { value: "genre:jazz", label: "Jazz" },
    ],
  },
  {
    value: "brands",
    label: "For Brands",
    subcategories: [
      { value: "brands:lifestyle", label: "Lifestyle" },
      { value: "brands:fashion", label: "Fashion" },
      { value: "brands:tech", label: "Tech" },
      { value: "brands:automotive", label: "Automotive" },
      { value: "brands:food-drink", label: "Food & Drink" },
      { value: "brands:luxury", label: "Luxury" },
      { value: "brands:sports", label: "Sports" },
      { value: "brands:hospitality", label: "Hospitality" },
    ],
  },
  {
    value: "travel",
    label: "Travel",
    subcategories: [
      { value: "travel:adventure", label: "Adventure" },
      { value: "travel:road-trip", label: "Road Trip" },
      { value: "travel:world", label: "World" },
      { value: "travel:coastal", label: "Coastal" },
      { value: "travel:desert", label: "Desert" },
      { value: "travel:mountain", label: "Mountain" },
      { value: "travel:city", label: "City" },
      { value: "travel:slow-travel", label: "Slow Travel" },
    ],
  },
  {
    value: "documentary",
    label: "Documentary",
    subcategories: [
      { value: "documentary:human-stories", label: "Human Stories" },
      { value: "documentary:nature", label: "Nature" },
      { value: "documentary:investigative", label: "Investigative" },
      { value: "documentary:history", label: "History" },
      { value: "documentary:science-tech", label: "Science & Tech" },
      { value: "documentary:social-impact", label: "Social Impact" },
      { value: "documentary:sports", label: "Sports" },
      { value: "documentary:true-crime", label: "True Crime" },
    ],
  },
  {
    value: "cinematic",
    label: "Cinematic",
    subcategories: [
      { value: "cinematic:epic", label: "Epic" },
      { value: "cinematic:intimate", label: "Intimate" },
      { value: "cinematic:emotional", label: "Emotional" },
      { value: "cinematic:action", label: "Action" },
      { value: "cinematic:wonder", label: "Wonder" },
      { value: "cinematic:suspense", label: "Suspense" },
      { value: "cinematic:minimal", label: "Minimal" },
      { value: "cinematic:trailer", label: "Trailer" },
    ],
  },
  {
    value: "dark-moody",
    label: "Dark & Moody",
    subcategories: [
      { value: "dark-moody:noir", label: "Noir" },
      { value: "dark-moody:brooding", label: "Brooding" },
      { value: "dark-moody:unease", label: "Unease" },
      { value: "dark-moody:dread", label: "Dread" },
      { value: "dark-moody:crime", label: "Crime" },
      { value: "dark-moody:industrial", label: "Industrial" },
      { value: "dark-moody:haunted", label: "Haunted" },
      { value: "dark-moody:slow-burn", label: "Slow Burn" },
    ],
  },
] as const;

export type CuratedBrowseTag = (typeof CURATED_BROWSE_FILTERS)[number]["value"];
export type CuratedBrowseSubcategory =
  (typeof CURATED_BROWSE_FILTERS)[number]["subcategories"][number]["value"];

const CURATED_BROWSE_TAG_VALUES = new Set<CuratedBrowseTag>(
  CURATED_BROWSE_FILTERS.map((filter) => filter.value),
);

const CURATED_BROWSE_SUBCATEGORY_VALUES = new Set<CuratedBrowseSubcategory>(
  CURATED_BROWSE_FILTERS.flatMap((filter) =>
    filter.subcategories.map((subcategory) => subcategory.value),
  ),
);

const CURATED_BROWSE_SUBCATEGORY_PARENTS = new Map<
  CuratedBrowseSubcategory,
  CuratedBrowseTag
>(
  CURATED_BROWSE_FILTERS.flatMap((filter) =>
    filter.subcategories.map(
      (subcategory) => [subcategory.value, filter.value] as const,
    ),
  ),
);

export function normalizeCuratedBrowseTags(value: unknown): CuratedBrowseTag[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((tag) => String(tag || "").trim())
        .filter((tag): tag is CuratedBrowseTag =>
          CURATED_BROWSE_TAG_VALUES.has(tag as CuratedBrowseTag),
        ),
    ),
  ];
}

export function normalizeCuratedBrowseSubcategories(
  value: unknown,
  browseTags?: readonly CuratedBrowseTag[],
): CuratedBrowseSubcategory[] {
  if (!Array.isArray(value)) return [];

  const normalized = [
    ...new Set(
      value
        .map((subcategory) => String(subcategory || "").trim())
        .filter((subcategory): subcategory is CuratedBrowseSubcategory =>
          CURATED_BROWSE_SUBCATEGORY_VALUES.has(
            subcategory as CuratedBrowseSubcategory,
          ),
        ),
    ),
  ];

  if (!browseTags) return normalized;

  return normalized.filter((subcategory) => {
    const parent = CURATED_BROWSE_SUBCATEGORY_PARENTS.get(subcategory);
    return parent ? browseTags.includes(parent) : false;
  });
}

export type CuratedPlaylist = {
  id: number;
  name: string;
  kicker: string;
  cover_image_url: string | null;
  cover_video_url?: string | null;
  playlist_group: string;
  browse_tags: CuratedBrowseTag[];
  browse_subcategories: CuratedBrowseSubcategory[];
  position: number;
  description: string;
  discover_section: string | null;
  show_on_discover: boolean;
  show_on_curated_feature: boolean;
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
  cover_video_url?: string | null;
  playlist_group: string | null;
  browse_tags?: unknown;
  browse_subcategories?: unknown;
  position: number | null;
  description?: string | null;
  discover_section?: string | null;
  show_on_discover?: boolean | null;
  show_on_curated_feature?: boolean | null;
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
  const browseTags = normalizeCuratedBrowseTags(row.browse_tags);

  return {
    id: Number(row.id),
    name: String(row.name || "Untitled playlist"),
    kicker: String(row.kicker || "Curated selection"),
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    cover_video_url: row.cover_video_url ? String(row.cover_video_url) : null,
    playlist_group: String(
      row.playlist_group || DEFAULT_CURATED_PLAYLIST_GROUP,
    ),
    browse_tags: browseTags,
    browse_subcategories: normalizeCuratedBrowseSubcategories(
      row.browse_subcategories,
      browseTags,
    ),
    position: Number(row.position || 0),
    description: String(row.description || ""),
    discover_section: row.discover_section ? String(row.discover_section) : null,
    show_on_discover: Boolean(row.show_on_discover),
    show_on_curated_feature: Boolean(row.show_on_curated_feature),
    discover_position: Number(row.discover_position || 0),
    discover_button_enabled: row.discover_button_enabled !== false,
    discover_button_text: String(row.discover_button_text || DEFAULT_DISCOVER_BUTTON_TEXT),
    created_at: row.created_at ? String(row.created_at) : undefined,
    song_count: Number(row.song_count || 0),
  };
}

function getErrorText(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (!err || typeof err !== "object") return "";

  const record = err as Record<string, unknown>;

  return [record.message, record.details, record.hint, record.code]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

export function getCuratedPlaylistError(err: unknown, fallback: string) {
  const message = getErrorText(err);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("browse_subcategories") &&
    (normalizedMessage.includes("column") ||
      normalizedMessage.includes("schema cache") ||
      normalizedMessage.includes("pgrst204") ||
      normalizedMessage.includes("42703"))
  ) {
    return {
      error:
        "Curated browse subcategories require the Supabase migration apps/web/supabase/migrations/20260808115500_add_curated_playlist_browse_subcategories.sql. Apply that migration, then save the playlist again.",
    };
  }

  if (
    normalizedMessage.includes("browse_tags") &&
    (normalizedMessage.includes("column") ||
      normalizedMessage.includes("schema cache") ||
      normalizedMessage.includes("pgrst204") ||
      normalizedMessage.includes("42703"))
  ) {
    return {
      error:
        "Curated browse filters require the Supabase migration apps/web/supabase/migrations/20260808104000_add_curated_playlist_browse_tags.sql. Apply that migration, then save the playlist again.",
    };
  }

  if (
    normalizedMessage.includes("show_on_curated_feature") &&
    (normalizedMessage.includes("column") ||
      normalizedMessage.includes("schema cache") ||
      normalizedMessage.includes("pgrst204") ||
      normalizedMessage.includes("42703"))
  ) {
    return {
      error:
        "Featured curated playlists require the Supabase migration apps/web/supabase/migrations/20260807090000_add_curated_playlist_featured.sql. Apply that migration, then save the playlist again.",
    };
  }

  if (
    normalizedMessage.includes("cover_video_url") &&
    (normalizedMessage.includes("column") ||
      normalizedMessage.includes("schema cache") ||
      normalizedMessage.includes("pgrst204") ||
      normalizedMessage.includes("42703"))
  ) {
    return {
      error:
        "Cover videos require the Supabase migration apps/web/supabase/migrations/20260805080000_add_curated_playlist_cover_video.sql. Apply that migration, then save the playlist again.",
    };
  }

  return {
    error: message || fallback,
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
