import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { supabaseServer } from "@/lib/supabaseServer";

export const SONG_CLAP_MODEL_ID = "Xenova/larger_clap_music_and_speech";
export const SONG_CLAP_MODEL_KEY =
  "Xenova/larger_clap_music_and_speech:q8:3x10s:segments-v3";
export const SONG_CLAP_CONCEPT_VERSION = "clap-concepts-v2";
export const SONG_CLAP_EMBEDDING_DIMENSIONS = 512;

const FFMPEG_EXECUTABLE_NAME =
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
const SAMPLE_RATE = 48000;
const ANALYSIS_SECONDS = 30;
const WINDOW_SECONDS = 10;
const WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_SECONDS;
const MAX_PCM_BYTES = SAMPLE_RATE * ANALYSIS_SECONDS * 4 + 1024 * 256;
const CACHE_TTL_MS = 60 * 60 * 1000;
const DEFAULT_MATCH_COUNT = 200;
const DEFAULT_MIN_SIMILARITY = -1;
const MAX_BACKFILL_BATCH = 2;

type AudioEmbeddingCandidateRow = {
  song_id?: string | null;
  source_url?: string | null;
};

type AudioEmbeddingMatchRow = {
  song_id?: string | null;
  similarity?: number | string | null;
  segment_embeddings?: unknown;
  concept_profile?: unknown;
};

type AudioEmbeddingStatsRow = {
  published_songs?: number | string | null;
  embedded_songs?: number | string | null;
  pending_songs?: number | string | null;
};

type ProcessorInput = Record<string, unknown>;

type ClapProcessor = (audio: Float32Array) => Promise<ProcessorInput>;

type ClapModelOutput = {
  audio_embeds?: {
    data?: Float32Array | number[];
    dims?: number[];
  };
};

type ClapModel = (inputs: ProcessorInput) => Promise<ClapModelOutput>;

type ClapTokenizer = (
  texts: string[],
  options: {
    padding: boolean;
    truncation: boolean;
  },
) => Promise<ProcessorInput>;

type ClapTextModelOutput = {
  text_embeds?: {
    data?: Float32Array | number[];
    dims?: number[];
  };
};

type ClapTextModel = (
  inputs: ProcessorInput,
) => Promise<ClapTextModelOutput>;

type ConceptAnchorPair = {
  positive: number[];
  negative: number[];
};

type ConceptAnchors = Record<
  keyof ClapConceptProfile,
  ConceptAnchorPair
>;

const CONCEPT_ANCHOR_TEXT: Record<
  keyof ClapConceptProfile,
  { positive: string; negative: string }
> = {
  stringsElectronic: {
    positive: "music led by cello and bowed strings",
    negative: "music led by electronic synths and electronic bass",
  },
  acousticSynthetic: {
    positive: "natural acoustic instrumental music",
    negative: "synthetic electronic production",
  },
  stringsBrassPercussion: {
    positive: "intimate cello and string ensemble",
    negative: "brass and heavy cinematic percussion",
  },
  instrumentalVocal: {
    positive: "instrumental music with no vocals",
    negative: "music with prominent lead vocals",
  },
  scoreSong: {
    positive: "cinematic underscore and film score",
    negative: "conventional pop or hip hop song",
  },
  intimateEpic: {
    positive: "intimate reflective emotional music",
    negative: "epic heroic dramatic trailer music",
  },
  freeflowBeat: {
    positive: "free flowing music with little or no percussion",
    negative: "beat driven music with prominent drums and groove",
  },
  sparseDense: {
    positive: "sparse minimal arrangement with lots of space",
    negative: "dense layered full arrangement",
  },
  lowHighEnergy: {
    positive: "restrained low energy gentle music",
    negative: "high energy powerful aggressive music",
  },
};

export type ClapConceptProfile = {
  stringsElectronic: number;
  acousticSynthetic: number;
  stringsBrassPercussion: number;
  instrumentalVocal: number;
  scoreSong: number;
  intimateEpic: number;
  freeflowBeat: number;
  sparseDense: number;
  lowHighEnergy: number;
};

export type ClapConceptSimilarity = {
  instrumentation: number;
  character: number;
  rhythm: number;
  energyDensity: number;
};

