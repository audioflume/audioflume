import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

import { supabaseServer } from "@/lib/supabaseServer";

export const SONG_AUDIO_ANALYSIS_MODEL = "gpt-audio-1.5";
export const SONG_AUDIO_EMBEDDING_MODEL = "text-embedding-3-large";
export const SONG_AUDIO_EMBEDDING_DIMENSIONS = 1536;

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const FFMPEG_EXECUTABLE_NAME =
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
const SAMPLE_RATE = 16000;
const ANALYSIS_SECONDS = 30;
const MAX_WAV_BYTES = SAMPLE_RATE * ANALYSIS_SECONDS * 2 + 1024 * 256;
const CACHE_TTL_MS = 60 * 60 * 1000;
const DEFAULT_MATCH_COUNT = 200;
const DEFAULT_MIN_SIMILARITY = -1;
const MAX_BACKFILL_BATCH = 8;

const AUDIO_ANALYSIS_PROMPT = [
  "Analyze only the audible musical characteristics of this recording for music-to-music similarity search.",
  "Do not infer anything from a title, artist, lyrics metadata, popularity, or cultural context.",
  "Return one compact semicolon-separated line in this exact order:",
  "primary instrumentation; secondary instrumentation; genre/style; cinematic or song-oriented character; tempo and pacing; rhythm/groove; mood/emotion; energy; arrangement density; dynamics/build; vocal presence; timbre/production character.",
  "Be literal and specific. Put the strongest audible traits first.",
  "Explicitly identify instruments such as cello, bowed strings, violin, piano, acoustic guitar, drums, bass, synths, or brass when they are audible.",
  "Clearly distinguish sparse cinematic score, orchestral/neo-classical material, pop, hip-hop, rock, electronic, ambient, folk, and other materially different styles.",
].join(" ");

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      audio?: {
        transcript?: string;
      };
    };
  }>;
  error?: {
    message?: string;
  };
};

type OpenAIEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
    index?: number;
  }>;
  error?: {
    message?: string;
  };
};

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

export type AudioSimilarityMatch = {
  songId: string;
  similarity: number;
};

export type AudioSimilarityEmbeddingStats = {
  publishedSongs: number;
  embeddedSongs: number;
  pendingSongs: number;
};

const semanticCache = new Map<
  string,
  {
    expiresAt: number;
    descriptor: string;
    embedding: number[];
  }
>();

let resolvedFfmpegPath: string | null = null;

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

async function decodeAudioToWav(sourceUrl: string) {
  const ffmpegCommand = await resolveFfmpegPath();

  return await new Promise<Buffer>((resolve, reject) => {
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
        "-acodec",
        "pcm_s16le",
        "-f",
        "wav",
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
      reject(new Error("Audio semantic analysis timed out while decoding"));
    }, 25_000);

    child.stdout.on("data", (chunk: Buffer) => {
      byteLength += chunk.length;

      if (byteLength > MAX_WAV_BYTES) {
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

      if (byteLength > MAX_WAV_BYTES) {
        reject(new Error("Decoded audio exceeded the semantic analysis limit"));
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

      resolve(Buffer.concat(chunks));
    });
  });
}

function getTextContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
) {
  if (typeof content === "string") return content.trim();

  if (!Array.isArray(content)) return "";

  return content
    .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function analyzeAudioSemantics(wav: Buffer) {
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SONG_AUDIO_ANALYSIS_MODEL,
      modalities: ["text", "audio"],
      audio: {
        voice: "alloy",
        format: "wav",
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: AUDIO_ANALYSIS_PROMPT,
            },
            {
              type: "input_audio",
              input_audio: {
                data: wav.toString("base64"),
                format: "wav",
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_completion_tokens: 350,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | OpenAIChatCompletionResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        `OpenAI audio analysis failed with status ${response.status}`,
    );
  }

  const message = payload?.choices?.[0]?.message;
  const descriptor =
    getTextContent(message?.content) ||
    message?.audio?.transcript?.trim() ||
    "";

  if (!descriptor) {
    throw new Error("OpenAI audio analysis returned an empty descriptor");
  }

  return descriptor;
}

async function createEmbedding(input: string) {
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SONG_AUDIO_EMBEDDING_MODEL,
      input,
      dimensions: SONG_AUDIO_EMBEDDING_DIMENSIONS,
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

  const embedding = payload?.data?.[0]?.embedding;

  if (
    !Array.isArray(embedding) ||
    embedding.length !== SONG_AUDIO_EMBEDDING_DIMENSIONS
  ) {
    throw new Error("OpenAI returned an audio-search embedding with unexpected dimensions");
  }

  return embedding;
}

export async function createAudioSimilarityEmbedding(sourceUrl: string) {
  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl) throw new Error("Audio URL is required");

  const cached = semanticCache.get(cleanUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      descriptor: cached.descriptor,
      embedding: cached.embedding,
    };
  }

  const wav = await decodeAudioToWav(cleanUrl);
  const descriptor = await analyzeAudioSemantics(wav);
  const embedding = await createEmbedding(
    `Audio-derived musical similarity profile.\n${descriptor}`,
  );

  semanticCache.set(cleanUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    descriptor,
    embedding,
  });

  return { descriptor, embedding };
}

