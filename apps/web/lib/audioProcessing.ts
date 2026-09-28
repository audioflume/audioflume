import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { uploadFileToR2 } from "@/lib/r2";

const execFileAsync = promisify(execFile);
const FFMPEG_EXECUTABLE_NAME = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
const SAMPLE_RATE = 48000;
const BLOCK_SECONDS = 0.1;
const WINDOW_SECONDS = 3;
const HOP_SECONDS = 1;
const MIN_SHORT_TERM_LUFS = -45;
const MIN_WINDOW_RMS_DBFS = -50;
const DENSE_POOL_PERCENTILE = 70;
const REPRESENTATIVE_LOUDNESS_PERCENTILE = 85;
const TARGET_REPRESENTATIVE_SHORT_TERM_LUFS = -11.5;
const TARGET_TRUE_PEAK_DBTP = -1;
const TRUE_PEAK_TOLERANCE_DB = 0.1;

let resolvedFfmpegPath: string | null = null;

type ProcessAudioForStreamingArgs = {
  file: File;
  baseKey: string;
};

type HlsAsset = {
  key: string;
  url: string;
};

type LoudnessMeasurement = {
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
  targetOffset: number;
};

type ShortTermPoint = {
  time: number;
  shortTermLufs: number;
};

type EnergyBlock = {
  sumSquares: number;
  count: number;
  peak: number;
  rmsDbfs: number;
};

type AnalysisWindow = {
  shortTermLufs: number;
  rmsDbfs: number;
  densityScore: number;
};

type PerceptualLoudnessAnalysis = {
  representativeShortTermLufs: number;
  truePeakDbtp: number;
};

type PerceptualNormalizationPlan = PerceptualLoudnessAnalysis & {
  requestedGainDb: number;
  appliedGainDb: number;
  expectedRepresentativeShortTermLufs: number;
};

export type ProcessedAudioAssets = {
  playbackUrl: string;
  playbackKey: string;
  hlsUrl: string;
  hlsKey: string;
  hlsAssetKeys: string[];
  hlsAssets: HlsAsset[];
};

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
    path.join(process.cwd(), "node_modules", "ffmpeg-static", FFMPEG_EXECUTABLE_NAME),
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

function getFileExtension(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  return extension ? `.${extension.toLowerCase()}` : ".audio";
}

function makeFile(parts: BlobPart[], fileName: string, type: string) {
  return new File(parts, fileName, { type });
}