export type ClapSimilarityMatch = {
  songId: string;
  similarity: number;
  bestSegmentSimilarity: number;
  averageBestSegmentSimilarity: number;
  consistentSegmentSimilarity: number;
  conceptProfile: ClapConceptProfile;
};

export type ClapEmbeddingStats = {
  publishedSongs: number;
  embeddedSongs: number;
  pendingSongs: number;
};

const embeddingCache = new Map<
  string,
  {
    expiresAt: number;
    embedding: number[];
    segmentEmbeddings: number[][];
    conceptProfile: ClapConceptProfile;
  }
>();

let conceptAnchorsCache: ConceptAnchors | null = null;

let resolvedFfmpegPath: string | null = null;
let clapRuntimePromise:
  | Promise<{
      processor: ClapProcessor;
      model: ClapModel;
    }>
  | null = null;

let clapTextRuntimePromise:
  | Promise<{
      tokenizer: ClapTokenizer;
      model: ClapTextModel;
    }>
  | null = null;

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveFfmpegPath() {
  if (resolvedFfmpegPath) return resolvedFfmpegPath;

  const candidates = [
    process.env.FFMPEG_PATH,
    ffmpegPath || undefined,
    path.join(
      process.cwd(),
      "node_modules",
      "ffmpeg-static",
      FFMPEG_EXECUTABLE_NAME,
    ),
    path.join(
      process.cwd(),
      "..",
      "..",
      "node_modules",
      "ffmpeg-static",
      FFMPEG_EXECUTABLE_NAME,
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of [...new Set(candidates)]) {
    if (await fileExists(candidate)) {
      resolvedFfmpegPath = candidate;
      return resolvedFfmpegPath;
    }
  }

  resolvedFfmpegPath = "ffmpeg";
  return resolvedFfmpegPath;
}

async function decodeAudioToFloat32(sourceUrl: string) {
  const ffmpegCommand = await resolveFfmpegPath();

  return await new Promise<Float32Array>((resolve, reject) => {
    const child = spawn(
      ffmpegCommand,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        sourceUrl,
        "-t",
        String(ANALYSIS_SECONDS),
        "-vn",
        "-ac",
        "1",
        "-ar",
        String(SAMPLE_RATE),
        "-f",
        "f32le",
        "pipe:1",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    let byteLength = 0;
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGKILL");
      reject(new Error("CLAP audio decode timed out"));
    }, 30_000);

    child.stdout.on("data", (chunk: Buffer) => {
      byteLength += chunk.length;

      if (byteLength > MAX_PCM_BYTES) {
        child.kill("SIGKILL");
        return;
      }

      chunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      errors.push(chunk);
    });

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      if (byteLength > MAX_PCM_BYTES) {
        reject(new Error("Decoded audio exceeded the CLAP analysis limit"));
        return;
      }

      if (code !== 0 || chunks.length === 0) {
        reject(
          new Error(
            Buffer.concat(errors).toString("utf8").trim() ||
              `FFmpeg exited with code ${code}`,
          ),
        );
        return;
      }

      const pcm = Buffer.concat(chunks);
      const sampleCount = Math.floor(pcm.length / 4);
      const samples = new Float32Array(sampleCount);

      for (let index = 0; index < sampleCount; index++) {
        samples[index] = pcm.readFloatLE(index * 4);
      }

      resolve(samples);
    });
  });
}

function normalizeVector(values: number[]) {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0),
  );

  if (magnitude <= 0) {
    throw new Error("CLAP returned a zero-length embedding");
  }

  return values.map((value) => value / magnitude);
}

function getAnalysisWindows(samples: Float32Array) {
  if (samples.length <= WINDOW_SAMPLES) return [samples];

  const finalStart = samples.length - WINDOW_SAMPLES;
  const starts = [
    0,
    Math.floor(finalStart / 2),
    finalStart,
  ].filter((start, index, all) => all.indexOf(start) === index);

  return starts.map((start) =>
    samples.slice(start, start + WINDOW_SAMPLES),
  );
}

