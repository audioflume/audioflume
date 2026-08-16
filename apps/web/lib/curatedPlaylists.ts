import type { Song } from "@/lib/types";

export const CURATED_BROWSE_SUBCATEGORIES = {
  "brand-commercial": { value: "brand-commercial", label: "Brand & Commercial" },
  "youtube-creator": { value: "youtube-creator", label: "YouTube & Creator" },
  "educational-explainer": {
    value: "educational-explainer",
    label: "Educational & Explainer",
  },
  travel: { value: "travel", label: "Travel" },
  documentary: { value: "documentary", label: "Documentary" },
  "product-tech": { value: "product-tech", label: "Product & Tech" },
  "film-story": { value: "film-story", label: "Film & Story" },
  lifestyle: { value: "lifestyle", label: "Lifestyle" },
  uplifting: { value: "uplifting", label: "Uplifting" },
  emotional: { value: "emotional", label: "Emotional" },
  reflective: { value: "reflective", label: "Reflective" },
  energetic: { value: "energetic", label: "Energetic" },
  playful: { value: "playful", label: "Playful" },
  calm: { value: "calm", label: "Calm" },
  tense: { value: "tense", label: "Tense" },
  dark: { value: "dark", label: "Dark" },
  cinematic: { value: "cinematic", label: "Cinematic" },
  corporate: { value: "corporate", label: "Corporate" },
  world: { value: "world", label: "World" },
  background: { value: "background", label: "Background" },
  "tech-innovation": { value: "tech-innovation", label: "Tech & Innovation" },
  advertising: { value: "advertising", label: "Advertising" },
  "brand-lifestyle": { value: "brand-lifestyle", label: "Brand & Lifestyle" },
  "food-hospitality": { value: "food-hospitality", label: "Food & Hospitality" },
  luxury: { value: "luxury", label: "Luxury" },
  "sports-fitness": { value: "sports-fitness", label: "Sports & Fitness" },
  product: { value: "product", label: "Product" },
  adventure: { value: "adventure", label: "Adventure" },
  "road-trip": { value: "road-trip", label: "Road Trip" },
  coastal: { value: "coastal", label: "Coastal" },
  desert: { value: "desert", label: "Desert" },
  mountain: { value: "mountain", label: "Mountain" },
  city: { value: "city", label: "City" },
  "slow-travel": { value: "slow-travel", label: "Slow Travel" },
  "human-stories": { value: "human-stories", label: "Human Stories" },
  educational: { value: "educational", label: "Educational" },
  nature: { value: "nature", label: "Nature" },
  history: { value: "history", label: "History" },
  "science-technology": {
    value: "science-technology",
    label: "Science & Technology",
  },
  "culture-travel": { value: "culture-travel", label: "Culture & Travel" },
  "social-impact": { value: "social-impact", label: "Social Impact" },
  sports: { value: "sports", label: "Sports" },
  "epic-trailer": { value: "epic-trailer", label: "Epic & Trailer" },
  "emotional-storytelling": {
    value: "emotional-storytelling",
    label: "Emotional Storytelling",
  },
  intimate: { value: "intimate", label: "Intimate" },
  atmospheric: { value: "atmospheric", label: "Atmospheric" },
  action: { value: "action", label: "Action" },
  suspense: { value: "suspense", label: "Suspense" },
  "wonder-discovery": { value: "wonder-discovery", label: "Wonder & Discovery" },
  "minimal-cinematic": { value: "minimal-cinematic", label: "Minimal Cinematic" },
  brooding: { value: "brooding", label: "Brooding" },
  mystery: { value: "mystery", label: "Mystery" },
  uneasy: { value: "uneasy", label: "Uneasy" },
  gritty: { value: "gritty", label: "Gritty" },
  noir: { value: "noir", label: "Noir" },
  industrial: { value: "industrial", label: "Industrial" },
  "slow-burn": { value: "slow-burn", label: "Slow Burn" },
} as const;

export type CuratedBrowseSubcategory = keyof typeof CURATED_BROWSE_SUBCATEGORIES;

function browseSubcategory(value: CuratedBrowseSubcategory) {
  return CURATED_BROWSE_SUBCATEGORIES[value];
}

