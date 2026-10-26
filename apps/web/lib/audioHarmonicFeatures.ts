import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

import { supabaseServer } from "@/lib/supabaseServer";

export const SONG_HARMONIC_PROFILE_VERSION = "harmonic-profile:5x10s:v1";

const SAMPLE_RATE = 11025;
const WINDOW_SECONDS = 10;
const WINDOW_COUNT = 5;
const FFT_SIZE = 2048;
const FRAME_COUNT = 48;
const MAX_PCM_BYTES = SAMPLE_RATE * WINDOW_SECONDS * 2 + 1024 * 128;
const MAX_BACKFILL_BATCH = 2;
const CACHE_TTL_MS = 60 * 60 * 1000;

type HarmonicCandidateRow = {
  song_id?: string | null;
  source_url?: string | null;
};

type HarmonicProfileRow = {
  song_id?: string | null;
  chroma?: unknown;
  major_character?: number | string | null;
  harmonic_movement?: number | string | null;
  tonal_stability?: number | string | null;
};

type HarmonicStatsRow = {
  published_songs?: number | string | null;
  profiled_songs?: number | string | null;
  pending_songs?: number | string | null;
};

export type HarmonicProfile = {
  chroma: number[];
  majorCharacter: number;
  harmonicMovement: number;
  tonalStability: number;
};

export type HarmonicProfileMatch = HarmonicProfile & {
  songId: string;
};

export type HarmonicProfileStats = {
  publishedSongs: number;
  profiledSongs: number;
  pendingSongs: number;
};

const profileCache = new Map<
  string,
  {
    expiresAt: number;
    profile: HarmonicProfile;
  }
>();

let resolvedFfmpegPath: string | null = null;

const MAJOR_TEMPLATE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
  2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_TEMPLATE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53,
  2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeDistribution(values: number[]) {
  const nonNegative = values.map((value) => Math.max(0, value));
  const total = nonNegative.reduce((sum, value) => sum + value, 0);
  return total > 0
    ? nonNegative.map((value) => value / total)
    : nonNegative;
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
  return denominator > 0 ? clamp01(dot / denominator) : 0;
}

function scalarSimilarity(left: number, right: number, scale: number) {
  return Math.exp(-Math.abs(left - right) / Math.max(scale, 1e-6));
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
      const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(output);

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
  if (!durationSeconds || durationSeconds <= WINDOW_SECONDS) return [0];

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
        "s16le",
        "pipe:1",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    let byteLength = 0;
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGKILL");
      reject(new Error("Harmonic analysis timed out"));
    }, 25_000);

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
        reject(new Error("Decoded audio exceeded the harmonic analysis limit"));
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
      const sampleCount = Math.floor(pcm.length / 2);
      const samples = new Float32Array(sampleCount);

      for (let index = 0; index < sampleCount; index++) {
        samples[index] = pcm.readInt16LE(index * 2) / 32768;
      }

      resolve(samples);
    });
  });
}

function fftMagnitudes(frame: Float32Array) {
  const size = frame.length;
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);

  for (let index = 0; index < size; index++) {
    const window =
      0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, size - 1));
    real[index] = frame[index] * window;
  }

  for (let index = 1, reversed = 0; index < size; index++) {
    let bit = size >> 1;

    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;

    if (index < reversed) {
      const temporary = real[index];
      real[index] = real[reversed];
      real[reversed] = temporary;
    }
  }

  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wLengthReal = Math.cos(angle);
    const wLengthImaginary = Math.sin(angle);

    for (let offset = 0; offset < size; offset += length) {
      let wReal = 1;
      let wImaginary = 0;
      const half = length >> 1;

      for (let index = 0; index < half; index++) {
        const even = offset + index;
        const odd = even + half;
        const oddReal =
          real[odd] * wReal - imaginary[odd] * wImaginary;
        const oddImaginary =
          real[odd] * wImaginary + imaginary[odd] * wReal;

        real[odd] = real[even] - oddReal;
        imaginary[odd] = imaginary[even] - oddImaginary;
        real[even] += oddReal;
        imaginary[even] += oddImaginary;

        const nextWReal =
          wReal * wLengthReal - wImaginary * wLengthImaginary;
        wImaginary =
          wReal * wLengthImaginary + wImaginary * wLengthReal;
        wReal = nextWReal;
      }
    }
  }

  const magnitudes = new Float64Array(size / 2);

  for (let index = 0; index < magnitudes.length; index++) {
    magnitudes[index] = Math.hypot(real[index], imaginary[index]);
  }

  return magnitudes;
}