function normalizeCandidate(row: AudioEmbeddingCandidateRow) {
  const songId = String(row.song_id || "").trim();
  const sourceUrl = String(row.source_url || "").trim();

  if (!songId || !sourceUrl) return null;
  return { songId, sourceUrl };
}

async function upsertAudioSimilarityCandidate(candidate: {
  songId: string;
  sourceUrl: string;
}) {
  const { descriptor, embedding } = await createAudioSimilarityEmbedding(
    candidate.sourceUrl,
  );

  const { error } = await supabaseServer.rpc(
    "upsert_song_audio_similarity_embedding",
    {
      p_song_id: candidate.songId,
      p_embedding: embedding,
      p_descriptor: descriptor,
      p_analysis_model: SONG_AUDIO_ANALYSIS_MODEL,
      p_embedding_model: SONG_AUDIO_EMBEDDING_MODEL,
      p_dimensions: SONG_AUDIO_EMBEDDING_DIMENSIONS,
      p_source_url: candidate.sourceUrl,
    },
  );

  if (error) throw error;
}

export async function ensurePublishedSongAudioSimilarityEmbeddings(
  limit = 4,
) {
  const safeLimit = clampInteger(limit, 1, MAX_BACKFILL_BATCH);
  const { data, error } = await supabaseServer.rpc(
    "list_song_audio_similarity_embedding_candidates",
    {
      p_limit: safeLimit,
      p_analysis_model: SONG_AUDIO_ANALYSIS_MODEL,
      p_embedding_model: SONG_AUDIO_EMBEDDING_MODEL,
      p_dimensions: SONG_AUDIO_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const candidates = ((data ?? []) as AudioEmbeddingCandidateRow[]).flatMap(
    (row) => {
      const normalized = normalizeCandidate(row);
      return normalized ? [normalized] : [];
    },
  );

  await Promise.all(candidates.map(upsertAudioSimilarityCandidate));
  return candidates.length;
}

export async function refreshPublishedSongAudioSimilarityEmbedding(
  songId: string,
) {
  const cleanSongId = songId.trim();
  if (!cleanSongId) return false;

  const { data, error } = await supabaseServer.rpc(
    "get_song_audio_similarity_embedding_candidate",
    {
      p_song_id: cleanSongId,
    },
  );

  if (error) throw error;

  const candidate = ((data ?? []) as AudioEmbeddingCandidateRow[])
    .map(normalizeCandidate)
    .find((value) => value !== null);

  if (!candidate) return false;

  await upsertAudioSimilarityCandidate(candidate);
  return true;
}

export async function getSongAudioSimilarityEmbeddingStats(): Promise<AudioSimilarityEmbeddingStats> {
  const { data, error } = await supabaseServer.rpc(
    "get_song_audio_similarity_embedding_stats",
    {
      p_analysis_model: SONG_AUDIO_ANALYSIS_MODEL,
      p_embedding_model: SONG_AUDIO_EMBEDDING_MODEL,
      p_dimensions: SONG_AUDIO_EMBEDDING_DIMENSIONS,
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

export async function searchPublishedSongsByAudioSimilarity(
  sourceUrl: string,
  options: {
    matchCount?: number;
    minSimilarity?: number;
  } = {},
): Promise<{
  descriptor: string;
  matches: AudioSimilarityMatch[];
}> {
  const { descriptor, embedding } = await createAudioSimilarityEmbedding(
    sourceUrl,
  );

  const matchCount = clampInteger(
    options.matchCount ?? DEFAULT_MATCH_COUNT,
    1,
    200,
  );
  const minSimilarity = Number.isFinite(options.minSimilarity)
    ? Math.min(1, Math.max(-1, Number(options.minSimilarity)))
    : DEFAULT_MIN_SIMILARITY;

  const { data, error } = await supabaseServer.rpc(
    "match_song_audio_similarity_embeddings",
    {
      query_embedding: embedding,
      match_count: matchCount,
      min_similarity: minSimilarity,
      p_analysis_model: SONG_AUDIO_ANALYSIS_MODEL,
      p_embedding_model: SONG_AUDIO_EMBEDDING_MODEL,
      p_dimensions: SONG_AUDIO_EMBEDDING_DIMENSIONS,
    },
  );

  if (error) throw error;

  const matches = ((data ?? []) as AudioEmbeddingMatchRow[]).flatMap((row) => {
    const songId = String(row.song_id || "").trim();
    const similarity = Number(row.similarity);

    if (!songId || !Number.isFinite(similarity)) return [];
    return [{ songId, similarity }];
  });

  return { descriptor, matches };
}