export const CURATED_BROWSE_FILTERS = [
  {
    value: "editors",
    label: "For Editors",
    subcategories: [
      browseSubcategory("brand-commercial"),
      browseSubcategory("youtube-creator"),
      browseSubcategory("educational-explainer"),
      browseSubcategory("travel"),
      browseSubcategory("documentary"),
      browseSubcategory("product-tech"),
      browseSubcategory("film-story"),
      browseSubcategory("lifestyle"),
    ],
  },
  {
    value: "mood",
    label: "By Mood",
    subcategories: [
      browseSubcategory("uplifting"),
      browseSubcategory("emotional"),
      browseSubcategory("reflective"),
      browseSubcategory("energetic"),
      browseSubcategory("playful"),
      browseSubcategory("calm"),
      browseSubcategory("tense"),
      browseSubcategory("dark"),
    ],
  },
  {
    value: "genre",
    label: "By Genre",
    subcategories: [
      browseSubcategory("cinematic"),
      browseSubcategory("corporate"),
      browseSubcategory("documentary"),
      browseSubcategory("youtube-creator"),
      browseSubcategory("world"),
      browseSubcategory("background"),
      browseSubcategory("tech-innovation"),
      browseSubcategory("advertising"),
      browseSubcategory("brand-lifestyle"),
    ],
  },
  {
    value: "brands",
    label: "For Brands",
    subcategories: [
      browseSubcategory("lifestyle"),
      browseSubcategory("corporate"),
      browseSubcategory("tech-innovation"),
      browseSubcategory("food-hospitality"),
      browseSubcategory("luxury"),
      browseSubcategory("sports-fitness"),
      browseSubcategory("product"),
    ],
  },
  {
    value: "travel",
    label: "Travel",
    subcategories: [
      browseSubcategory("adventure"),
      browseSubcategory("road-trip"),
      browseSubcategory("world"),
      browseSubcategory("coastal"),
      browseSubcategory("desert"),
      browseSubcategory("mountain"),
      browseSubcategory("city"),
      browseSubcategory("slow-travel"),
    ],
  },
  {
    value: "documentary",
    label: "Documentary",
    subcategories: [
      browseSubcategory("human-stories"),
      browseSubcategory("educational"),
      browseSubcategory("nature"),
      browseSubcategory("history"),
      browseSubcategory("science-technology"),
      browseSubcategory("culture-travel"),
      browseSubcategory("social-impact"),
      browseSubcategory("sports"),
    ],
  },
  {
    value: "cinematic",
    label: "Cinematic",
    subcategories: [
      browseSubcategory("epic-trailer"),
      browseSubcategory("emotional-storytelling"),
      browseSubcategory("intimate"),
      browseSubcategory("atmospheric"),
      browseSubcategory("action"),
      browseSubcategory("suspense"),
      browseSubcategory("wonder-discovery"),
      browseSubcategory("minimal-cinematic"),
    ],
  },
  {
    value: "dark-moody",
    label: "Dark & Moody",
    subcategories: [
      browseSubcategory("brooding"),
      browseSubcategory("mystery"),
      browseSubcategory("suspense"),
      browseSubcategory("uneasy"),
      browseSubcategory("gritty"),
      browseSubcategory("noir"),
      browseSubcategory("industrial"),
      browseSubcategory("slow-burn"),
    ],
  },
] as const;

export type CuratedBrowseTag = (typeof CURATED_BROWSE_FILTERS)[number]["value"];

const CURATED_BROWSE_TAG_VALUES = new Set<CuratedBrowseTag>(
  CURATED_BROWSE_FILTERS.map((filter) => filter.value),
);

const CURATED_BROWSE_SUBCATEGORY_VALUES = new Set<CuratedBrowseSubcategory>(
  Object.keys(CURATED_BROWSE_SUBCATEGORIES) as CuratedBrowseSubcategory[],
);

const LEGACY_CURATED_BROWSE_SUBCATEGORY_ALIASES: Record<
  string,
  CuratedBrowseSubcategory
