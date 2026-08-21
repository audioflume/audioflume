import type { SemanticSongSearchMatch } from "@/lib/songEmbeddings";

export type HybridSearchSong = {
  id: string;
  title: string | null;
  artist: string | null;
  genres: string[] | null;
  moods: string[] | null;
  regions: string[] | null;
  instruments: string[] | null;
  builds: string[] | null;
  vocals: string[] | null;
  instrumental: boolean | null;
  bpm: number | null;
  key: string | null;
  duration: number | null;
};

type MetadataField =
  | "genres"
  | "moods"
  | "regions"
  | "instruments"
  | "builds"
  | "vocals";

type WeightedMetadataValue = {
  field: MetadataField;
  value: string;
  weight: number;
};

type SearchConcept = {
  id: string;
  triggers: string[];
  positive: WeightedMetadataValue[];
  negative?: WeightedMetadataValue[];
};

export type HybridSongSearchResult = HybridSearchSong & {
  semanticSimilarity: number;
  semanticScore: number;
  metadataScore: number;
  lexicalScore: number;
  negativePenalty: number;
  hybridScore: number;
  matchedConcepts: string[];
  matchedMetadata: string[];
  penaltyMetadata: string[];
};

const SEMANTIC_WEIGHT = 0.68;
const METADATA_WEIGHT = 0.24;
const LEXICAL_WEIGHT = 0.08;
const NEGATIVE_PENALTY_WEIGHT = 0.12;

const STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "audio",
  "before",
  "but",
  "documentary",
  "feels",
  "film",
  "for",
  "from",
  "happened",
  "little",
  "music",
  "nothing",
  "something",
  "that",
  "the",
  "then",
  "video",
  "when",
  "with",
  "yet",
]);

function weighted(
  field: MetadataField,
  values: Array<string | [string, number]>,
): WeightedMetadataValue[] {
  return values.map((value) =>
    typeof value === "string"
      ? { field, value, weight: 1 }
      : { field, value: value[0], weight: value[1] },
  );
}

