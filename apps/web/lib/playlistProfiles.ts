export type PlaylistProfileSong = {
  id?: string | null;
  artist?: string | null;
  bpm?: number | null;
  genres?: readonly string[] | null;
  moods?: readonly string[] | null;
  regions?: readonly string[] | null;
  instruments?: readonly string[] | null;
  builds?: readonly string[] | null;
  vocals?: readonly string[] | null;
  instrumental?: boolean | null;
};

export type PlaylistProfileContext = {
  tags?: readonly string[] | null;
  subcategories?: readonly string[] | null;
};

type Distribution = Record<string, number>;

export type PlaylistProfile = {
  songCount: number;
  genres: Distribution;
  moods: Distribution;
  regions: Distribution;
  instruments: Distribution;
  builds: Distribution;
  vocals: Distribution;
  artists: Distribution;
  context: Distribution;
  bpmAverage: number | null;
  instrumentalRatio: number | null;
};

export type PlaylistProfileSummary = {
  songCount: number;
  genres: string[];
  moods: string[];
  instruments: string[];
  builds: string[];
  context: string[];
  bpmAverage: number | null;
};

const CONTEXT_ALIASES: Record<string, readonly string[]> = {
  ambient: ["atmospheric", "background", "minimal cinematic"],
  adventurous: ["adventure", "wonder discovery"],
  background: ["background"],
  burdened: ["brooding", "emotional storytelling"],
  chill: ["calm", "background"],
  cinematic: ["cinematic"],
  classical: ["cinematic"],
  dark: ["dark", "brooding"],
  dramatic: ["cinematic", "emotional storytelling"],
  dreamy: ["atmospheric", "wonder discovery"],
  electronic: ["tech innovation"],
  emotional: ["emotional", "emotional storytelling"],
  energetic: ["energetic", "action"],
  epic: ["epic trailer", "cinematic"],
  film: ["film story", "cinematic"],
  "feel good": ["uplifting", "playful"],
  gritty: ["gritty", "dark"],
  heroic: ["epic trailer", "cinematic"],
  "hip hop": ["brand lifestyle"],
  hopeful: ["uplifting", "emotional storytelling"],
  inspirational: ["uplifting", "emotional storytelling"],
  mysterious: ["mystery", "suspense"],
  nostalgic: ["reflective", "emotional storytelling"],
  orchestral: ["cinematic"],
  peaceful: ["calm", "atmospheric"],
  playful: ["playful"],
  pop: ["brand lifestyle", "uplifting"],
  powerful: ["epic trailer", "action"],
  quirky: ["playful"],
  reflective: ["reflective", "intimate"],
  score: ["cinematic", "film story"],
  soothing: ["calm", "atmospheric"],
  sorrowful: ["emotional", "emotional storytelling"],
  suspenseful: ["suspense", "tense"],
  tense: ["tense", "suspense"],
  trap: ["brand lifestyle"],
  triumphant: ["epic trailer", "uplifting"],
  upbeat: ["uplifting", "energetic"],
};

function normalizeTerm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeDistribution(counts: Map<string, number>): Distribution {
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  if (!total) return {};

  return Object.fromEntries(
    [...counts.entries()].map(([key, value]) => [key, value / total]),
  );
}

function addCount(counts: Map<string, number>, value: unknown, amount = 1) {
  const key = normalizeTerm(value);
  if (!key || amount <= 0) return;
  counts.set(key, (counts.get(key) ?? 0) + amount);
}

function buildTagDistribution(
  songs: readonly PlaylistProfileSong[],
  field:
    | "genres"
    | "moods"
    | "regions"
    | "instruments"
    | "builds"
    | "vocals",
) {
  const counts = new Map<string, number>();

  songs.forEach((song) => {
    const uniqueValues = new Set(
      (song[field] ?? []).map(normalizeTerm).filter(Boolean),
    );
    uniqueValues.forEach((value) => addCount(counts, value));
  });

  return normalizeDistribution(counts);
}

function buildArtistDistribution(songs: readonly PlaylistProfileSong[]) {
  const counts = new Map<string, number>();
  songs.forEach((song) => addCount(counts, song.artist));
  return normalizeDistribution(counts);
}

function addDerivedContext(
  counts: Map<string, number>,
  distribution: Distribution,
  multiplier: number,
) {
  Object.entries(distribution).forEach(([term, weight]) => {
    addCount(counts, term, weight * multiplier);
    (CONTEXT_ALIASES[term] ?? []).forEach((alias) =>
      addCount(counts, alias, weight * multiplier),
    );
  });
}

