import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

dotenv.config({ path: ".env.local" });
dotenv.config();

const execFileAsync = promisify(execFile);
const SAMPLE_RATE = 48000;
const BLOCK_SECONDS = 0.1;
const WINDOW_SECONDS = 3;
const HOP_SECONDS = 1;
const MIN_SHORT_TERM_LUFS = -45;
const MIN_WINDOW_RMS_DBFS = -50;
const DENSE_POOL_PERCENTILE = 70;
const REPRESENTATIVE_LOUDNESS_PERCENTILE = 85;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const onlyIdArg = process.argv.find((arg) => arg.startsWith("--id="));
const statusArg = process.argv.find((arg) => arg.startsWith("--status="));
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));

const limit = limitArg ? Number(limitArg.replace("--limit=", "")) : 1000;
const onlyId = onlyIdArg ? onlyIdArg.replace("--id=", "").trim() : "";
const status = statusArg ? statusArg.replace("--status=", "").trim() : "published";
const outputPath = outputArg
  ? path.resolve(outputArg.replace("--output=", "").trim())
  : path.resolve("perceptual-loudness-analysis.csv");

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!ffmpegPath) throw new Error("ffmpeg-static did not resolve a binary path");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function linearToDb(value) {
  if (!Number.isFinite(value) || value <= 0) return -Infinity;
  return 20 * Math.log10(value);
}

function percentile(values, percentileValue) {
  const finiteValues = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (finiteValues.length === 0) return null;
  if (finiteValues.length === 1) return finiteValues[0];

  const index = (percentileValue / 100) * (finiteValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) return finiteValues[lower];

  return finiteValues[lower] + (finiteValues[upper] - finiteValues[lower]) * fraction;
}

function csvEscape(value) {
  if (value == null) return "";
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function getExtensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop() || "source.audio";
    const extension = filename.includes(".") ? filename.split(".").pop() : "audio";
    return `.${extension.toLowerCase()}`;
  } catch {
    return ".audio";
  }
}

async function runFfmpeg(args, maxBuffer = 1024 * 1024 * 40) {
  return execFileAsync(ffmpegPath, args, { maxBuffer });
}

function parseLoudnormMeasurement(stderr) {
  const jsonMatches = [...stderr.matchAll(/\{\s*"input_i"[\s\S]*?\}/g)];
  const jsonMatch = jsonMatches.at(-1)?.[0];

  if (!jsonMatch) {
    throw new Error("FFmpeg did not return loudness analysis data.");
  }

  const parsed = JSON.parse(jsonMatch);
  const measurement = {
    integratedLufs: Number(parsed.input_i),
    truePeakDbtp: Number(parsed.input_tp),
    loudnessRangeLu: Number(parsed.input_lra),
    thresholdLufs: Number(parsed.input_thresh),
  };

  if (Object.values(measurement).some((value) => !Number.isFinite(value))) {
    throw new Error("FFmpeg could not measure loudness for this source.");
  }

  return measurement;
}

async function measureIntegratedLoudness(inputPath) {
  const { stderr } = await runFfmpeg([
    "-hide_banner",
    "-i",
    inputPath,
    "-vn",
    "-af",
    "loudnorm=I=-14:TP=-1:LRA=11:print_format=json",
    "-f",
    "null",
    "-",
  ]);

  return parseLoudnormMeasurement(stderr);
}

function parseShortTermTimeline(stderr) {
  const timeline = [];

  for (const line of stderr.split("\n")) {
    const timeMatch = line.match(/\bt:\s*([0-9]+(?:\.[0-9]+)?)/);
    const shortTermMatch = line.match(/\bS:\s*(-?(?:[0-9]+(?:\.[0-9]+)?|inf))/i);

    if (!timeMatch || !shortTermMatch) continue;

    const time = Number(timeMatch[1]);
    const shortTermLufs = Number(shortTermMatch[1]);

    if (!Number.isFinite(time) || !Number.isFinite(shortTermLufs)) continue;

    timeline.push({ time, shortTermLufs });
  }

  if (timeline.length === 0) {
    throw new Error("FFmpeg did not return a short-term LUFS timeline.");
  }

  return timeline;
}