async function getClapRuntime() {
  if (clapRuntimePromise) return clapRuntimePromise;

  clapRuntimePromise = (async () => {
    const {
      AutoProcessor,
      ClapAudioModelWithProjection,
      env,
    } = await import("@huggingface/transformers");

    env.allowRemoteModels = true;
    env.cacheDir = path.join(tmpdir(), "audioflume-transformers-cache");

    const [processor, model] = await Promise.all([
      AutoProcessor.from_pretrained(SONG_CLAP_MODEL_ID),
      ClapAudioModelWithProjection.from_pretrained(SONG_CLAP_MODEL_ID, {
        dtype: "q8",
      }),
    ]);

    return {
      processor: processor as unknown as ClapProcessor,
      model: model as unknown as ClapModel,
    };
  })();

  return clapRuntimePromise;
}

function dotProduct(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let total = 0;

  for (let index = 0; index < length; index++) {
    total += (left[index] ?? 0) * (right[index] ?? 0);
  }

  return total;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function conceptAxisScore(
  embedding: number[],
  anchors: ConceptAnchorPair,
) {
  const positive = dotProduct(embedding, anchors.positive);
  const negative = dotProduct(embedding, anchors.negative);
  return clamp01(0.5 + 0.5 * Math.tanh((positive - negative) * 5));
}

function createConceptProfile(
  embedding: number[],
  anchors: ConceptAnchors,
): ClapConceptProfile {
  return {
    stringsElectronic: conceptAxisScore(
      embedding,
      anchors.stringsElectronic,
    ),
    acousticSynthetic: conceptAxisScore(
      embedding,
      anchors.acousticSynthetic,
    ),
    stringsBrassPercussion: conceptAxisScore(
      embedding,
      anchors.stringsBrassPercussion,
    ),
    instrumentalVocal: conceptAxisScore(
      embedding,
      anchors.instrumentalVocal,
    ),
    scoreSong: conceptAxisScore(
      embedding,
      anchors.scoreSong,
    ),
    intimateEpic: conceptAxisScore(
      embedding,
      anchors.intimateEpic,
    ),
    freeflowBeat: conceptAxisScore(
      embedding,
      anchors.freeflowBeat,
    ),
    sparseDense: conceptAxisScore(
      embedding,
      anchors.sparseDense,
    ),
    lowHighEnergy: conceptAxisScore(
      embedding,
      anchors.lowHighEnergy,
    ),
  };
}

function isConceptProfile(value: unknown): value is ClapConceptProfile {
  if (!value || typeof value !== "object") return false;

  const profile = value as Record<string, unknown>;
  return Object.keys(CONCEPT_ANCHOR_TEXT).every((key) =>
    Number.isFinite(Number(profile[key])),
  );
}

function isSegmentEmbeddings(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (embedding) =>
        Array.isArray(embedding) &&
        embedding.length === SONG_CLAP_EMBEDDING_DIMENSIONS &&
        embedding.every((item) => Number.isFinite(Number(item))),
    )
  );
}

function isConceptAnchors(value: unknown): value is ConceptAnchors {
  if (!value || typeof value !== "object") return false;

  const anchors = value as Record<string, unknown>;

  return Object.keys(CONCEPT_ANCHOR_TEXT).every((key) => {
    const pair = anchors[key];
    if (!pair || typeof pair !== "object") return false;

    const candidate = pair as Record<string, unknown>;
    return (
      Array.isArray(candidate.positive) &&
      candidate.positive.length === SONG_CLAP_EMBEDDING_DIMENSIONS &&
      Array.isArray(candidate.negative) &&
      candidate.negative.length === SONG_CLAP_EMBEDDING_DIMENSIONS
    );
  });
}

async function getClapTextRuntime() {
  if (clapTextRuntimePromise) return clapTextRuntimePromise;

  clapTextRuntimePromise = (async () => {
    const {
      AutoTokenizer,
      ClapTextModelWithProjection,
      env,
    } = await import("@huggingface/transformers");

    env.allowRemoteModels = true;
    env.cacheDir = path.join(tmpdir(), "audioflume-transformers-cache");

    const [tokenizer, model] = await Promise.all([
      AutoTokenizer.from_pretrained(SONG_CLAP_MODEL_ID),
      ClapTextModelWithProjection.from_pretrained(SONG_CLAP_MODEL_ID, {
        dtype: "q8",
      }),
    ]);

    return {
      tokenizer: tokenizer as unknown as ClapTokenizer,
      model: model as unknown as ClapTextModel,
    };
  })();

  return clapTextRuntimePromise;
}