const SEARCH_CONCEPTS: SearchConcept[] = [
  {
    id: "investigative",
    triggers: [
      "investigative",
      "investigation",
      "investigate",
      "detective",
      "sleuth",
      "sleuthy",
      "true crime",
      "procedural",
    ],
    positive: [
      ...weighted("moods", [
        "Mysterious",
        "Suspenseful",
        "Tense",
        ["Reflective", 0.35],
        ["Quirky", 0.25],
      ]),
      ...weighted("genres", [
        ["Score", 0.35],
        ["Background", 0.25],
      ]),
    ],
    negative: weighted("moods", [
      ["Epic", 0.45],
      ["Heroic", 0.7],
      ["Triumphant", 0.7],
      ["Feel Good", 0.65],
      ["Upbeat", 0.75],
    ]),
  },
  {
    id: "uneasy",
    triggers: [
      "uneasy",
      "unsettling",
      "suspicious",
      "something feels wrong",
      "feels wrong",
      "something is wrong",
      "feels off",
      "foreboding",
      "ominous",
      "nothing has happened",
      "hasn't happened",
      "has not happened",
    ],
    positive: weighted("moods", [
      "Tense",
      "Mysterious",
      "Suspenseful",
      ["Dark", 0.8],
      ["Burdened", 0.6],
      ["Reflective", 0.25],
    ]),
    negative: weighted("moods", [
      ["Feel Good", 0.8],
      ["Upbeat", 0.9],
      ["Playful", 0.75],
      ["Triumphant", 0.7],
      ["Heroic", 0.8],
      ["Inspirational", 0.45],
    ]),
  },
  {
    id: "restrained-tension",
    triggers: ["not horror", "without horror", "isn't horror", "is not horror"],
    positive: weighted("moods", [
      "Mysterious",
      "Suspenseful",
      "Tense",
      ["Quirky", 0.35],
      ["Reflective", 0.3],
    ]),
    negative: weighted("moods", [
      ["Aggressive", 0.9],
      ["Gritty", 0.7],
      ["Powerful", 0.65],
      ["Epic", 0.55],
      ["Heroic", 0.7],
    ]),
  },
  {
    id: "hopeful",
    triggers: ["hopeful", "hope", "optimistic", "uplifting"],
    positive: weighted("moods", [
      "Hopeful",
      ["Inspirational", 0.85],
      ["Empowering", 0.55],
      ["Emotional", 0.45],
      ["Reflective", 0.4],
    ]),
    negative: weighted("moods", [
      ["Aggressive", 0.65],
      ["Gritty", 0.45],
      ["Dark", 0.35],
    ]),
  },
  {
    id: "melancholy",
    triggers: [
      "melancholy",
      "melancholic",
      "bittersweet",
      "wistful",
      "sad",
      "sadness",
      "sorrow",
    ],
    positive: weighted("moods", [
      "Sorrowful",
      ["Reflective", 0.8],
      ["Burdened", 0.75],
      ["Nostalgic", 0.7],
      ["Emotional", 0.6],
      ["Loving", 0.35],
    ]),
    negative: weighted("moods", [
      ["Upbeat", 0.8],
      ["Feel Good", 0.7],
      ["Triumphant", 0.45],
    ]),
  },
  {
    id: "restrained",
    triggers: [
      "restrained",
      "subtle",
      "understated",
      "minimal",
      "minimalist",
      "quiet",
      "gentle",
      "soft",
      "delicate",
    ],
    positive: [
      ...weighted("moods", [
        "Soothing",
        "Chill",
        "Peaceful",
        ["Reflective", 0.7],
        ["Dreamy", 0.55],
      ]),
      ...weighted("genres", [
        ["Ambient", 0.75],
        ["Background", 0.45],
      ]),
      ...weighted("builds", [["Steady", 0.8]]),
    ],
    negative: [
      ...weighted("moods", [
        ["Epic", 0.75],
        ["Powerful", 0.8],
        ["Heroic", 0.85],
        ["Aggressive", 0.9],
        ["Triumphant", 0.8],
      ]),
      ...weighted("builds", [["Multiple Crescendo", 0.65]]),
    ],
  },
  {
    id: "sleek",
    triggers: [
      "sleek",
      "polished",
      "modern",
      "clean",
      "sophisticated",
      "contemporary",
    ],
    positive: [
      ...weighted("genres", [
        "Electronic",
        ["Ambient", 0.8],
        ["Background", 0.45],
      ]),
      ...weighted("instruments", [
        ["Synth", 0.9],
        ["Electronic", 0.9],
      ]),
      ...weighted("moods", [
        ["Chill", 0.65],
        ["Reflective", 0.45],
        ["Dreamy", 0.35],
      ]),
      ...weighted("builds", [["Steady", 0.5]]),
    ],
    negative: weighted("moods", [
      ["Quirky", 0.55],
      ["Aggressive", 0.65],
      ["Gritty", 0.55],
      ["Heroic", 0.45],
    ]),
  },
  {
    id: "architecture",
    triggers: [
      "architecture",
      "architectural",
      "real estate",
      "interior design",
      "interiors",
      "property film",
      "design film",
    ],
    positive: [
      ...weighted("genres", [
        "Ambient",
        ["Electronic", 0.9],
        ["Background", 0.75],
      ]),
      ...weighted("moods", [
        ["Chill", 0.8],
        ["Reflective", 0.65],
        ["Dreamy", 0.45],
        ["Soothing", 0.45],
      ]),
      ...weighted("builds", [["Steady", 0.8]]),
      ...weighted("instruments", [
        ["Synth", 0.65],
        ["Electronic", 0.75],
      ]),
    ],
    negative: [
      ...weighted("moods", [
        ["Epic", 0.75],
        ["Heroic", 0.85],
        ["Triumphant", 0.8],
        ["Aggressive", 0.8],
        ["Rebellious", 0.7],
        ["Quirky", 0.45],
      ]),
      ...weighted("builds", [["Multiple Crescendo", 0.6]]),
    ],
  },
  {
    id: "nostalgic",
    triggers: [
      "nostalgic",
      "nostalgia",
      "sentimental",
      "memory",
      "memories",
      "vintage",
    ],
    positive: weighted("moods", [
      "Nostalgic",
      ["Reflective", 0.75],
      ["Loving", 0.6],
      ["Sorrowful", 0.55],
      ["Emotional", 0.55],
      ["Dreamy", 0.45],
    ]),
  },
  {
    id: "emotional",
    triggers: ["emotional", "heartfelt", "human story", "human experience"],
    positive: weighted("moods", [
      "Emotional",
      ["Reflective", 0.7],
      ["Sorrowful", 0.55],
      ["Hopeful", 0.5],
      ["Loving", 0.4],
    ]),
  },
  {
    id: "building",
    triggers: [
      "build",
      "building",
      "crescendo",
      "rising",
      "rises",
      "growing",
      "grows",
    ],
    positive: weighted("builds", [
      "Ascending",
      ["Middle Crescendo", 0.9],
      ["Multiple Crescendo", 0.8],
    ]),
  },
  {
    id: "tense",
    triggers: ["tense", "tension", "suspense", "suspenseful"],
    positive: weighted("moods", [
      "Tense",
      "Suspenseful",
      ["Mysterious", 0.85],
      ["Dark", 0.55],
    ]),
    negative: weighted("moods", [
      ["Playful", 0.7],
      ["Feel Good", 0.7],
      ["Upbeat", 0.75],
    ]),
  },
];

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9#+\-\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getValues(song: HybridSearchSong, field: MetadataField) {
  return (song[field] ?? []).map(normalize).filter(Boolean);
}