function getChroma(magnitudes: Float64Array) {
  const chroma = new Array<number>(12).fill(0);
  const binWidth = SAMPLE_RATE / FFT_SIZE;

  for (let bin = 1; bin < magnitudes.length; bin++) {
    const frequency = bin * binWidth;
    if (frequency < 65 || frequency > 5000) continue;

    const midi = 69 + 12 * Math.log2(frequency / 440);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    const energy = magnitudes[bin] * magnitudes[bin];
    chroma[pitchClass] += energy;
  }

  return normalizeDistribution(chroma);
}

function rotate(values: number[], shift: number) {
  return values.map(
    (_, index) => values[(index + shift) % values.length] ?? 0,
  );
}

function bestTemplateScore(chroma: number[], template: number[]) {
  const normalizedTemplate = normalizeDistribution(template);
  let best = 0;

  for (let shift = 0; shift < 12; shift++) {
    best = Math.max(
      best,
      cosineSimilarity(chroma, rotate(normalizedTemplate, shift)),
    );
  }

  return best;
}

function tonalStability(chroma: number[]) {
  const entropy = -chroma.reduce(
    (sum, value) =>
      value > 0 ? sum + value * Math.log(value) : sum,
    0,
  );
  return clamp01(1 - entropy / Math.log(12));
}

function analyzeHarmonicWindow(samples: Float32Array): HarmonicProfile {
  if (samples.length < FFT_SIZE) {
    throw new Error("Audio preview is too short for harmonic analysis");
  }

  const frames: number[][] = [];

  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex++) {
    const progress =
      FRAME_COUNT === 1 ? 0 : frameIndex / (FRAME_COUNT - 1);
    const start = Math.min(
      samples.length - FFT_SIZE,
      Math.round(progress * (samples.length - FFT_SIZE)),
    );
    const frame = samples.slice(start, start + FFT_SIZE);
    frames.push(getChroma(fftMagnitudes(frame)));
  }

  const chroma = normalizeDistribution(
    Array.from({ length: 12 }, (_, index) =>
      mean(frames.map((frame) => frame[index] ?? 0)),
    ),
  );

  const movement = mean(
    frames.slice(1).map((frame, index) => {
      const previous = frames[index];
      return 1 - cosineSimilarity(previous, frame);
    }),
  );

  const majorScore = bestTemplateScore(chroma, MAJOR_TEMPLATE);
  const minorScore = bestTemplateScore(chroma, MINOR_TEMPLATE);
  const majorCharacter =
    majorScore + minorScore > 0
      ? majorScore / (majorScore + minorScore)
      : 0.5;

  return {
    chroma,
    majorCharacter,
    harmonicMovement: clamp01(movement * 2.5),
    tonalStability: tonalStability(chroma),
  };
}

function averageProfiles(profiles: HarmonicProfile[]): HarmonicProfile {
  return {
    chroma: normalizeDistribution(
      Array.from({ length: 12 }, (_, index) =>
        mean(profiles.map((profile) => profile.chroma[index] ?? 0)),
      ),
    ),
    majorCharacter: mean(
      profiles.map((profile) => profile.majorCharacter),
    ),
    harmonicMovement: mean(
      profiles.map((profile) => profile.harmonicMovement),
    ),
    tonalStability: mean(
      profiles.map((profile) => profile.tonalStability),
    ),
  };
}

export async function createHarmonicProfile(sourceUrl: string) {
  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl) throw new Error("Audio URL is required");

  const cached = profileCache.get(cleanUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  const durationSeconds = await getAudioDurationSeconds(cleanUrl);
  const windowStarts = getAnalysisWindowStarts(durationSeconds);
  const profiles: HarmonicProfile[] = [];

  for (const startSeconds of windowStarts) {
    const samples = await decodeAudioWindow(cleanUrl, startSeconds);
    profiles.push(analyzeHarmonicWindow(samples));
  }

  const profile = averageProfiles(profiles);

  profileCache.set(cleanUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    profile,
  });

  return profile;
}

function normalizeCandidate(row: HarmonicCandidateRow) {
  const songId = String(row.song_id || "").trim();
  const sourceUrl = String(row.source_url || "").trim();

  if (!songId || !sourceUrl) return null;
  return { songId, sourceUrl };
}

function isChroma(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 12 &&
    value.every((item) => Number.isFinite(Number(item)))
  );
}

async function upsertHarmonicCandidate(candidate: {
  songId: string;
  sourceUrl: string;
}) {
  const profile = await createHarmonicProfile(candidate.sourceUrl);

  const { error } = await supabaseServer.rpc(
    "upsert_song_harmonic_profile",
    {
      p_song_id: candidate.songId,
      p_chroma: profile.chroma,
      p_major_character: profile.majorCharacter,
      p_harmonic_movement: profile.harmonicMovement,
      p_tonal_stability: profile.tonalStability,
      p_version: SONG_HARMONIC_PROFILE_VERSION,
      p_source_url: candidate.sourceUrl,
    },
  );

  if (error) throw error;
}