async function createAndStoreConceptAnchors() {
  const runtime = await getClapTextRuntime();
  const entries = Object.entries(CONCEPT_ANCHOR_TEXT) as Array<
    [
      keyof ClapConceptProfile,
      { positive: string; negative: string },
    ]
  >;
  const texts = entries.flatMap(([, pair]) => [
    pair.positive,
    pair.negative,
  ]);
  const inputs = await runtime.tokenizer(texts, {
    padding: true,
    truncation: true,
  });
  const output = await runtime.model(inputs);
  const raw = output.text_embeds?.data;

  if (!raw) {
    throw new Error("CLAP returned no text concept embeddings");
  }

  const flattened = Array.from(raw, Number);
  const expected =
    texts.length * SONG_CLAP_EMBEDDING_DIMENSIONS;

  if (flattened.length !== expected) {
    throw new Error(
      `CLAP returned ${flattened.length} concept values instead of ${expected}`,
    );
  }

  const anchors = {} as ConceptAnchors;

  entries.forEach(([key], entryIndex) => {
    const offset = entryIndex * 2 * SONG_CLAP_EMBEDDING_DIMENSIONS;
    anchors[key] = {
      positive: normalizeVector(
        flattened.slice(
          offset,
          offset + SONG_CLAP_EMBEDDING_DIMENSIONS,
        ),
      ),
      negative: normalizeVector(
        flattened.slice(
          offset + SONG_CLAP_EMBEDDING_DIMENSIONS,
          offset + SONG_CLAP_EMBEDDING_DIMENSIONS * 2,
        ),
      ),
    };
  });

  const { error } = await supabaseServer.rpc(
    "upsert_song_clap_concept_anchors",
    {
      p_version: SONG_CLAP_CONCEPT_VERSION,
      p_anchors: anchors,
    },
  );

  if (error) throw error;

  conceptAnchorsCache = anchors;
  return anchors;
}

async function getConceptAnchors() {
  if (conceptAnchorsCache) return conceptAnchorsCache;

  const { data, error } = await supabaseServer.rpc(
    "get_song_clap_concept_anchors",
    {
      p_version: SONG_CLAP_CONCEPT_VERSION,
    },
  );

  if (error) throw error;

  const stored = Array.isArray(data)
    ? (data[0] as { anchors?: unknown } | undefined)?.anchors
    : null;

  if (isConceptAnchors(stored)) {
    conceptAnchorsCache = stored;
    return stored;
  }

  return createAndStoreConceptAnchors();
}

function getSegmentSimilarityMetrics(
  referenceSegments: number[][],
  candidateSegments: number[][],
) {
  const bestPerReference = referenceSegments.map((reference) => {
    let best = -1;

    for (const candidate of candidateSegments) {
      best = Math.max(best, dotProduct(reference, candidate));
    }

    return best;
  });

  const bestSegmentSimilarity = Math.max(...bestPerReference);
  const averageBestSegmentSimilarity =
    bestPerReference.reduce((sum, value) => sum + value, 0) /
    bestPerReference.length;
  const weakestBestSegmentSimilarity = Math.min(...bestPerReference);

  const consistentSegmentSimilarity =
    averageBestSegmentSimilarity * 0.7 +
    weakestBestSegmentSimilarity * 0.3;

  return {
    bestSegmentSimilarity,
    averageBestSegmentSimilarity,
    consistentSegmentSimilarity,
  };
}

function profileCloseness(left: number, right: number) {
  return clamp01(1 - Math.abs(left - right));
}

