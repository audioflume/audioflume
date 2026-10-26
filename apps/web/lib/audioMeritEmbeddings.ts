import { supabaseServer } from "@/lib/supabaseServer";

export const SONG_MERIT_MODEL_ID = "m-a-p/MERT-v1-330M";
export const SONG_MERIT_MODEL_KEY =
  "amaai-lab/merit:mert-v1-330m:3x10s:v1";
export const SONG_MERIT_EMBEDDING_DIMENSIONS = 128;

const MAX_BACKFILL_BATCH = 1;
const CACHE_TTL_MS = 60 * 60 * 1000;

type MeritCandidateRow = {
  song_id?: string | null;
  source_url?: string | null;
};

type MeritEmbeddingRow = {
  song_id?: string | null;
  melody_embedding?: unknown;
  rhythm_embedding?: unknown;
  timbre_embedding?: unknown;
};

type MeritStatsRow = {
  published_songs?: number | string | null;
  embedded_songs?: number | string | null;
  pending_songs?: number | string | null;
};

export type MeritEmbeddings = {
  melody: number[];
  rhythm: number[];
  timbre: number[];
};

export type MeritEmbeddingMatch = MeritEmbeddings & {
  songId: string;
};

export type MeritEmbeddingStats = {
  publishedSongs: number;
  embeddedSongs: number;
  pendingSongs: number;
};

const embeddingCache = new Map<
  string,
  {
    expiresAt: number;
    embeddings: MeritEmbeddings;
  }
>();

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function parseVector(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isFinite);
  }

  if (typeof value === "string") {
    const clean = value.trim();

    if (!clean.startsWith("[") || !clean.endsWith("]")) return [];

    return clean
      .slice(1, -1)
      .split(",")
      .map((item) => Number(item.trim()))
      .filter(Number.isFinite);
  }

  return [];
}

function isValidEmbedding(value: number[]) {
  return (
    value.length === SONG_MERIT_EMBEDDING_DIMENSIONS &&
    value.every(Number.isFinite)
  );
}

function getAnalyzerConfig() {
  const url = process.env.AUDIO_ANALYZER_URL?.trim() ?? "";
  const secret = process.env.AUDIO_ANALYZER_SECRET?.trim() ?? "";

  if (!url || !secret) return null;

  return {
    url: url.replace(/\/$/, ""),
    secret,
  };
}

export function isMeritAnalyzerConfigured() {
  return Boolean(getAnalyzerConfig());
}