function buildContextDistribution(
  genres: Distribution,
  moods: Distribution,
  context: PlaylistProfileContext,
) {
  const counts = new Map<string, number>();

  (context.tags ?? []).forEach((tag) => addCount(counts, tag, 1.25));
  (context.subcategories ?? []).forEach((subcategory) =>
    addCount(counts, subcategory, 1.5),
  );

  addDerivedContext(counts, genres, 0.85);
  addDerivedContext(counts, moods, 1);

  return normalizeDistribution(counts);
}

function averageBpm(songs: readonly PlaylistProfileSong[]) {
  const bpms = songs
    .map((song) => Number(song.bpm))
    .filter((bpm) => Number.isFinite(bpm) && bpm > 0);

  if (!bpms.length) return null;
  return bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length;
}

function getInstrumentalRatio(songs: readonly PlaylistProfileSong[]) {
  const values = songs
    .map((song) => song.instrumental)
    .filter((value): value is boolean => typeof value === "boolean");

  if (!values.length) return null;
  return values.filter(Boolean).length / values.length;
}

function distributionSimilarity(a: Distribution, b: Distribution) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (!aKeys.length || !bKeys.length) return null;

  const keys = new Set([...aKeys, ...bKeys]);
  let intersection = 0;
  let union = 0;

  keys.forEach((key) => {
    const aValue = a[key] ?? 0;
    const bValue = b[key] ?? 0;
    intersection += Math.min(aValue, bValue);
    union += Math.max(aValue, bValue);
  });

  return union > 0 ? intersection / union : null;
}

function bpmSimilarity(a: number | null, b: number | null) {
  if (a === null || b === null) return null;
  return Math.max(0, 1 - Math.min(Math.abs(a - b), 80) / 80);
}

function ratioSimilarity(a: number | null, b: number | null) {
  if (a === null || b === null) return null;
  return 1 - Math.min(1, Math.abs(a - b));
}

function weightedAverage(
  values: Array<{ value: number | null; weight: number }>,
) {
  let score = 0;
  let totalWeight = 0;

  values.forEach(({ value, weight }) => {
    if (value === null) return;
    score += value * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? score / totalWeight : null;
}

function topTerms(distribution: Distribution, limit: number) {
  return Object.entries(distribution)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

export function buildPlaylistProfile(
  songs: readonly PlaylistProfileSong[],
  context: PlaylistProfileContext = {},
): PlaylistProfile {
  const genres = buildTagDistribution(songs, "genres");
  const moods = buildTagDistribution(songs, "moods");

  return {
    songCount: songs.length,
    genres,
    moods,
    regions: buildTagDistribution(songs, "regions"),
    instruments: buildTagDistribution(songs, "instruments"),
    builds: buildTagDistribution(songs, "builds"),
    vocals: buildTagDistribution(songs, "vocals"),
    artists: buildArtistDistribution(songs),
    context: buildContextDistribution(genres, moods, context),
    bpmAverage: averageBpm(songs),
    instrumentalRatio: getInstrumentalRatio(songs),
  };
}

export function scorePlaylistSimilarity(
  source: PlaylistProfile,
  candidate: PlaylistProfile,
) {
  const musicScore = weightedAverage([
    {
      value: distributionSimilarity(source.genres, candidate.genres),
      weight: 0.3,
    },
    {
      value: distributionSimilarity(source.moods, candidate.moods),
      weight: 0.3,
    },
    {
      value: distributionSimilarity(source.instruments, candidate.instruments),
      weight: 0.12,
    },
    {
      value: distributionSimilarity(source.builds, candidate.builds),
      weight: 0.07,
    },
    {
      value: distributionSimilarity(source.regions, candidate.regions),
      weight: 0.05,
    },
    {
      value: distributionSimilarity(source.vocals, candidate.vocals),
      weight: 0.04,
    },
    { value: bpmSimilarity(source.bpmAverage, candidate.bpmAverage), weight: 0.08 },
    {
      value: ratioSimilarity(
        source.instrumentalRatio,
        candidate.instrumentalRatio,
      ),
      weight: 0.04,
    },
  ]);
  const contextScore = distributionSimilarity(source.context, candidate.context);

  if (musicScore !== null && contextScore !== null) {
    return musicScore * 0.82 + contextScore * 0.18;
  }
  if (musicScore !== null) return musicScore;
  if (contextScore !== null) return contextScore * 0.9;
  return 0;
}

export function summarizePlaylistProfile(
  profile: PlaylistProfile,
): PlaylistProfileSummary {
  return {
    songCount: profile.songCount,
    genres: topTerms(profile.genres, 4),
    moods: topTerms(profile.moods, 5),
    instruments: topTerms(profile.instruments, 4),
    builds: topTerms(profile.builds, 3),
    context: topTerms(profile.context, 6),
    bpmAverage:
      profile.bpmAverage === null ? null : Math.round(profile.bpmAverage),
  };
}