async function measureShortTermTimeline(inputPath) {
  const { stderr } = await runFfmpeg(
    [
      "-hide_banner",
      "-loglevel",
      "verbose",
      "-i",
      inputPath,
      "-vn",
      "-filter_complex",
      "ebur128=framelog=verbose",
      "-f",
      "null",
      "-",
    ],
    1024 * 1024 * 80,
  );

  return parseShortTermTimeline(stderr);
}

async function decodeMonoFloat32(inputPath, outputPath) {
  await runFfmpeg([
    "-y",
    "-hide_banner",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    String(SAMPLE_RATE),
    "-f",
    "f32le",
    outputPath,
  ]);
}

function buildEnergyBlocks(samples) {
  const samplesPerBlock = Math.round(SAMPLE_RATE * BLOCK_SECONDS);
  const blocks = [];

  for (let start = 0; start < samples.length; start += samplesPerBlock) {
    const end = Math.min(samples.length, start + samplesPerBlock);
    let sumSquares = 0;
    let peak = 0;

    for (let index = start; index < end; index += 1) {
      const sample = samples[index];
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }

    const count = end - start;
    const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;

    blocks.push({
      sumSquares,
      count,
      peak,
      rms,
      rmsDbfs: linearToDb(rms),
    });
  }

  return blocks;
}

function nearestShortTermLufs(timeline, targetTime) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const point of timeline) {
    const distance = Math.abs(point.time - targetTime);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  if (!nearest || nearestDistance > 0.75) return null;
  return nearest.shortTermLufs;
}

function buildWindows(blocks, timeline) {
  const blocksPerSecond = Math.round(1 / BLOCK_SECONDS);
  const windowBlocks = Math.round(WINDOW_SECONDS / BLOCK_SECONDS);
  const hopBlocks = Math.round(HOP_SECONDS / BLOCK_SECONDS);
  const windows = [];

  for (let endBlock = windowBlocks; endBlock <= blocks.length; endBlock += hopBlocks) {
    const startBlock = endBlock - windowBlocks;
    const window = blocks.slice(startBlock, endBlock);
    if (window.length < windowBlocks) continue;

    const totalSquares = window.reduce((sum, block) => sum + block.sumSquares, 0);
    const totalSamples = window.reduce((sum, block) => sum + block.count, 0);
    const peak = window.reduce((max, block) => Math.max(max, block.peak), 0);
    const rms = totalSamples > 0 ? Math.sqrt(totalSquares / totalSamples) : 0;
    const rmsDbfs = linearToDb(rms);
    const crestDb = rms > 0 && peak > 0 ? 20 * Math.log10(peak / rms) : Infinity;

    const blockDbValues = window.map((block) => block.rmsDbfs).filter(Number.isFinite);
    const maxBlockDb = blockDbValues.length > 0 ? Math.max(...blockDbValues) : -Infinity;
    const active12Ratio =
      blockDbValues.length > 0
        ? blockDbValues.filter((value) => value >= maxBlockDb - 12).length / blockDbValues.length
        : 0;
    const active6Ratio =
      blockDbValues.length > 0
        ? blockDbValues.filter((value) => value >= maxBlockDb - 6).length / blockDbValues.length
        : 0;
    const crestDensity = Number.isFinite(crestDb) ? clamp((18 - crestDb) / 15) : 0;
    const densityScore = clamp(
      active12Ratio * 0.45 + active6Ratio * 0.3 + crestDensity * 0.25,
    );

    const endTime = endBlock / blocksPerSecond;
    const startTime = startBlock / blocksPerSecond;
    const shortTermLufs = nearestShortTermLufs(timeline, endTime);

    if (!Number.isFinite(shortTermLufs)) continue;

    windows.push({
      startTime,
      endTime,
      shortTermLufs,
      rmsDbfs,
      crestDb,
      active12Ratio,
      active6Ratio,
      densityScore,
    });
  }

  return windows;
}

function bandPercentile(windows, minDensity, maxDensity) {
  const matching = windows.filter(
    (window) => window.densityScore >= minDensity && window.densityScore < maxDensity,
  );

  if (matching.length < 2) {
    return { count: matching.length, loudness: null };
  }

  return {
    count: matching.length,
    loudness: percentile(
      matching.map((window) => window.shortTermLufs),
      REPRESENTATIVE_LOUDNESS_PERCENTILE,
    ),
  };
}