function hasMetadataValue(
  song: HybridSearchSong,
  target: WeightedMetadataValue,
) {
  const normalizedTarget = normalize(target.value);
  return getValues(song, target.field).some(
    (value) => value === normalizedTarget || value.includes(normalizedTarget),
  );
}

function queryMatchesTrigger(query: string, trigger: string) {
  return query.includes(normalize(trigger));
}

function getActiveConcepts(query: string) {
  return SEARCH_CONCEPTS.filter((concept) =>
    concept.triggers.some((trigger) => queryMatchesTrigger(query, trigger)),
  );
}

function scoreConceptMetadata(
  song: HybridSearchSong,
  concepts: SearchConcept[],
) {
  if (concepts.length === 0) {
    return {
      metadataScore: 0,
      negativePenalty: 0,
      matchedMetadata: [] as string[],
      penaltyMetadata: [] as string[],
    };
  }

  let positiveEarned = 0;
  let positivePossible = 0;
  let negativeEarned = 0;
  let negativePossible = 0;
  const matchedMetadata = new Set<string>();
  const penaltyMetadata = new Set<string>();

  for (const concept of concepts) {
    for (const target of concept.positive) {
      positivePossible += target.weight;
      if (!hasMetadataValue(song, target)) continue;
      positiveEarned += target.weight;
      matchedMetadata.add(`${concept.id}:${target.field}:${target.value}`);
    }

    for (const target of concept.negative ?? []) {
      negativePossible += target.weight;
      if (!hasMetadataValue(song, target)) continue;
      negativeEarned += target.weight;
      penaltyMetadata.add(`${concept.id}:${target.field}:${target.value}`);
    }
  }

  return {
    metadataScore:
      positivePossible > 0 ? positiveEarned / positivePossible : 0,
    negativePenalty:
      negativePossible > 0 ? negativeEarned / negativePossible : 0,
    matchedMetadata: [...matchedMetadata],
    penaltyMetadata: [...penaltyMetadata],
  };
}

function getLexicalTokens(query: string) {
  return [...new Set(query.split(/\s+/))].filter(
    (token) => token.length >= 4 && !STOP_WORDS.has(token),
  );
}

function getSongLexicalText(song: HybridSearchSong) {
  return normalize(
    [
      song.title,
      song.artist,
      ...(song.genres ?? []),
      ...(song.moods ?? []),
      ...(song.regions ?? []),
      ...(song.instruments ?? []),
      ...(song.builds ?? []),
      ...(song.vocals ?? []),
      song.key,
      song.bpm,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

function scoreLexicalMatch(song: HybridSearchSong, query: string) {
  const tokens = getLexicalTokens(query);
  if (tokens.length === 0) return 0;

  const text = getSongLexicalText(song);
  const matched = tokens.filter((token) => text.includes(token)).length;
  return matched / tokens.length;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function rankHybridSongSearchResults(
  query: string,
  matches: SemanticSongSearchMatch[],
  songs: HybridSearchSong[],
) {
  const normalizedQuery = normalize(query);
  const activeConcepts = getActiveConcepts(normalizedQuery);
  const songsById = new Map(songs.map((song) => [song.id, song]));

  const results = matches.flatMap((match) => {
    const song = songsById.get(match.songId);
    if (!song) return [];

    const semanticScore = clamp01(match.similarity);
    const {
      metadataScore,
      negativePenalty,
      matchedMetadata,
      penaltyMetadata,
    } = scoreConceptMetadata(song, activeConcepts);
    const lexicalScore = scoreLexicalMatch(song, normalizedQuery);
    const hybridScore =
      semanticScore * SEMANTIC_WEIGHT +
      metadataScore * METADATA_WEIGHT +
      lexicalScore * LEXICAL_WEIGHT -
      negativePenalty * NEGATIVE_PENALTY_WEIGHT;

    return [
      {
        ...song,
        semanticSimilarity: match.similarity,
        semanticScore,
        metadataScore,
        lexicalScore,
        negativePenalty,
        hybridScore,
        matchedConcepts: activeConcepts.map((concept) => concept.id),
        matchedMetadata,
        penaltyMetadata,
      },
    ];
  });

  return results.sort((a, b) => {
    const hybridDifference = b.hybridScore - a.hybridScore;
    if (hybridDifference !== 0) return hybridDifference;

    return b.semanticSimilarity - a.semanticSimilarity;
  });
}
