export const COMMUNITY_PLAYLIST_CATEGORIES = [
  "Documentary",
  "Travel",
  "Ambient",
  "Cinematic",
  "Urban",
  "Commercial",
  "Background",
  "Electronic",
  "Acoustic",
  "Hip-Hop",
  "Sports",
  "Emotional",
  "Tension",
  "Uplifting",
] as const;

export type CommunityPlaylistCategory =
  (typeof COMMUNITY_PLAYLIST_CATEGORIES)[number];

export const MAX_COMMUNITY_PLAYLIST_CATEGORIES = 3;

const CATEGORY_ALIASES: Record<CommunityPlaylistCategory, string[]> = {
  Documentary: [
    "documentary",
    "curious",
    "investigative",
    "thoughtful",
    "minimal",
    "human",
  ],
  Travel: [
    "travel",
    "adventure",
    "road trip",
    "world",
    "exploration",
    "wanderlust",
  ],
  Ambient: ["ambient", "atmospheric", "drone", "ethereal", "space", "meditative"],
  Cinematic: ["cinematic", "score", "orchestral", "epic", "trailer", "dramatic"],
  Urban: ["urban", "city", "street", "gritty", "modern", "night"],
  Commercial: ["commercial", "corporate", "advertising", "brand", "promo", "business"],
  Background: ["background", "underscore", "bed", "subtle", "minimal", "steady"],
  Electronic: ["electronic", "synth", "synthwave", "techno", "house", "digital"],
  Acoustic: ["acoustic", "folk", "organic", "guitar", "singer songwriter", "americana"],
  "Hip-Hop": ["hip hop", "hip-hop", "rap", "trap", "boom bap", "beat"],
  Sports: ["sports", "action", "workout", "training", "competition", "adrenaline"],
  Emotional: ["emotional", "heartfelt", "sad", "moving", "hopeful", "reflective"],
  Tension: ["tension", "suspense", "dark", "ominous", "thriller", "mystery"],
  Uplifting: ["uplifting", "positive", "happy", "inspiring", "optimistic", "feel good"],
};

type CategorySong = {
  genres?: string[] | null;
  moods?: string[] | null;
};

function normalizeTag(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
}

export function isCommunityPlaylistCategory(
  value: unknown,
): value is CommunityPlaylistCategory {
  return (
    typeof value === "string" &&
    COMMUNITY_PLAYLIST_CATEGORIES.includes(value as CommunityPlaylistCategory)
  );
}

export function normalizeCommunityPlaylistCategories(value: unknown) {
  if (!Array.isArray(value)) return [] as CommunityPlaylistCategory[];

  return [...new Set(value.filter(isCommunityPlaylistCategory))].slice(
    0,
    MAX_COMMUNITY_PLAYLIST_CATEGORIES - 1,
  );
}

export function suggestCommunityPlaylistCategories(
  playlistName: string,
  songs: CategorySong[],
) {
  const scores = new Map<CommunityPlaylistCategory, number>();
  const name = normalizeTag(playlistName);
  const songThreshold = Math.max(2, Math.ceil(songs.length * 0.3));

  for (const category of COMMUNITY_PLAYLIST_CATEGORIES) {
    const aliases = CATEGORY_ALIASES[category];
    const nameMatch = aliases.some((alias) => name.includes(normalizeTag(alias)));
    let matchingSongs = 0;

    for (const song of songs) {
      const tags = [...(song.genres ?? []), ...(song.moods ?? [])].map(normalizeTag);
      const matches = tags.some((tag) =>
        aliases.some((alias) => {
          const normalizedAlias = normalizeTag(alias);
          return tag === normalizedAlias || tag.includes(normalizedAlias);
        }),
      );

      if (matches) matchingSongs += 1;
    }

    if (nameMatch || matchingSongs >= songThreshold) {
      scores.set(category, matchingSongs + (nameMatch ? 2 : 0));
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)
    .slice(0, MAX_COMMUNITY_PLAYLIST_CATEGORIES);
}