function summarizeWindows(windows) {
  const validWindows = windows.filter(
    (window) =>
      window.shortTermLufs >= MIN_SHORT_TERM_LUFS &&
      window.rmsDbfs >= MIN_WINDOW_RMS_DBFS,
  );

  if (validWindows.length === 0) {
    throw new Error("No usable 3-second analysis windows were found.");
  }

  const densityValues = validWindows.map((window) => window.densityScore);
  const densityThreshold = percentile(densityValues, DENSE_POOL_PERCENTILE) ?? 0;
  const representativePool = validWindows.filter(
    (window) => window.densityScore >= densityThreshold,
  );

  const representativeShortTermLufs = percentile(
    representativePool.map((window) => window.shortTermLufs),
    REPRESENTATIVE_LOUDNESS_PERCENTILE,
  );

  const loudestWindow = [...validWindows].sort(
    (a, b) => b.shortTermLufs - a.shortTermLufs,
  )[0];

  const sparse = bandPercentile(validWindows, 0, 0.35);
  const open = bandPercentile(validWindows, 0.35, 0.55);
  const full = bandPercentile(validWindows, 0.55, 0.75);
  const dense = bandPercentile(validWindows, 0.75, 1.01);

  return {
    validWindows,
    densityP50: percentile(densityValues, 50),
    densityP75: percentile(densityValues, 75),
    densityP90: percentile(densityValues, 90),
    representativePoolSize: representativePool.length,
    representativeShortTermLufs,
    loudShortTermP95: percentile(
      validWindows.map((window) => window.shortTermLufs),
      95,
    ),
    loudestWindow,
    sparse,
    open,
    full,
    dense,
  };
}

async function downloadAudio(audioUrl, inputPath) {
  const response = await fetch(audioUrl);

  if (!response.ok) {
    throw new Error(`Download failed with ${response.status} for ${audioUrl}`);
  }

  await writeFile(inputPath, Buffer.from(await response.arrayBuffer()));
}

