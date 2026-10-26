import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

import { env, Tensor } from "@huggingface/transformers";

import { supabaseServer } from "@/lib/supabaseServer";

export const SONG_DISCOGS_MODEL_ID =
  "discogs_track_embeddings-effnet-bs64-1";
export const SONG_DISCOGS_MODEL_KEY =
  "discogs_track_embeddings-effnet-bs64-1:5x10s:v1";
export const SONG_DISCOGS_EMBEDDING_DIMENSIONS = 512;

const MODEL_URL =
  "https://essentia.upf.edu/models/feature-extractors/discogs-effnet/discogs_track_embeddings-effnet-bs64-1.onnx";
const SAMPLE_RATE = 16000;
const WINDOW_SECONDS = 10;
const WINDOW_COUNT = 5;
const WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_SECONDS;
const MAX_PCM_BYTES = WINDOW_SAMPLES * 4 + 1024 * 256;
const FRAME_SIZE = 512;
const FRAME_HOP_SIZE = 256;
const MEL_BANDS = 96;
const PATCH_SIZE = 128;
const PATCH_HOP_SIZE = 62;
const MODEL_BATCH_SIZE = 64;
const DEFAULT_MATCH_COUNT = 100;
const MAX_BACKFILL_BATCH = 2;
const CACHE_TTL_MS = 60 * 60 * 1000;

type DiscogsCandidateRow = {
  song_id?: string | null;
  source_url?: string | null;
};

type DiscogsMatchRow = {
  song_id?: string | null;
  similarity?: number | string | null;
};

type DiscogsStatsRow = {
  published_songs?: number | string | null;
  embedded_songs?: number | string | null;
  pending_songs?: number | string | null;
};

type EssentiaInputFeature = {
  melSpectrum: Float32Array[] | number[][];
  frameSize: number;
  patchSize: number;
  melBandsSize: number;
};

type EssentiaExtractor = {
  computeFrameWise: (
    audioSignal: Float32Array,
    hopSize?: number,
  ) => EssentiaInputFeature;
};

type EssentiaPackage = {
  EssentiaWASM: unknown;
  EssentiaModel: {
    EssentiaTFInputExtractor: new (
      wasm: unknown,
      extractorType?: string,
      isDebug?: boolean,
    ) => EssentiaExtractor;
  };
};

type OnnxBackend = {
  createInferenceSession: (
    bufferOrPath: Uint8Array | string,
    sessionOptions?: Record<string, unknown>,
    sessionConfig?: Record<string, unknown>,
  ) => Promise<unknown>;
  runInferenceSession: (
    session: unknown,
    feeds: Record<string, Tensor>,
  ) => Promise<Record<string, Tensor>>;
};

export type DiscogsSimilarityMatch = {
  songId: string;
  similarity: number;
};

export type DiscogsEmbeddingStats = {
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
let extractorPromise: Promise<EssentiaExtractor> | null = null;
let inferenceSessionPromise: Promise<unknown> | null = null;

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

  const executableName =
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const candidates = [
    process.env.FFMPEG_PATH,
    ffmpegPath || undefined,
    path.join(
      process.cwd(),
      "node_modules",
      "ffmpeg-static",
      executableName,
    ),
    path.join(
      process.cwd(),
      "..",
      "..",
      "node_modules",
      "ffmpeg-static",
      executableName,
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of [...new Set(candidates)]) {
    if (await fileExists(candidate)) {
      resolvedFfmpegPath = candidate;
      return candidate;
    }
  }

  resolvedFfmpegPath = "ffmpeg";
  return resolvedFfmpegPath;
}

async function getAudioDurationSeconds(sourceUrl: string) {
  const ffmpegCommand = await resolveFfmpegPath();

  return await new Promise<number | null>((resolve) => {
    const child = spawn(ffmpegCommand, ["-hide_banner", "-i", sourceUrl], {
      stdio: ["ignore", "ignore", "pipe"],
    });

    const errors: Buffer[] = [];
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGKILL");
      resolve(null);
    }, 15_000);

    child.stderr.on("data", (chunk: Buffer) => {
      errors.push(chunk);
    });

    child.on("error", () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve(null);
    });

    child.on("close", () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      const output = Buffer.concat(errors).toString("utf8");
      const match = /Duration:\\s*(\\d+):(\\d+):(\\d+(?:\\.\\d+)?)/.exec(output);

      if (!match) {
        resolve(null);
        return;
      }

      const duration =
        Number(match[1]) * 3600 +
        Number(match[2]) * 60 +
        Number(match[3]);

      resolve(Number.isFinite(duration) && duration > 0 ? duration : null);
    });
  });
}

function getAnalysisWindowStarts(durationSeconds: number | null) {
  if (!durationSeconds || durationSeconds <= WINDOW_SECONDS) {
    return [0];
  }

  const finalStart = Math.max(0, durationSeconds - WINDOW_SECONDS);
  return Array.from({ length: WINDOW_COUNT }, (_, index) =>
    (finalStart * index) / (WINDOW_COUNT - 1),
  ).filter(
    (start, index, all) =>
      all.findIndex((value) => Math.abs(value - start) < 0.01) === index,
  );
}

