import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

import { supabaseServer } from "@/lib/supabaseServer";

export const SONG_RHYTHM_PROFILE_VERSION = "rhythm-profile:5x10s:v1";

const SAMPLE_RATE = 11025;
const WINDOW_SECONDS = 10;
const WINDOW_COUNT = 5;
const BLOCK_SIZE = 512;
const MIN_BPM = 55;
const MAX_BPM = 180;
const MAX_PCM_BYTES = SAMPLE_RATE * WINDOW_SECONDS * 2 + 1024 * 128;
const MAX_BACKFILL_BATCH = 2;
const CACHE_TTL_MS = 60 * 60 * 1000;

type RhythmCandidateRow = {
  song_id?: string | null;
  source_url?: string | null;
};

type RhythmProfileRow = {
  song_id?: string | null;
  onset_density?: number | string | null;
  rhythmic_activity?: number | string | null;
  beat_pattern?: unknown;
  estimated_bpm?: number | string | null;
};

type RhythmStatsRow = {
  published_songs?: number | string | null;
  profiled_songs?: number | string | null;
  pending_songs?: number | string | null;
};

export type RhythmProfile = {
  onsetDensity: number;
  rhythmicActivity: number;
  beatPattern: number[];
  estimatedBpm: number | null;
};

export type RhythmProfileMatch = RhythmProfile & {
  songId: string;
};

export type RhythmProfileStats = {
  publishedSongs: number;
  profiledSongs: number;
  pendingSongs: number;
};

const profileCache = new Map<
  string,
  {
    expiresAt: number;
    profile: RhythmProfile;
  }
>();

let resolvedFfmpegPath: string | null = null;

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

function standardDeviation(values: number[], average = mean(values)) {
  if (values.length === 0) return 0;
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      values.length,
  );
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
      reject(new Error("Rhythm analysis timed out"));
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
        reject(new Error("Decoded audio exceeded the rhythm analysis limit"));
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

function getOnsetEnvelope(samples: Float32Array) {
  const rms: number[] = [];

  for (let start = 0; start < samples.length; start += BLOCK_SIZE) {
    const end = Math.min(samples.length, start + BLOCK_SIZE);
    let energy = 0;

    for (let index = start; index < end; index++) {
      energy += samples[index] * samples[index];
    }

    rms.push(Math.sqrt(energy / Math.max(1, end - start)));
  }

  const positiveChanges = rms
    .slice(1)
    .map((value, index) => Math.max(0, value - rms[index]));
  const changeMean = mean(positiveChanges);
  const changeStd = standardDeviation(positiveChanges, changeMean);
  const threshold = changeMean + changeStd * 0.75;

  return {
    rms,
    onset: positiveChanges,
    threshold,
  };
}

function normalizePattern(values: number[]) {
  const max = Math.max(...values, 0);
  return max > 0 ? values.map((value) => value / max) : values;
}

function analyzeRhythmWindow(samples: Float32Array): RhythmProfile {
  const { rms, onset, threshold } = getOnsetEnvelope(samples);
  const rmsMean = mean(rms);
  const strongOnsets = onset.filter((value) => value >= threshold).length;
  const durationSeconds = samples.length / SAMPLE_RATE;
  const onsetDensity = clamp01(
    strongOnsets / Math.max(durationSeconds * 6, 1),
  );
  const onsetMean = mean(onset);
  const rhythmicActivity =
    onsetMean > 0
      ? clamp01(standardDeviation(onset, onsetMean) / onsetMean / 3)
      : 0;

  const envelopeMean = onsetMean;
  const centered = onset.map((value) => value - envelopeMean);
  const envelopeRate = SAMPLE_RATE / BLOCK_SIZE;
  const beatPattern: number[] = [];

  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm++) {
    const lag = Math.max(1, Math.round((60 * envelopeRate) / bpm));
    let numerator = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;

    for (let index = lag; index < centered.length; index++) {
      const left = centered[index];
      const right = centered[index - lag];
      numerator += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }

    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    beatPattern.push(
      denominator > 0 ? Math.max(0, numerator / denominator) : 0,
    );
  }

  const normalizedPattern = normalizePattern(beatPattern);
  const bestPatternValue = Math.max(...normalizedPattern, 0);
  const bestPatternIndex = normalizedPattern.indexOf(bestPatternValue);

  return {
    onsetDensity,
    rhythmicActivity,
    beatPattern: normalizedPattern,
    estimatedBpm:
      bestPatternValue > 0.08 ? MIN_BPM + bestPatternIndex : null,
  };
}

function averageProfiles(profiles: RhythmProfile[]): RhythmProfile {
  const beatPattern = Array.from(
    { length: MAX_BPM - MIN_BPM + 1 },
    (_, index) => mean(profiles.map((profile) => profile.beatPattern[index] ?? 0)),
  );
  const normalizedPattern = normalizePattern(beatPattern);
  const bestPatternValue = Math.max(...normalizedPattern, 0);
  const bestPatternIndex = normalizedPattern.indexOf(bestPatternValue);

  return {
    onsetDensity: mean(profiles.map((profile) => profile.onsetDensity)),
    rhythmicActivity: mean(
      profiles.map((profile) => profile.rhythmicActivity),
    ),
    beatPattern: normalizedPattern,
    estimatedBpm:
      bestPatternValue > 0.08 ? MIN_BPM + bestPatternIndex : null,
  };
}