async function analyzeSong(song) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "audioflume-perceptual-loudness-"));

  try {
    const inputPath = path.join(tempDir, `source${getExtensionFromUrl(song.audio_url)}`);
    const pcmPath = path.join(tempDir, "mono.f32");

    console.log(`\nAnalyzing ${song.title || "Untitled"} — ${song.artist || "Unknown artist"}`);
    await downloadAudio(song.audio_url, inputPath);

    const [integrated, timeline] = await Promise.all([
      measureIntegratedLoudness(inputPath),
      measureShortTermTimeline(inputPath),
    ]);

    await decodeMonoFloat32(inputPath, pcmPath);
    const pcmBuffer = await readFile(pcmPath);
    const sampleCount = Math.floor(pcmBuffer.byteLength / 4);
    const samples = new Float32Array(
      pcmBuffer.buffer,
      pcmBuffer.byteOffset,
      sampleCount,
    );

    const blocks = buildEnergyBlocks(samples);
    const windows = buildWindows(blocks, timeline);
    const summary = summarizeWindows(windows);
    const durationSeconds = samples.length / SAMPLE_RATE;

    console.log(
      `  integrated ${integrated.integratedLufs.toFixed(2)} LUFS | ` +
        `true peak ${integrated.truePeakDbtp.toFixed(2)} dBTP`,
    );
    console.log(
      `  representative ${summary.representativeShortTermLufs?.toFixed(2)} LUFS | ` +
        `density p75 ${summary.densityP75?.toFixed(3)} | ` +
        `${summary.validWindows.length} valid windows`,
    );

    return {
      id: song.id,
      title: song.title || "",
      artist: song.artist || "",
      durationSeconds,
      integratedLufs: integrated.integratedLufs,
      truePeakDbtp: integrated.truePeakDbtp,
      loudnessRangeLu: integrated.loudnessRangeLu,
      validWindowCount: summary.validWindows.length,
      densityP50: summary.densityP50,
      densityP75: summary.densityP75,
      densityP90: summary.densityP90,
      representativePoolSize: summary.representativePoolSize,
      representativeShortTermLufs: summary.representativeShortTermLufs,
      loudShortTermP95: summary.loudShortTermP95,
      loudestWindowStart: summary.loudestWindow.startTime,
      loudestWindowEnd: summary.loudestWindow.endTime,
      loudestWindowLufs: summary.loudestWindow.shortTermLufs,
      loudestWindowDensity: summary.loudestWindow.densityScore,
      sparseWindowCount: summary.sparse.count,
      sparseP85Lufs: summary.sparse.loudness,
      openWindowCount: summary.open.count,
      openP85Lufs: summary.open.loudness,
      fullWindowCount: summary.full.count,
      fullP85Lufs: summary.full.loudness,
      denseWindowCount: summary.dense.count,
      denseP85Lufs: summary.dense.loudness,
    };
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

const headers = [
  "id",
  "title",
  "artist",
  "duration_seconds",
  "integrated_lufs",
  "true_peak_dbtp",
  "loudness_range_lu",
  "valid_window_count",
  "density_p50",
  "density_p75",
  "density_p90",
  "representative_pool_size",
  "representative_short_term_lufs",
  "loud_short_term_p95",
  "loudest_window_start",
  "loudest_window_end",
  "loudest_window_lufs",
  "loudest_window_density",
  "sparse_window_count",
  "sparse_p85_lufs",
  "open_window_count",
  "open_p85_lufs",
  "full_window_count",
  "full_p85_lufs",
  "dense_window_count",
  "dense_p85_lufs",
];

function resultToCsvRow(result) {
  const values = [
    result.id,
    result.title,
    result.artist,
    result.durationSeconds?.toFixed(2),
    result.integratedLufs?.toFixed(2),
    result.truePeakDbtp?.toFixed(2),
    result.loudnessRangeLu?.toFixed(2),
    result.validWindowCount,
    result.densityP50?.toFixed(4),
    result.densityP75?.toFixed(4),
    result.densityP90?.toFixed(4),
    result.representativePoolSize,
    result.representativeShortTermLufs?.toFixed(2),
    result.loudShortTermP95?.toFixed(2),
    result.loudestWindowStart?.toFixed(2),
    result.loudestWindowEnd?.toFixed(2),
    result.loudestWindowLufs?.toFixed(2),
    result.loudestWindowDensity?.toFixed(4),
    result.sparseWindowCount,
    result.sparseP85Lufs?.toFixed(2),
    result.openWindowCount,
    result.openP85Lufs?.toFixed(2),
    result.fullWindowCount,
    result.fullP85Lufs?.toFixed(2),
    result.denseWindowCount,
    result.denseP85Lufs?.toFixed(2),
  ];

  return values.map(csvEscape).join(",");
}

let query = supabase
  .from("songs")
  .select("id,title,artist,audio_url,status,created_at")
  .not("audio_url", "is", null)
  .order("created_at", { ascending: false });

if (status) {
  query = query.eq("status", status);
}

if (onlyId) {
  query = query.eq("id", onlyId);
} else if (Number.isFinite(limit) && limit > 0) {
  query = query.limit(limit);
}

const { data: songs, error } = await query;
if (error) throw error;

console.log(
  `Found ${songs?.length || 0} ${status || "matching"} song${songs?.length === 1 ? "" : "s"} to analyze.`,
);
console.log(
  `Windows: ${WINDOW_SECONDS}s, hop: ${HOP_SECONDS}s, density pool: top ${100 - DENSE_POOL_PERCENTILE}%`,
);
console.log("Read-only analysis: no audio files or database rows will be changed.");

const results = [];
let failed = 0;

for (const song of songs || []) {
  try {
    results.push(await analyzeSong(song));
  } catch (err) {
    failed += 1;
    console.error(`Failed ${song.id} — ${song.title || "Untitled"}`, err);
  }
}

const csv = [headers.join(","), ...results.map(resultToCsvRow)].join("\n") + "\n";
await writeFile(outputPath, csv, "utf8");

console.log(`\nAnalysis complete. success=${results.length} failed=${failed}`);
console.log(`CSV: ${outputPath}`);

if (failed > 0) {
  process.exitCode = 1;
}
