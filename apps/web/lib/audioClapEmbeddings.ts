import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { supabaseServer } from "@/lib/supabaseServer";

export const SONG_CLAP_MODEL_ID = "Xenova/larger_clap_music_and_speech";
export const SONG_CLAP_MODEL_KEY =
  "Xenova/larger_clap_music_and_speech:q8:3x10s:v1";
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

export type ClapSimilarityMatch = {
  songId: string;
  similarity: number;
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
  }
>();

let resolvedFfmpegPath: string | null = null;
let clapRuntimePromise:
  | Promise<{
      processor: ClapProcessor;
      model: ClapModel;
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

export async function createClapAudioEmbedding(sourceUrl: string) {
  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl) throw new Error("Audio URL is required");

  const cached = embeddingCache.get(cleanUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.embedding;
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
  const embedding = normalizeVector(averaged);

  embeddingCache.set(cleanUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    embedding,
  });

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
  const embedding = await createClapAudioEmbedding(candidate.sourceUrl);

  const { error } = await supabaseServer.rpc(
    "upsert_song_clap_embedding",
    {
      p_song_id: candidate.songId,
      p_embedding: embedding,
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
): Promise<ClapSimilarityMatch[]> {
  const embedding = await createClapAudioEmbedding(sourceUrl);

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

  return ((data ?? []) as AudioEmbeddingMatchRow[]).flatMap((row) => {
    const songId = String(row.song_id || "").trim();
    const similarity = Number(row.similarity);

    if (!songId || !Number.isFinite(similarity)) return [];
    return [{ songId, similarity }];
  });
}