export async function createMeritAudioEmbeddings(
  sourceUrl: string,
): Promise<MeritEmbeddings> {
  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl) throw new Error("Audio URL is required");

  const cached = embeddingCache.get(cleanUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.embeddings;
  }

  const analyzer = getAnalyzerConfig();

  if (!analyzer) {
    throw new Error(
      "MERIT analyzer is not configured. Set AUDIO_ANALYZER_URL and AUDIO_ANALYZER_SECRET.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);

  try {
    const response = await fetch(`${analyzer.url}/merit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-analyzer-secret": analyzer.secret,
      },
      body: JSON.stringify({
        audioUrl: cleanUrl,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as
      | {
          detail?: string;
          melody?: unknown;
          rhythm?: unknown;
          timbre?: unknown;
        }
      | null;

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          `MERIT analyzer request failed with ${response.status}`,
      );
    }

    const melody = parseVector(data?.melody);
    const rhythm = parseVector(data?.rhythm);
    const timbre = parseVector(data?.timbre);

    if (
      !isValidEmbedding(melody) ||
      !isValidEmbedding(rhythm) ||
      !isValidEmbedding(timbre)
    ) {
      throw new Error("MERIT analyzer returned invalid embeddings");
    }

    const embeddings = { melody, rhythm, timbre };

    embeddingCache.set(cleanUrl, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      embeddings,
    });

    return embeddings;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeCandidate(row: MeritCandidateRow) {
  const songId = String(row.song_id || "").trim();
  const sourceUrl = String(row.source_url || "").trim();

  if (!songId || !sourceUrl) return null;
  return { songId, sourceUrl };
}

async function upsertMeritCandidate(candidate: {
  songId: string;
  sourceUrl: string;
}) {
  const embeddings = await createMeritAudioEmbeddings(candidate.sourceUrl);

  const { error } = await supabaseServer.rpc(
    "upsert_song_merit_embeddings",
    {
      p_song_id: candidate.songId,
      p_melody_embedding: embeddings.melody,
      p_rhythm_embedding: embeddings.rhythm,
      p_timbre_embedding: embeddings.timbre,
      p_model: SONG_MERIT_MODEL_KEY,
      p_dimensions: SONG_MERIT_EMBEDDING_DIMENSIONS,
      p_source_url: candidate.sourceUrl,
    },
  );

  if (error) throw error;
}

export async function ensurePublishedSongMeritEmbeddings(limit = 1) {
  const safeLimit = clampInteger(limit, 1, MAX_BACKFILL_BATCH);
  const { data, error } = await supabaseServer.rpc(
    "list_song_merit_embedding_candidates",
    {
      p_limit: safeLimit,
      p_model: SONG_MERIT_MODEL_KEY,
      p_dimensions: SONG_MERIT_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const candidates = ((data ?? []) as MeritCandidateRow[]).flatMap(
    (row) => {
      const normalized = normalizeCandidate(row);
      return normalized ? [normalized] : [];
    },
  );

  for (const candidate of candidates) {
    await upsertMeritCandidate(candidate);
  }

  return candidates.length;
}

export async function refreshPublishedSongMeritEmbedding(songId: string) {
  const cleanSongId = songId.trim();
  if (!cleanSongId) return false;

  const { data, error } = await supabaseServer.rpc(
    "get_song_merit_embedding_candidate",
    {
      p_song_id: cleanSongId,
    },
  );

  if (error) throw error;

  const candidate = ((data ?? []) as MeritCandidateRow[])
    .map(normalizeCandidate)
    .find((value) => value !== null);

  if (!candidate) return false;

  await upsertMeritCandidate(candidate);
  return true;
}

export async function getSongMeritEmbeddingStats():
  Promise<MeritEmbeddingStats> {
  const { data, error } = await supabaseServer.rpc(
    "get_song_merit_embedding_stats",
    {
      p_model: SONG_MERIT_MODEL_KEY,
      p_dimensions: SONG_MERIT_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const row = ((data ?? []) as MeritStatsRow[])[0];

  return {
    publishedSongs: Number(row?.published_songs ?? 0),
    embeddedSongs: Number(row?.embedded_songs ?? 0),
    pendingSongs: Number(row?.pending_songs ?? 0),
  };
}

export async function getPublishedSongMeritEmbeddings(
  songIds: string[],
): Promise<MeritEmbeddingMatch[]> {
  const cleanSongIds = [
    ...new Set(songIds.map((songId) => songId.trim()).filter(Boolean)),
  ];

  if (cleanSongIds.length === 0) return [];

  const { data, error } = await supabaseServer.rpc(
    "get_song_merit_embeddings_by_ids",
    {
      p_song_ids: cleanSongIds,
      p_model: SONG_MERIT_MODEL_KEY,
      p_dimensions: SONG_MERIT_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  return ((data ?? []) as MeritEmbeddingRow[]).flatMap((row) => {
    const songId = String(row.song_id || "").trim();
    const melody = parseVector(row.melody_embedding);
    const rhythm = parseVector(row.rhythm_embedding);
    const timbre = parseVector(row.timbre_embedding);

    if (
      !songId ||
      !isValidEmbedding(melody) ||
      !isValidEmbedding(rhythm) ||
      !isValidEmbedding(timbre)
    ) {
      return [];
    }

    return [{ songId, melody, rhythm, timbre }];
  });
}

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;

  let dot = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;

  for (let index = 0; index < length; index++) {
    dot += left[index] * right[index];
    leftEnergy += left[index] * left[index];
    rightEnergy += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftEnergy * rightEnergy);
  if (denominator <= 0) return 0;

  return Math.max(-1, Math.min(1, dot / denominator));
}

export function compareMeritEmbeddings(
  reference: MeritEmbeddings,
  candidate: MeritEmbeddings,
) {
  return {
    melody:
      (cosineSimilarity(reference.melody, candidate.melody) + 1) / 2,
    rhythm:
      (cosineSimilarity(reference.rhythm, candidate.rhythm) + 1) / 2,
    timbre:
      (cosineSimilarity(reference.timbre, candidate.timbre) + 1) / 2,
  };
}