export async function ensurePublishedSongHarmonicProfiles(limit = 1) {
  const safeLimit = clampInteger(limit, 1, MAX_BACKFILL_BATCH);
  const { data, error } = await supabaseServer.rpc(
    "list_song_harmonic_profile_candidates",
    {
      p_limit: safeLimit,
      p_version: SONG_HARMONIC_PROFILE_VERSION,
    },
  );

  if (error) throw error;

  const candidates = ((data ?? []) as HarmonicCandidateRow[]).flatMap(
    (row) => {
      const normalized = normalizeCandidate(row);
      return normalized ? [normalized] : [];
    },
  );

  for (const candidate of candidates) {
    await upsertHarmonicCandidate(candidate);
  }

  return candidates.length;
}

export async function refreshPublishedSongHarmonicProfile(songId: string) {
  const cleanSongId = songId.trim();
  if (!cleanSongId) return false;

  const { data, error } = await supabaseServer.rpc(
    "get_song_harmonic_profile_candidate",
    {
      p_song_id: cleanSongId,
    },
  );

  if (error) throw error;

  const candidate = ((data ?? []) as HarmonicCandidateRow[])
    .map(normalizeCandidate)
    .find((value) => value !== null);

  if (!candidate) return false;

  await upsertHarmonicCandidate(candidate);
  return true;
}

export async function getSongHarmonicProfileStats():
  Promise<HarmonicProfileStats> {
  const { data, error } = await supabaseServer.rpc(
    "get_song_harmonic_profile_stats",
    {
      p_version: SONG_HARMONIC_PROFILE_VERSION,
    },
  );

  if (error) throw error;

  const row = ((data ?? []) as HarmonicStatsRow[])[0];

  return {
    publishedSongs: Number(row?.published_songs ?? 0),
    profiledSongs: Number(row?.profiled_songs ?? 0),
    pendingSongs: Number(row?.pending_songs ?? 0),
  };
}

export async function getPublishedSongHarmonicProfiles(
  songIds: string[],
): Promise<HarmonicProfileMatch[]> {
  const cleanSongIds = [
    ...new Set(songIds.map((songId) => songId.trim()).filter(Boolean)),
  ];

  if (cleanSongIds.length === 0) return [];

  const { data, error } = await supabaseServer.rpc(
    "get_song_harmonic_profiles_by_ids",
    {
      p_song_ids: cleanSongIds,
      p_version: SONG_HARMONIC_PROFILE_VERSION,
    },
  );

  if (error) throw error;

  return ((data ?? []) as HarmonicProfileRow[]).flatMap((row) => {
    const songId = String(row.song_id || "").trim();
    const chroma = row.chroma;
    const majorCharacter = Number(row.major_character);
    const harmonicMovement = Number(row.harmonic_movement);
    const tonalStability = Number(row.tonal_stability);

    if (
      !songId ||
      !isChroma(chroma) ||
      !Number.isFinite(majorCharacter) ||
      !Number.isFinite(harmonicMovement) ||
      !Number.isFinite(tonalStability)
    ) {
      return [];
    }

    return [{
      songId,
      chroma: chroma.map(Number),
      majorCharacter,
      harmonicMovement,
      tonalStability,
    }];
  });
}

function bestTransposedChromaSimilarity(left: number[], right: number[]) {
  let best = 0;

  for (let shift = 0; shift < 12; shift++) {
    best = Math.max(best, cosineSimilarity(left, rotate(right, shift)));
  }

  return best;
}

export function compareHarmonicProfiles(
  reference: HarmonicProfile,
  candidate: HarmonicProfile,
) {
  const chromaSimilarity = bestTransposedChromaSimilarity(
    reference.chroma,
    candidate.chroma,
  );
  const modeSimilarity = scalarSimilarity(
    reference.majorCharacter,
    candidate.majorCharacter,
    0.12,
  );
  const movementSimilarity = scalarSimilarity(
    reference.harmonicMovement,
    candidate.harmonicMovement,
    0.18,
  );
  const stabilitySimilarity = scalarSimilarity(
    reference.tonalStability,
    candidate.tonalStability,
    0.16,
  );

  return (
    chromaSimilarity * 0.55 +
    modeSimilarity * 0.2 +
    movementSimilarity * 0.15 +
    stabilitySimilarity * 0.1
  );
}