async function decodeAudioWindow(sourceUrl: string, startSeconds: number) {
  const ffmpegCommand = await resolveFfmpegPath();
  const seekArgs =
    startSeconds > 0 ? ["-ss", startSeconds.toFixed(3)] : [];

  return await new Promise<Float32Array>((resolve, reject) => {
    const child = spawn(
      ffmpegCommand,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        ...seekArgs,
        "-i",
        sourceUrl,
        "-t",
        String(WINDOW_SECONDS),
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
      reject(new Error("Discogs EffNet audio decode timed out"));
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
        reject(new Error("Decoded audio exceeded the Discogs analysis limit"));
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
    throw new Error("Discogs EffNet returned a zero-length embedding");
  }

  return values.map((value) => value / magnitude);
}

async function getExtractor() {
  if (extractorPromise) return extractorPromise;

  extractorPromise = (async () => {
    const imported = (await import("essentia.js")) as unknown as
      | EssentiaPackage
      | { default: EssentiaPackage };
    const packageValue =
      "default" in imported ? imported.default : imported;

    return new packageValue.EssentiaModel.EssentiaTFInputExtractor(
      packageValue.EssentiaWASM,
      "musicnn",
      false,
    );
  })();

  return extractorPromise;
}

function getOnnxBackend() {
  const backend = env.backends.onnx as unknown as OnnxBackend;
  return backend;
}

async function getInferenceSession() {
  if (inferenceSessionPromise) return inferenceSessionPromise;

  inferenceSessionPromise = (async () => {
    const response = await fetch(MODEL_URL, {
      cache: "force-cache",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to load Discogs EffNet model: ${response.status}`,
      );
    }

    const modelBytes = new Uint8Array(await response.arrayBuffer());
    return getOnnxBackend().createInferenceSession(modelBytes, {}, {});
  })();

  return inferenceSessionPromise;
}

function buildMelPatches(melSpectrum: Float32Array[] | number[][]) {
  const frames = melSpectrum.map((frame) => Array.from(frame, Number));

  if (frames.length === 0) {
    throw new Error("Discogs EffNet mel analysis returned no frames");
  }

  const starts: number[] = [];

  for (
    let start = 0;
    start + PATCH_SIZE <= frames.length;
    start += PATCH_HOP_SIZE
  ) {
    starts.push(start);
  }

  if (starts.length === 0) {
    starts.push(0);
  }

  return starts.map((start) =>
    Array.from({ length: PATCH_SIZE }, (_, frameOffset) => {
      const sourceIndex = Math.min(
        start + frameOffset,
        frames.length - 1,
      );
      const frame = frames[sourceIndex] ?? [];
      return Array.from(
        { length: MEL_BANDS },
        (_, bandIndex) => Number(frame[bandIndex] ?? 0),
      );
    }),
  );
}

async function embedPatches(patches: number[][][]) {
  if (patches.length === 0) {
    throw new Error("Discogs EffNet received no mel patches");
  }

  const session = await getInferenceSession();
  const backend = getOnnxBackend();
  const embeddings: number[][] = [];

  for (let offset = 0; offset < patches.length; offset += MODEL_BATCH_SIZE) {
    const realBatch = patches.slice(offset, offset + MODEL_BATCH_SIZE);
    const paddedBatch = [...realBatch];

    while (paddedBatch.length < MODEL_BATCH_SIZE) {
      paddedBatch.push(realBatch[realBatch.length - 1]);
    }

    const flattened = new Float32Array(
      MODEL_BATCH_SIZE * PATCH_SIZE * MEL_BANDS,
    );
    let writeIndex = 0;

    for (const patch of paddedBatch) {
      for (const frame of patch) {
        for (const value of frame) {
          flattened[writeIndex] = value;
          writeIndex += 1;
        }
      }
    }

    const input = new Tensor(
      "float32",
      flattened,
      [MODEL_BATCH_SIZE, PATCH_SIZE, MEL_BANDS],
    );

    const outputs = await backend.runInferenceSession(session, {
      serving_default_melspectrogram: input,
    });
    const trackOutput =
      outputs["PartitionedCall:0"] ??
      Object.values(outputs).find(
        (output) =>
          output.dims.length === 2 &&
          output.dims[1] === SONG_DISCOGS_EMBEDDING_DIMENSIONS,
      );

    if (!trackOutput) {
      throw new Error("Discogs EffNet returned no track-similarity output");
    }

    const values = Array.from(trackOutput.data, Number);

    for (let row = 0; row < realBatch.length; row++) {
      const start = row * SONG_DISCOGS_EMBEDDING_DIMENSIONS;
      embeddings.push(
        values.slice(
          start,
          start + SONG_DISCOGS_EMBEDDING_DIMENSIONS,
        ),
      );
    }
  }

  return embeddings;
}

export async function createDiscogsAudioEmbedding(sourceUrl: string) {
  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl) throw new Error("Audio URL is required");

  const cached = embeddingCache.get(cleanUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.embedding;
  }

  const durationSeconds = await getAudioDurationSeconds(cleanUrl);
  const windowStarts = getAnalysisWindowStarts(durationSeconds);
  const extractor = await getExtractor();
  const patchEmbeddings: number[][] = [];

  for (const startSeconds of windowStarts) {
    const audio = await decodeAudioWindow(cleanUrl, startSeconds);

    if (audio.length === 0) {
      throw new Error("Decoded audio was empty");
    }

    const features = extractor.computeFrameWise(
      audio,
      FRAME_HOP_SIZE,
    );
    const patches = buildMelPatches(features.melSpectrum);
    patchEmbeddings.push(...(await embedPatches(patches)));
  }

  const averaged = Array.from(
    { length: SONG_DISCOGS_EMBEDDING_DIMENSIONS },
    (_, index) =>
      patchEmbeddings.reduce(
        (sum, embedding) => sum + (embedding[index] ?? 0),
        0,
      ) / patchEmbeddings.length,
  );
  const embedding = normalizeVector(averaged);

  embeddingCache.set(cleanUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    embedding,
  });

  return embedding;
}

function normalizeCandidate(row: DiscogsCandidateRow) {
  const songId = String(row.song_id || "").trim();
  const sourceUrl = String(row.source_url || "").trim();

  if (!songId || !sourceUrl) return null;
  return { songId, sourceUrl };
}

async function upsertDiscogsCandidate(candidate: {
  songId: string;
  sourceUrl: string;
}) {
  const embedding = await createDiscogsAudioEmbedding(candidate.sourceUrl);

  const { error } = await supabaseServer.rpc(
    "upsert_song_discogs_embedding",
    {
      p_song_id: candidate.songId,
      p_embedding: embedding,
      p_model: SONG_DISCOGS_MODEL_KEY,
      p_dimensions: SONG_DISCOGS_EMBEDDING_DIMENSIONS,
      p_source_url: candidate.sourceUrl,
    },
  );

  if (error) throw error;
}

export async function ensurePublishedSongDiscogsEmbeddings(limit = 1) {
  const safeLimit = clampInteger(limit, 1, MAX_BACKFILL_BATCH);
  const { data, error } = await supabaseServer.rpc(
    "list_song_discogs_embedding_candidates",
    {
      p_limit: safeLimit,
      p_model: SONG_DISCOGS_MODEL_KEY,
      p_dimensions: SONG_DISCOGS_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const candidates = ((data ?? []) as DiscogsCandidateRow[]).flatMap(
    (row) => {
      const normalized = normalizeCandidate(row);
      return normalized ? [normalized] : [];
    },
  );

  for (const candidate of candidates) {
    await upsertDiscogsCandidate(candidate);
  }

  return candidates.length;
}

export async function refreshPublishedSongDiscogsEmbedding(songId: string) {
  const cleanSongId = songId.trim();
  if (!cleanSongId) return false;

  const { data, error } = await supabaseServer.rpc(
    "get_song_discogs_embedding_candidate",
    {
      p_song_id: cleanSongId,
    },
  );

  if (error) throw error;

  const candidate = ((data ?? []) as DiscogsCandidateRow[])
    .map(normalizeCandidate)
    .find((value) => value !== null);

  if (!candidate) return false;

  await upsertDiscogsCandidate(candidate);
  return true;
}

export async function getSongDiscogsEmbeddingStats(): Promise<DiscogsEmbeddingStats> {
  const { data, error } = await supabaseServer.rpc(
    "get_song_discogs_embedding_stats",
    {
      p_model: SONG_DISCOGS_MODEL_KEY,
      p_dimensions: SONG_DISCOGS_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const row = ((data ?? []) as DiscogsStatsRow[])[0];

  return {
    publishedSongs: Number(row?.published_songs ?? 0),
    embeddedSongs: Number(row?.embedded_songs ?? 0),
    pendingSongs: Number(row?.pending_songs ?? 0),
  };
}

export async function searchPublishedSongsByDiscogsSimilarity(
  sourceUrl: string,
  options: {
    matchCount?: number;
    minSimilarity?: number;
  } = {},
): Promise<DiscogsSimilarityMatch[]> {
  const embedding = await createDiscogsAudioEmbedding(sourceUrl);
  const matchCount = clampInteger(
    options.matchCount ?? DEFAULT_MATCH_COUNT,
    1,
    DEFAULT_MATCH_COUNT,
  );
  const minSimilarity = Number.isFinite(options.minSimilarity)
    ? Math.min(1, Math.max(-1, Number(options.minSimilarity)))
    : -1;

  const { data, error } = await supabaseServer.rpc(
    "match_song_discogs_embeddings",
    {
      query_embedding: embedding,
      match_count: matchCount,
      min_similarity: minSimilarity,
      p_model: SONG_DISCOGS_MODEL_KEY,
      p_dimensions: SONG_DISCOGS_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  return ((data ?? []) as DiscogsMatchRow[]).flatMap((row) => {
    const songId = String(row.song_id || "").trim();
    const similarity = Number(row.similarity);

    if (!songId || !Number.isFinite(similarity)) return [];
    return [{ songId, similarity }];
  });
}