export async function createRhythmProfile(sourceUrl: string) {
  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl) throw new Error("Audio URL is required");

  const cached = profileCache.get(cleanUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  const durationSeconds = await getAudioDurationSeconds(cleanUrl);
  const windowStarts = getAnalysisWindowStarts(durationSeconds);
  const profiles: RhythmProfile[] = [];

  for (const startSeconds of windowStarts) {
    const samples = await decodeAudioWindow(cleanUrl, startSeconds);

    if (samples.length === 0) {
      throw new Error("Decoded audio was empty");
    }

    profiles.push(analyzeRhythmWindow(samples));
  }

  const profile = averageProfiles(profiles);

  profileCache.set(cleanUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    profile,
  });

  return profile;
}

function normalizeCandidate(row: RhythmCandidateRow) {
  const songId = String(row.song_id || "").trim();
  const sourceUrl = String(row.source_url || "").trim();

  if (!songId || !sourceUrl) return null;
  return { songId, sourceUrl };
}

function isBeatPattern(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === MAX_BPM - MIN_BPM + 1 &&
    value.every((item) => Number.isFinite(Number(item)))
  );
}

async function upsertRhythmCandidate(candidate: {
  songId: string;
  sourceUrl: string;
}) {
  const profile = await createRhythmProfile(candidate.sourceUrl);

  const { error } = await supabaseServer.rpc(
    "upsert_song_rhythm_profile",
    {
      p_song_id: candidate.songId,
      p_onset_density: profile.onsetDensity,
      p_rhythmic_activity: profile.rhythmicActivity,
      p_beat_pattern: profile.beatPattern,
      p_estimated_bpm: profile.estimatedBpm,
      p_version: SONG_RHYTHM_PROFILE_VERSION,
      p_source_url: candidate.sourceUrl,
    },
  );

  if (error) throw error;
}

export async function ensurePublishedSongRhythmProfiles(limit = 1) {
  const safeLimit = clampInteger(limit, 1, MAX_BACKFILL_BATCH);
  const { data, error } = await supabaseServer.rpc(
    "list_song_rhythm_profile_candidates",
    {
      p_limit: safeLimit,
      p_version: SONG_RHYTHM_PROFILE_VERSION,
    },
  );

  if (error) throw error;

  const candidates = ((data ?? []) as RhythmCandidateRow[]).flatMap((row) => {
    const normalized = normalizeCandidate(row);
    return normalized ? [normalized] : [];
  });

  for (const candidate of candidates) {
    await upsertRhythmCandidate(candidate);
  }

  return candidates.length;
}

export async function refreshPublishedSongRhythmProfile(songId: string) {
  const cleanSongId = songId.trim();
  if (!cleanSongId) return false;

  const { data, error } = await supabaseServer.rpc(
    "get_song_rhythm_profile_candidate",
    {
      p_song_id: cleanSongId,
    },
  );

  if (error) throw error;

  const candidate = ((data ?? []) as RhythmCandidateRow[])
    .map(normalizeCandidate)
    .find((value) => value !== null);

  if (!candidate) return false;

  await upsertRhythmCandidate(candidate);
  return true;
}

export async function getSongRhythmProfileStats(): Promise<RhythmProfileStats> {
  const { data, error } = await supabaseServer.rpc(
    "get_song_rhythm_profile_stats",
    {
      p_version: SONG_RHYTHM_PROFILE_VERSION,
    },
  );

  if (error) throw error;

  const row = ((data ?? []) as RhythmStatsRow[])[0];

  return {
    publishedSongs: Number(row?.published_songs ?? 0),
    profiledSongs: Number(row?.profiled_songs ?? 0),
    pendingSongs: Number(row?.pending_songs ?? 0),
  };
}

export async function getPublishedSongRhythmProfiles(
  songIds: string[],
): Promise<RhythmProfileMatch[]> {
  const cleanSongIds = [...new Set(
    songIds.map((songId) => songId.trim()).filter(Boolean),
  )];

  if (cleanSongIds.length === 0) return [];

  const { data, error } = await supabaseServer.rpc(
    "get_song_rhythm_profiles_by_ids",
    {
      p_song_ids: cleanSongIds,
      p_version: SONG_RHYTHM_PROFILE_VERSION,
    },
  );

  if (error) throw error;

  return ((data ?? []) as RhythmProfileRow[]).flatMap((row) => {
    const songId = String(row.song_id || "").trim();
    const onsetDensity = Number(row.onset_density);
    const rhythmicActivity = Number(row.rhythmic_activity);
    const beatPattern = row.beat_pattern;
    const estimatedBpm = Number(row.estimated_bpm);

    if (
      !songId ||
      !Number.isFinite(onsetDensity) ||
      !Number.isFinite(rhythmicActivity) ||
      !isBeatPattern(beatPattern)
    ) {
      return [];
    }

    return [{
      songId,
      onsetDensity,
      rhythmicActivity,
      beatPattern: beatPattern.map(Number),
      estimatedBpm:
        Number.isFinite(estimatedBpm) && estimatedBpm > 0
          ? estimatedBpm
          : null,
    }];
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
  return denominator > 0 ? clamp01(dot / denominator) : 0;
}

function scalarSimilarity(left: number, right: number, scale: number) {
  return Math.exp(-Math.abs(left - right) / Math.max(scale, 1e-6));
}

export function compareRhythmProfiles(
  reference: RhythmProfile,
  candidate: RhythmProfile,
) {
  const beatPatternSimilarity = cosineSimilarity(
    reference.beatPattern,
    candidate.beatPattern,
  );
  const onsetDensitySimilarity = scalarSimilarity(
    reference.onsetDensity,
    candidate.onsetDensity,
    0.18,
  );
  const activitySimilarity = scalarSimilarity(
    reference.rhythmicActivity,
    candidate.rhythmicActivity,
    0.2,
  );

  return (
    beatPatternSimilarity * 0.5 +
    onsetDensitySimilarity * 0.3 +
    activitySimilarity * 0.2
  );
}