function getHlsContentType(fileName: string) {
  if (fileName.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (fileName.endsWith(".mp4") || fileName.endsWith(".m4s")) return "audio/mp4";
  return "application/octet-stream";
}

async function runFfmpeg(args: string[], maxBuffer = 1024 * 1024 * 20) {
  const ffmpegCommand = await resolveFfmpegPath();

  try {
    return await execFileAsync(ffmpegCommand, args, {
      maxBuffer,
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(
        `FFmpeg binary was not found. Tried ${ffmpegCommand}. Reinstall dependencies or set FFMPEG_PATH to a valid ffmpeg binary.`,
      );
    }

    throw error;
  }
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function linearToDb(value: number) {
  if (!Number.isFinite(value) || value <= 0) return -Infinity;
  return 20 * Math.log10(value);
}

function percentile(values: number[], percentileValue: number) {
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

function parseLoudnessMeasurement(stderr: string): LoudnessMeasurement {
  const jsonMatch = stderr.match(/\{\s*"input_i"[\s\S]*?\}/);

  if (!jsonMatch) {
    throw new Error("FFmpeg did not return loudness analysis data.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
  const measurement: LoudnessMeasurement = {
    inputI: Number(parsed.input_i),
    inputTp: Number(parsed.input_tp),
    inputLra: Number(parsed.input_lra),
    inputThresh: Number(parsed.input_thresh),
    targetOffset: Number(parsed.target_offset),
  };

  if (Object.values(measurement).some((value) => !Number.isFinite(value))) {
    throw new Error("FFmpeg could not measure the uploaded audio loudness.");
  }

  return measurement;
}

async function measureLoudness(inputPath: string) {
  const { stderr } = await runFfmpeg([
    "-hide_banner",
    "-i",
    inputPath,
    "-vn",
    "-af",
    `loudnorm=I=-14:TP=${TARGET_TRUE_PEAK_DBTP}:LRA=11:print_format=json`,
    "-f",
    "null",
    "-",
  ]);

  return parseLoudnessMeasurement(stderr);
}

function parseShortTermTimeline(stderr: string): ShortTermPoint[] {
  const timeline: ShortTermPoint[] = [];

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

async function measureShortTermTimeline(inputPath: string) {
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

async function decodeMonoFloat32(inputPath: string, outputPath: string) {
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

function buildEnergyBlocks(samples: Float32Array): EnergyBlock[] {
  const samplesPerBlock = Math.round(SAMPLE_RATE * BLOCK_SECONDS);
  const blocks: EnergyBlock[] = [];

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
      rmsDbfs: linearToDb(rms),
    });
  }

  return blocks;
}

function nearestShortTermLufs(timeline: ShortTermPoint[], targetTime: number) {
  let nearest: ShortTermPoint | null = null;
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

function buildWindows(blocks: EnergyBlock[], timeline: ShortTermPoint[]): AnalysisWindow[] {
  const blocksPerSecond = Math.round(1 / BLOCK_SECONDS);
  const windowBlocks = Math.round(WINDOW_SECONDS / BLOCK_SECONDS);
  const hopBlocks = Math.round(HOP_SECONDS / BLOCK_SECONDS);
  const windows: AnalysisWindow[] = [];

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
    const shortTermLufs = nearestShortTermLufs(timeline, endTime);

    if (!Number.isFinite(shortTermLufs)) continue;

    windows.push({
      shortTermLufs,
      rmsDbfs,
      densityScore,
    });
  }

  return windows;
}

function getRepresentativeShortTermLufs(windows: AnalysisWindow[]) {
  const validWindows = windows.filter(
    (window) =>
      window.shortTermLufs >= MIN_SHORT_TERM_LUFS &&
      window.rmsDbfs >= MIN_WINDOW_RMS_DBFS,
  );

  if (validWindows.length === 0) {
    throw new Error("No usable 3-second analysis windows were found.");
  }

  const densityThreshold =
    percentile(
      validWindows.map((window) => window.densityScore),
      DENSE_POOL_PERCENTILE,
    ) ?? 0;
  const representativePool = validWindows.filter(
    (window) => window.densityScore >= densityThreshold,
  );
  const representativeShortTermLufs = percentile(
    representativePool.map((window) => window.shortTermLufs),
    REPRESENTATIVE_LOUDNESS_PERCENTILE,
  );

  if (!Number.isFinite(representativeShortTermLufs)) {
    throw new Error("Could not determine representative short-term loudness.");
  }

  return representativeShortTermLufs;
}

async function analyzePerceptualLoudness(
  inputPath: string,
  tempDir: string,
): Promise<PerceptualLoudnessAnalysis> {
  const pcmPath = path.join(tempDir, "perceptual-analysis.f32");
  const [measurement, timeline] = await Promise.all([
    measureLoudness(inputPath),
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

  return {
    representativeShortTermLufs: getRepresentativeShortTermLufs(windows),
    truePeakDbtp: measurement.inputTp,
  };
}

async function getPerceptualNormalizationPlan(
  inputPath: string,
  tempDir: string,
): Promise<PerceptualNormalizationPlan> {
  const analysis = await analyzePerceptualLoudness(inputPath, tempDir);
  const requestedGainDb =
    TARGET_REPRESENTATIVE_SHORT_TERM_LUFS - analysis.representativeShortTermLufs;
  const truePeakLimitedGainDb = TARGET_TRUE_PEAK_DBTP - analysis.truePeakDbtp;
  const appliedGainDb = Math.min(requestedGainDb, truePeakLimitedGainDb);

  return {
    ...analysis,
    requestedGainDb,
    appliedGainDb,
    expectedRepresentativeShortTermLufs:
      analysis.representativeShortTermLufs + appliedGainDb,
  };
}

async function renderNormalizedIntermediate(
  inputPath: string,
  outputPath: string,
  gainDb: number,
) {
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-af",
    `volume=${gainDb.toFixed(4)}dB`,
    "-ar",
    String(SAMPLE_RATE),
    "-codec:a",
    "flac",
    outputPath,
  ]);
}

async function createVerifiedNormalizedSource(inputPath: string, tempDir: string) {
  const plan = await getPerceptualNormalizationPlan(inputPath, tempDir);
  const normalizedPath = path.join(tempDir, "normalized.flac");
  await renderNormalizedIntermediate(inputPath, normalizedPath, plan.appliedGainDb);

  const normalizedMeasurement = await measureLoudness(normalizedPath);
  const truePeakCeiling = TARGET_TRUE_PEAK_DBTP + TRUE_PEAK_TOLERANCE_DB;
  if (normalizedMeasurement.inputTp <= truePeakCeiling) {
    return normalizedPath;
  }

  const correctionGainDb = TARGET_TRUE_PEAK_DBTP - normalizedMeasurement.inputTp;
  const correctedPath = path.join(tempDir, "normalized-corrected.flac");
  await renderNormalizedIntermediate(normalizedPath, correctedPath, correctionGainDb);

  const correctedMeasurement = await measureLoudness(correctedPath);
  if (correctedMeasurement.inputTp > truePeakCeiling) {
    console.warn("Audio perceptual loudness normalization exceeded true-peak tolerance", {
      truePeakDbtp: correctedMeasurement.inputTp,
      targetTruePeakDbtp: TARGET_TRUE_PEAK_DBTP,
    });
  }

  return correctedPath;
}

export async function processAudioForStreaming({
  file,
  baseKey,
}: ProcessAudioForStreamingArgs): Promise<ProcessedAudioAssets> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "filmwave-audio-"));

  try {
    const inputPath = path.join(tempDir, `source${getFileExtension(file.name)}`);
    const previewPath = path.join(tempDir, "preview.mp3");
    const hlsDir = path.join(tempDir, "hls");
    const hlsManifestPath = path.join(hlsDir, "index.m3u8");

    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    await mkdtemp(`${hlsDir}-`);
    await rm(hlsDir, { force: true, recursive: true });
    await import("node:fs/promises").then(({ mkdir }) => mkdir(hlsDir, { recursive: true }));

    const normalizedSourcePath = await createVerifiedNormalizedSource(inputPath, tempDir);

    await runFfmpeg([
      "-y",
      "-i",
      normalizedSourcePath,
      "-vn",
      "-ar",
      "48000",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "320k",
      "-write_xing",
      "1",
      previewPath,
    ]);

    await runFfmpeg([
      "-y",
      "-i",
      normalizedSourcePath,
      "-vn",
      "-ar",
      "48000",
      "-codec:a",
      "aac",
      "-b:a",
      "192k",
      "-hls_time",
      "6",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_type",
      "fmp4",
      "-hls_fmp4_init_filename",
      "init.mp4",
      "-hls_segment_filename",
      path.join(hlsDir, "segment_%03d.m4s"),
      hlsManifestPath,
    ]);

    const cleanBaseKey = baseKey.replace(/^\/+|\/+$/g, "");
    const playbackKey = `${cleanBaseKey}/playback/preview.mp3`;
    const hlsBaseKey = `${cleanBaseKey}/hls`;
    const hlsKey = `${hlsBaseKey}/index.m3u8`;

    const playbackBuffer = await readFile(previewPath);
    const playbackUrl = await uploadFileToR2({
      file: makeFile([playbackBuffer], "preview.mp3", "audio/mpeg"),
      key: playbackKey,
    });

    const hlsFileNames = (await readdir(hlsDir)).sort((a, b) => {
      if (a === "index.m3u8") return 1;
      if (b === "index.m3u8") return -1;
      return a.localeCompare(b);
    });

    const hlsAssets: HlsAsset[] = [];
    let hlsUrl = "";

    for (const fileName of hlsFileNames) {
      const buffer = await readFile(path.join(hlsDir, fileName));
      const key = `${hlsBaseKey}/${fileName}`;
      const url = await uploadFileToR2({
        file: makeFile([buffer], fileName, getHlsContentType(fileName)),
        key,
      });

      hlsAssets.push({ key, url });

      if (fileName === "index.m3u8") {
        hlsUrl = url;
      }
    }

    if (!hlsUrl) {
      throw new Error("HLS manifest was not generated.");
    }

    return {
      playbackUrl,
      playbackKey,
      hlsUrl,
      hlsKey,
      hlsAssetKeys: hlsAssets.map((asset) => asset.key),
      hlsAssets,
    };
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}