export function compareClapConceptProfiles(
  reference: ClapConceptProfile,
  candidate: ClapConceptProfile,
): ClapConceptSimilarity {
  const instrumentation =
    profileCloseness(
      reference.stringsElectronic,
      candidate.stringsElectronic,
    ) *
      0.45 +
    profileCloseness(
      reference.acousticSynthetic,
      candidate.acousticSynthetic,
    ) *
      0.25 +
    profileCloseness(
      reference.stringsBrassPercussion,
      candidate.stringsBrassPercussion,
    ) *
      0.3;

  const character =
    profileCloseness(
      reference.instrumentalVocal,
      candidate.instrumentalVocal,
    ) *
      0.35 +
    profileCloseness(reference.scoreSong, candidate.scoreSong) * 0.4 +
    profileCloseness(
      reference.intimateEpic,
      candidate.intimateEpic,
    ) *
      0.25;

  const rhythm = profileCloseness(
    reference.freeflowBeat,
    candidate.freeflowBeat,
  );

  const energyDensity =
    profileCloseness(reference.sparseDense, candidate.sparseDense) *
      0.5 +
    profileCloseness(
      reference.lowHighEnergy,
      candidate.lowHighEnergy,
    ) *
      0.5;

  return {
    instrumentation,
    character,
    rhythm,
    energyDensity,
  };
}

async function embedWindow(
  window: Float32Array,
  runtime: {
    processor: ClapProcessor;
    model: ClapModel;
  },
) {
  const inputs = await runtime.processor(window);
  const output = await runtime.model(inputs);
  const raw = output.audio_embeds?.data;

  if (!raw) {
    throw new Error("CLAP returned no audio embedding");
  }

  const embedding = Array.from(raw, Number);

  if (embedding.length !== SONG_CLAP_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `CLAP returned ${embedding.length} dimensions instead of ${SONG_CLAP_EMBEDDING_DIMENSIONS}`,
    );
  }

  return normalizeVector(embedding);
}

export async function createClapAudioAnalysis(sourceUrl: string) {
  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl) throw new Error("Audio URL is required");

  const cached = embeddingCache.get(cleanUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      embedding: cached.embedding,
      segmentEmbeddings: cached.segmentEmbeddings,
      conceptProfile: cached.conceptProfile,
    };
  }

  const samples = await decodeAudioToFloat32(cleanUrl);
  if (samples.length === 0) {
    throw new Error("Decoded audio was empty");
  }

  const runtime = await getClapRuntime();
  const windows = getAnalysisWindows(samples);
  const embeddings: number[][] = [];

  for (const window of windows) {
    embeddings.push(await embedWindow(window, runtime));
  }

  const averaged = Array.from(
    { length: SONG_CLAP_EMBEDDING_DIMENSIONS },
    (_, index) =>
      embeddings.reduce(
        (sum, embedding) => sum + (embedding[index] ?? 0),
        0,
      ) / embeddings.length,
  );
  const segmentEmbeddings = embeddings;
  const embedding = normalizeVector(averaged);
  const anchors = await getConceptAnchors();
  const conceptProfile = createConceptProfile(embedding, anchors);

  embeddingCache.set(cleanUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    embedding,
    segmentEmbeddings,
    conceptProfile,
  });

  return { embedding, segmentEmbeddings, conceptProfile };
}

export async function createClapAudioEmbedding(sourceUrl: string) {
  const { embedding } = await createClapAudioAnalysis(sourceUrl);
  return embedding;
}

function normalizeCandidate(row: AudioEmbeddingCandidateRow) {
  const songId = String(row.song_id || "").trim();
  const sourceUrl = String(row.source_url || "").trim();

  if (!songId || !sourceUrl) return null;
  return { songId, sourceUrl };
}

async function upsertClapCandidate(candidate: {
  songId: string;
  sourceUrl: string;
}) {
  const { embedding, segmentEmbeddings, conceptProfile } =
    await createClapAudioAnalysis(candidate.sourceUrl);

  const { error } = await supabaseServer.rpc(
    "upsert_song_clap_embedding",
    {
      p_song_id: candidate.songId,
      p_embedding: embedding,
      p_segment_embeddings: segmentEmbeddings,
      p_concept_profile: conceptProfile,
      p_model: SONG_CLAP_MODEL_KEY,
      p_dimensions: SONG_CLAP_EMBEDDING_DIMENSIONS,
      p_source_url: candidate.sourceUrl,
    },
  );

  if (error) throw error;
}

