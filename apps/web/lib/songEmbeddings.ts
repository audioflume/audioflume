import { supabaseServer } from "@/lib/supabaseServer";

export const SONG_SEARCH_EMBEDDING_MODEL = "text-embedding-3-large";
export const SONG_SEARCH_EMBEDDING_DIMENSIONS = 1536;

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_MATCH_COUNT = 100;
const DEFAULT_MIN_SIMILARITY = 0.3;
const MAX_EMBEDDING_REFRESH_BATCH = 100;
const MAX_EMBEDDING_BACKFILL_BATCHES = 20;

type OpenAIEmbeddingItem = {
  embedding?: number[];
  index?: number;
};

type OpenAIEmbeddingResponse = {
  data?: OpenAIEmbeddingItem[];
  error?: {
    message?: string;
  };
};

type SongEmbeddingCandidate = {
  song_id?: string | null;
  search_text?: string | null;
};

type SongEmbeddingMatchRow = {
  song_id?: string | null;
  similarity?: number | string | null;
};

type SongEmbeddingStatsRow = {
  published_songs?: number | string | null;
  embedded_songs?: number | string | null;
  pending_songs?: number | string | null;
};

export type SemanticSongSearchMatch = {
  songId: string;
  similarity: number;
};

export type SongSearchEmbeddingStats = {
  publishedSongs: number;
  embeddedSongs: number;
  pendingSongs: number;
};

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function getOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return apiKey;
}

function normalizeCandidate(candidate: SongEmbeddingCandidate) {
  const songId = String(candidate.song_id || "").trim();
  const searchText = String(candidate.search_text || "").trim();

  if (!songId || !searchText) return null;
  return { songId, searchText };
}

async function createEmbeddings(inputs: string[]) {
  if (inputs.length === 0) return [];

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SONG_SEARCH_EMBEDDING_MODEL,
      input: inputs,
      dimensions: SONG_SEARCH_EMBEDDING_DIMENSIONS,
      encoding_format: "float",
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | OpenAIEmbeddingResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        `OpenAI embeddings request failed with status ${response.status}`,
    );
  }

  const items = Array.isArray(payload?.data) ? [...payload.data] : [];
  items.sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));

  if (items.length !== inputs.length) {
    throw new Error("OpenAI returned an unexpected number of embeddings");
  }

  return items.map((item) => {
    if (
      !Array.isArray(item.embedding) ||
      item.embedding.length !== SONG_SEARCH_EMBEDDING_DIMENSIONS
    ) {
      throw new Error("OpenAI returned an embedding with unexpected dimensions");
    }

    return item.embedding;
  });
}

async function upsertSongSearchEmbeddings(
  candidates: Array<{ songId: string; searchText: string }>,
) {
  if (candidates.length === 0) return 0;

  const embeddings = await createEmbeddings(
    candidates.map((candidate) => candidate.searchText),
  );

  await Promise.all(
    candidates.map(async (candidate, index) => {
      const { error } = await supabaseServer.rpc(
        "upsert_song_search_embedding",
        {
          p_song_id: candidate.songId,
          p_embedding: embeddings[index],
          p_model: SONG_SEARCH_EMBEDDING_MODEL,
          p_dimensions: SONG_SEARCH_EMBEDDING_DIMENSIONS,
          p_search_text: candidate.searchText,
        },
      );

      if (error) throw error;
    }),
  );

  return candidates.length;
}

export async function ensurePublishedSongSearchEmbeddings(
  limit = MAX_EMBEDDING_REFRESH_BATCH,
) {
  const safeLimit = clampInteger(limit, 1, MAX_EMBEDDING_REFRESH_BATCH);
  const { data, error } = await supabaseServer.rpc(
    "list_song_search_embedding_candidates",
    { p_limit: safeLimit },
  );

  if (error) throw error;

  const candidates = ((data ?? []) as SongEmbeddingCandidate[]).flatMap(
    (candidate) => {
      const normalized = normalizeCandidate(candidate);
      return normalized ? [normalized] : [];
    },
  );

  return upsertSongSearchEmbeddings(candidates);
}

export async function backfillPublishedSongSearchEmbeddings(
  options: {
    batchSize?: number;
    maxBatches?: number;
  } = {},
) {
  const batchSize = clampInteger(
    options.batchSize ?? MAX_EMBEDDING_REFRESH_BATCH,
    1,
    MAX_EMBEDDING_REFRESH_BATCH,
  );
  const maxBatches = clampInteger(
    options.maxBatches ?? MAX_EMBEDDING_BACKFILL_BATCHES,
    1,
    MAX_EMBEDDING_BACKFILL_BATCHES,
  );

  let updated = 0;
  let batches = 0;

  while (batches < maxBatches) {
    const batchUpdated = await ensurePublishedSongSearchEmbeddings(batchSize);
    batches += 1;
    updated += batchUpdated;

    if (batchUpdated < batchSize) break;
  }

  return { updated, batches };
}

export async function refreshPublishedSongSearchEmbedding(songId: string) {
  const cleanSongId = songId.trim();
  if (!cleanSongId) return false;

  const { data, error } = await supabaseServer.rpc(
    "get_song_search_embedding_candidate",
    { p_song_id: cleanSongId },
  );

  if (error) throw error;

  const candidate = ((data ?? []) as SongEmbeddingCandidate[])
    .map(normalizeCandidate)
    .find((value) => value !== null);

  if (!candidate) return false;

  await upsertSongSearchEmbeddings([candidate]);
  return true;
}

export async function getSongSearchEmbeddingStats(): Promise<SongSearchEmbeddingStats> {
  const { data, error } = await supabaseServer.rpc(
    "get_song_search_embedding_stats",
  );

  if (error) throw error;

  const row = ((data ?? []) as SongEmbeddingStatsRow[])[0];

  return {
    publishedSongs: Number(row?.published_songs ?? 0),
    embeddedSongs: Number(row?.embedded_songs ?? 0),
    pendingSongs: Number(row?.pending_songs ?? 0),
  };
}

export async function searchPublishedSongsSemantically(
  query: string,
  options: {
    matchCount?: number;
    minSimilarity?: number;
  } = {},
): Promise<SemanticSongSearchMatch[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const [queryEmbedding] = await createEmbeddings([
    `Music search query for film and video licensing.\nQuery: ${cleanQuery}`,
  ]);

  const matchCount = clampInteger(
    options.matchCount ?? DEFAULT_MATCH_COUNT,
    1,
    200,
  );
  const minSimilarity = Number.isFinite(options.minSimilarity)
    ? Math.min(1, Math.max(-1, Number(options.minSimilarity)))
    : DEFAULT_MIN_SIMILARITY;

  const { data, error } = await supabaseServer.rpc(
    "match_song_search_embeddings",
    {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      min_similarity: minSimilarity,
    },
  );

  if (error) throw error;

  return ((data ?? []) as SongEmbeddingMatchRow[]).flatMap((row) => {
    const songId = String(row.song_id || "").trim();
    const similarity = Number(row.similarity);

    if (!songId || !Number.isFinite(similarity)) return [];
    return [{ songId, similarity }];
  });
}