> = {
  "editors:brand-commercial": "brand-commercial",
  "editors:youtube-creator": "youtube-creator",
  "editors:educational-explainer": "educational-explainer",
  "editors:travel": "travel",
  "editors:documentary": "documentary",
  "editors:product-tech": "product-tech",
  "editors:social-short-form": "film-story",
  "editors:lifestyle": "lifestyle",
  "mood:uplifting": "uplifting",
  "mood:emotional": "emotional",
  "mood:reflective": "reflective",
  "mood:energetic": "energetic",
  "mood:playful": "playful",
  "mood:calm": "calm",
  "mood:tense": "tense",
  "mood:dark": "dark",
  "genre:cinematic": "cinematic",
  "genre:corporate": "corporate",
  "genre:documentary": "documentary",
  "genre:youtube-creator": "youtube-creator",
  "genre:world": "world",
  "genre:background": "background",
  "genre:tech-innovation": "tech-innovation",
  "genre:advertising": "advertising",
  "genre:brand-lifestyle": "brand-lifestyle",
  "brands:lifestyle": "lifestyle",
  "brands:corporate": "corporate",
  "brands:tech-innovation": "tech-innovation",
  "brands:food-hospitality": "food-hospitality",
  "brands:luxury": "luxury",
  "brands:sports-fitness": "sports-fitness",
  "brands:product": "product",
  "travel:adventure": "adventure",
  "travel:road-trip": "road-trip",
  "travel:world": "world",
  "travel:coastal": "coastal",
  "travel:desert": "desert",
  "travel:mountain": "mountain",
  "travel:city": "city",
  "travel:slow-travel": "slow-travel",
  "documentary:human-stories": "human-stories",
  "documentary:educational": "educational",
  "documentary:nature": "nature",
  "documentary:history": "history",
  "documentary:science-technology": "science-technology",
  "documentary:culture-travel": "culture-travel",
  "documentary:social-impact": "social-impact",
  "documentary:sports": "sports",
  "cinematic:epic-trailer": "epic-trailer",
  "cinematic:emotional-storytelling": "emotional-storytelling",
  "cinematic:intimate": "intimate",
  "cinematic:atmospheric": "atmospheric",
  "cinematic:action": "action",
  "cinematic:suspense": "suspense",
  "cinematic:wonder-discovery": "wonder-discovery",
  "cinematic:minimal-cinematic": "minimal-cinematic",
  "dark-moody:brooding": "brooding",
  "dark-moody:mystery": "mystery",
  "dark-moody:suspense": "suspense",
  "dark-moody:uneasy": "uneasy",
  "dark-moody:gritty": "gritty",
  "dark-moody:noir": "noir",
  "dark-moody:industrial": "industrial",
  "dark-moody:slow-burn": "slow-burn",
};

const CURATED_BROWSE_SUBCATEGORY_PARENTS = new Map<
  CuratedBrowseSubcategory,
  Set<CuratedBrowseTag>
>();

CURATED_BROWSE_FILTERS.forEach((filter) => {
  filter.subcategories.forEach((subcategory) => {
    const parents = CURATED_BROWSE_SUBCATEGORY_PARENTS.get(subcategory.value);

    if (parents) {
      parents.add(filter.value);
      return;
    }

    CURATED_BROWSE_SUBCATEGORY_PARENTS.set(
      subcategory.value,
      new Set<CuratedBrowseTag>([filter.value]),
    );
  });
});

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
        .map((subcategory) => {
          const rawValue = String(subcategory || "").trim();
          return LEGACY_CURATED_BROWSE_SUBCATEGORY_ALIASES[rawValue] ?? rawValue;
        })
        .filter((subcategory): subcategory is CuratedBrowseSubcategory =>
          CURATED_BROWSE_SUBCATEGORY_VALUES.has(
            subcategory as CuratedBrowseSubcategory,
          ),
        ),
    ),
  ];

  if (!browseTags) return normalized;

  return normalized.filter((subcategory) => {
    const parents = CURATED_BROWSE_SUBCATEGORY_PARENTS.get(subcategory);
    return parents
      ? [...parents].some((parent) => browseTags.includes(parent))
      : false;
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