export async function ensurePublishedSongClapEmbeddings(limit = 1) {
  const safeLimit = clampInteger(limit, 1, MAX_BACKFILL_BATCH);
  const { data, error } = await supabaseServer.rpc(
    "list_song_clap_embedding_candidates",
    {
      p_limit: safeLimit,
      p_model: SONG_CLAP_MODEL_KEY,
      p_dimensions: SONG_CLAP_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const candidates = ((data ?? []) as AudioEmbeddingCandidateRow[]).flatMap(
    (row) => {
      const normalized = normalizeCandidate(row);
      return normalized ? [normalized] : [];
    },
  );

  for (const candidate of candidates) {
    await upsertClapCandidate(candidate);
  }

  return candidates.length;
}

export async function refreshPublishedSongClapEmbedding(songId: string) {
  const cleanSongId = songId.trim();
  if (!cleanSongId) return false;

  const { data, error } = await supabaseServer.rpc(
    "get_song_clap_embedding_candidate",
    {
      p_song_id: cleanSongId,
    },
  );

  if (error) throw error;

  const candidate = ((data ?? []) as AudioEmbeddingCandidateRow[])
    .map(normalizeCandidate)
    .find((value) => value !== null);

  if (!candidate) return false;

  await upsertClapCandidate(candidate);
  return true;
}

export async function getSongClapEmbeddingStats(): Promise<ClapEmbeddingStats> {
  const { data, error } = await supabaseServer.rpc(
    "get_song_clap_embedding_stats",
    {
      p_model: SONG_CLAP_MODEL_KEY,
      p_dimensions: SONG_CLAP_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const row = ((data ?? []) as AudioEmbeddingStatsRow[])[0];

  return {
    publishedSongs: Number(row?.published_songs ?? 0),
    embeddedSongs: Number(row?.embedded_songs ?? 0),
    pendingSongs: Number(row?.pending_songs ?? 0),
  };
}

export async function searchPublishedSongsByClapSimilarity(
  sourceUrl: string,
  options: {
    matchCount?: number;
    minSimilarity?: number;
  } = {},
): Promise<{
  referenceProfile: ClapConceptProfile;
  matches: ClapSimilarityMatch[];
}> {
  const {
    embedding,
    segmentEmbeddings: referenceSegments,
    conceptProfile: referenceProfile,
  } = await createClapAudioAnalysis(sourceUrl);

  const matchCount = clampInteger(
    options.matchCount ?? DEFAULT_MATCH_COUNT,
    1,
    200,
  );
  const minSimilarity = Number.isFinite(options.minSimilarity)
    ? Math.min(1, Math.max(-1, Number(options.minSimilarity)))
    : DEFAULT_MIN_SIMILARITY;

  const { data, error } = await supabaseServer.rpc(
    "match_song_clap_embeddings",
    {
      query_embedding: embedding,
      match_count: matchCount,
      min_similarity: minSimilarity,
      p_model: SONG_CLAP_MODEL_KEY,
      p_dimensions: SONG_CLAP_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const matches = ((data ?? []) as AudioEmbeddingMatchRow[]).flatMap(
    (row) => {
      const songId = String(row.song_id || "").trim();
      const similarity = Number(row.similarity);
      const candidateSegments = row.segment_embeddings;
      const candidateProfile = row.concept_profile;

      if (
        !songId ||
        !Number.isFinite(similarity) ||
        !isSegmentEmbeddings(candidateSegments) ||
        !isConceptProfile(candidateProfile)
      ) {
        return [];
      }

      const segmentSimilarity = getSegmentSimilarityMetrics(
        referenceSegments,
        candidateSegments,
      );

      return [
        {
          songId,
          similarity,
          bestSegmentSimilarity:
            segmentSimilarity.bestSegmentSimilarity,
          averageBestSegmentSimilarity:
            segmentSimilarity.averageBestSegmentSimilarity,
          consistentSegmentSimilarity:
            segmentSimilarity.consistentSegmentSimilarity,
          conceptProfile: candidateProfile,
        },
      ];
    },
  );

  return { referenceProfile, matches };
}
