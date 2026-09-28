import dotenv from "dotenv";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
const TARGET_INTEGRATED_LUFS = -14;
const MIN_REPRESENTATIVE_SHORT_TERM_LUFS = -14;
const MAX_REPRESENTATIVE_SHORT_TERM_LUFS = -11.5;
const TARGET_TRUE_PEAK_DBTP = -1;
const LIMITER_CEILING_DBFS = -1.2;
const MAX_LIMITER_REDUCTION_DB = 3;
const LIMITER_ATTACK_MS = 5;
const LIMITER_RELEASE_MS = 50;
const TRUE_PEAK_TOLERANCE_DB = 0.1;
const LIMITER_LIMIT_LINEAR = Math.pow(10, LIMITER_CEILING_DBFS / 20);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const onlyIdArg = process.argv.find((arg) => arg.startsWith("--id="));
const statusArg = process.argv.find((arg) => arg.startsWith("--status="));
const limit = limitArg ? Number(limitArg.replace("--limit=", "")) : 25;
const onlyId = onlyIdArg ? onlyIdArg.replace("--id=", "").trim() : "";
const status = statusArg ? statusArg.replace("--status=", "").trim() : "";
const streamingVersion = `normalized-${Date.now()}`;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!accountId) throw new Error("Missing CLOUDFLARE_R2_ACCOUNT_ID");
if (!accessKeyId) throw new Error("Missing CLOUDFLARE_R2_ACCESS_KEY_ID");
if (!secretAccessKey) throw new Error("Missing CLOUDFLARE_R2_SECRET_ACCESS_KEY");
if (!bucketName) throw new Error("Missing CLOUDFLARE_R2_BUCKET_NAME");
if (!publicUrl) throw new Error("Missing CLOUDFLARE_R2_PUBLIC_URL");
if (!ffmpegPath) throw new Error("ffmpeg-static did not resolve a binary path");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const publicBaseUrl = publicUrl.replace(/\/$/, "");

function buildPublicUrl(key) {
  return `${publicBaseUrl}/${key.replace(/^\//, "")}`;
}

function getContentType(fileName) {
  const cleanFileName = fileName.toLowerCase();

  if (cleanFileName.endsWith(".mp3")) return "audio/mpeg";
  if (cleanFileName.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (cleanFileName.endsWith(".mp4")) return "audio/mp4";
  if (cleanFileName.endsWith(".m4s")) return "audio/mp4";

  return "application/octet-stream";
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

function getBaseKeyFromAudioUrl(audioUrl) {
  const url = new URL(audioUrl);
  const pathParts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const audioIndex = pathParts.indexOf("audio");

  if (audioIndex <= 0) {
    throw new Error(`Could not infer base R2 key from audio URL: ${audioUrl}`);
  }

  return pathParts.slice(0, audioIndex).join("/");
}

async function runFfmpeg(args, maxBuffer = 1024 * 1024 * 20) {
  return execFileAsync(ffmpegPath, args, {
    maxBuffer,
  });
}

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

function parseLoudnessMeasurement(stderr) {
  const jsonMatch = stderr.match(/\{\s*"input_i"[\s\S]*?\}/);

  if (!jsonMatch) {
    throw new Error("FFmpeg did not return loudness analysis data.");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const measurement = {
    inputI: Number(parsed.input_i),
    inputTp: Number(parsed.input_tp),
    inputLra: Number(parsed.input_lra),
    inputThresh: Number(parsed.input_thresh),
    targetOffset: Number(parsed.target_offset),
  };

  if (Object.values(measurement).some((value) => !Number.isFinite(value))) {
    throw new Error("FFmpeg could not measure the source audio loudness.");
  }

  return measurement;
}

async function measureLoudness(inputPath) {
  const { stderr } = await runFfmpeg([
    "-hide_banner",
    "-i",
    inputPath,
    "-vn",
    "-af",
    `loudnorm=I=${TARGET_INTEGRATED_LUFS}:TP=${TARGET_TRUE_PEAK_DBTP}:LRA=11:print_format=json`,
    "-f",
    "null",
    "-",
  ]);

  return parseLoudnessMeasurement(stderr);
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

function getRepresentativeShortTermLufs(windows) {
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

async function analyzePerceptualLoudness(inputPath, tempDir) {
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
    integratedLufs: measurement.inputI,
    representativeShortTermLufs: getRepresentativeShortTermLufs(windows),
    truePeakDbtp: measurement.inputTp,
  };
}

async function getPerceptualNormalizationPlan(inputPath, tempDir) {
  const analysis = await analyzePerceptualLoudness(inputPath, tempDir);
  const baselineGainDb = TARGET_INTEGRATED_LUFS - analysis.integratedLufs;
  const baselineRepresentativeShortTermLufs =
    analysis.representativeShortTermLufs + baselineGainDb;

  let requestedGainDb = baselineGainDb;

  if (baselineRepresentativeShortTermLufs > MAX_REPRESENTATIVE_SHORT_TERM_LUFS) {
    requestedGainDb -=
      baselineRepresentativeShortTermLufs - MAX_REPRESENTATIVE_SHORT_TERM_LUFS;
  } else if (baselineRepresentativeShortTermLufs < MIN_REPRESENTATIVE_SHORT_TERM_LUFS) {
    requestedGainDb +=
      MIN_REPRESENTATIVE_SHORT_TERM_LUFS - baselineRepresentativeShortTermLufs;
  }

  const maxGainWithLimiterDb =
    TARGET_TRUE_PEAK_DBTP - analysis.truePeakDbtp + MAX_LIMITER_REDUCTION_DB;
  const appliedGainDb = Math.min(requestedGainDb, maxGainWithLimiterDb);
  const predictedPeakBeforeLimiterDbtp = analysis.truePeakDbtp + appliedGainDb;
  const expectedLimiterReductionDb = Math.max(
    0,
    predictedPeakBeforeLimiterDbtp - TARGET_TRUE_PEAK_DBTP,
  );

  return {
    ...analysis,
    baselineGainDb,
    requestedGainDb,
    appliedGainDb,
    expectedLimiterReductionDb,
    expectedIntegratedLufs: analysis.integratedLufs + appliedGainDb,
    expectedRepresentativeShortTermLufs:
      analysis.representativeShortTermLufs + appliedGainDb,
    limiterCapped: requestedGainDb > maxGainWithLimiterDb + 0.001,
  };
}

async function renderNormalizedIntermediate(inputPath, outputPath, gainDb, useLimiter) {
  const filters = [`volume=${gainDb.toFixed(4)}dB`];

  if (useLimiter) {
    filters.push(
      `alimiter=limit=${LIMITER_LIMIT_LINEAR.toFixed(6)}:attack=${LIMITER_ATTACK_MS}:release=${LIMITER_RELEASE_MS}:level=false:latency=true`,
    );
  }

  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-af",
    filters.join(","),
    "-ar",
    String(SAMPLE_RATE),
    "-codec:a",
    "flac",
    outputPath,
  ]);
}

async function createVerifiedNormalizedSource(inputPath, tempDir) {
  const plan = await getPerceptualNormalizationPlan(inputPath, tempDir);
  console.log(
    `integrated ${plan.integratedLufs.toFixed(2)} LUFS | representative ${plan.representativeShortTermLufs.toFixed(2)} LUFS | true peak ${plan.truePeakDbtp.toFixed(2)} dBTP`,
  );
  console.log(
    `baseline ${plan.baselineGainDb.toFixed(2)} dB | requested ${plan.requestedGainDb.toFixed(2)} dB | applying ${plan.appliedGainDb.toFixed(2)} dB | expected limiter ${plan.expectedLimiterReductionDb.toFixed(2)} dB`,
  );

  if (plan.limiterCapped) {
    console.warn(
      `limiter budget reached; capped at ${MAX_LIMITER_REDUCTION_DB.toFixed(1)} dB instead of forcing the loudness target`,
    );
  }

  const normalizedPath = path.join(tempDir, "normalized.flac");
  await renderNormalizedIntermediate(
    inputPath,
    normalizedPath,
    plan.appliedGainDb,
    plan.expectedLimiterReductionDb > 0.01,
  );

  const normalizedMeasurement = await measureLoudness(normalizedPath);
  const truePeakCeiling = TARGET_TRUE_PEAK_DBTP + TRUE_PEAK_TOLERANCE_DB;
  console.log(
    `normalized source ${normalizedMeasurement.inputI.toFixed(2)} LUFS / ${normalizedMeasurement.inputTp.toFixed(2)} dBTP | expected representative ${plan.expectedRepresentativeShortTermLufs.toFixed(2)} LUFS`,
  );

  if (normalizedMeasurement.inputTp <= truePeakCeiling) {
    return normalizedPath;
  }

  console.log("normalized source exceeded true-peak tolerance; running corrective gain pass");
  const correctionGainDb = TARGET_TRUE_PEAK_DBTP - normalizedMeasurement.inputTp;
  const correctedPath = path.join(tempDir, "normalized-corrected.flac");
  await renderNormalizedIntermediate(normalizedPath, correctedPath, correctionGainDb, false);

  const correctedMeasurement = await measureLoudness(correctedPath);
  console.log(
    `corrected source ${correctedMeasurement.inputI.toFixed(2)} LUFS / ${correctedMeasurement.inputTp.toFixed(2)} dBTP`,
  );

  if (correctedMeasurement.inputTp > truePeakCeiling) {
    throw new Error(
      `Normalized source exceeded true-peak tolerance at ${correctedMeasurement.inputTp.toFixed(2)} dBTP.`,
    );
  }

  return correctedPath;
}

async function verifyNormalizedOutput(outputPath, label) {
  const measurement = await measureLoudness(outputPath);
  console.log(`${label} ${measurement.inputI.toFixed(2)} LUFS / ${measurement.inputTp.toFixed(2)} dBTP`);
}

async function uploadBufferToR2({ key, buffer, contentType }) {
  if (dryRun) {
    console.log(`dry-run upload ${key}`);
    return buildPublicUrl(key);
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return buildPublicUrl(key);
}

async function downloadAudio(audioUrl, inputPath) {
  const res = await fetch(audioUrl);

  if (!res.ok) {
    throw new Error(`Download failed with ${res.status} for ${audioUrl}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  await writeFile(inputPath, Buffer.from(arrayBuffer));
}

async function processSong(song) {
  const baseKey = getBaseKeyFromAudioUrl(song.audio_url);
  const streamingBaseKey = `${baseKey}/streaming/${streamingVersion}`;
  const tempDir = await mkdtemp(path.join(tmpdir(), "filmwave-streaming-backfill-"));

  try {
    const inputPath = path.join(tempDir, `source${getExtensionFromUrl(song.audio_url)}`);
    const previewPath = path.join(tempDir, "preview.mp3");
    const hlsDir = path.join(tempDir, "hls");
    const hlsManifestPath = path.join(hlsDir, "index.m3u8");

    await mkdir(hlsDir, { recursive: true });
    console.log(`processing ${song.id} — ${song.title || "Untitled"}`);

    if (!dryRun) {
      await downloadAudio(song.audio_url, inputPath);
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

      await verifyNormalizedOutput(previewPath, "normalized preview");

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

      await verifyNormalizedOutput(hlsManifestPath, "normalized HLS");
    }

    const playbackKey = `${streamingBaseKey}/playback/preview.mp3`;
    const hlsBaseKey = `${streamingBaseKey}/hls`;
    const hlsKey = `${hlsBaseKey}/index.m3u8`;

    const playbackUrl = await uploadBufferToR2({
      key: playbackKey,
      buffer: dryRun ? Buffer.from("") : await readFile(previewPath),
      contentType: "audio/mpeg",
    });

    if (!dryRun) {
      const hlsFileNames = (await readdir(hlsDir)).sort((a, b) => {
        if (a === "index.m3u8") return 1;
        if (b === "index.m3u8") return -1;
        return a.localeCompare(b);
      });

      for (const fileName of hlsFileNames) {
        const key = `${hlsBaseKey}/${fileName}`;
        await uploadBufferToR2({
          key,
          buffer: await readFile(path.join(hlsDir, fileName)),
          contentType: getContentType(fileName),
        });
      }
    } else {
      console.log(`dry-run upload ${hlsKey}`);
      console.log(`dry-run upload ${hlsBaseKey}/init.mp4`);
      console.log(`dry-run upload ${hlsBaseKey}/segment_000.m4s ...`);
    }

    const hlsUrl = buildPublicUrl(hlsKey);

    if (dryRun) {
      console.log(`dry-run update songs ${song.id}: playback_url=${playbackUrl}, hls_url=${hlsUrl}`);
      return;
    }

    const { error } = await supabase
      .from("songs")
      .update({
        playback_url: playbackUrl,
        hls_url: hlsUrl,
      })
      .eq("id", song.id);

    if (error) throw error;

    console.log(`updated ${song.id}`);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

let query = supabase
  .from("songs")
  .select("id,title,status,audio_url,playback_url,hls_url")
  .not("audio_url", "is", null)
  .order("created_at", { ascending: false });

if (!force) {
  query = query.or("playback_url.is.null,hls_url.is.null");
}

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

console.log(`Found ${songs?.length || 0} song${songs?.length === 1 ? "" : "s"} to ${force ? "regenerate" : "backfill"}.`);
if (status) console.log(`Status filter: ${status}`);
console.log(`Streaming version: ${streamingVersion}`);

let failed = 0;

for (const song of songs || []) {
  try {
    await processSong(song);
  } catch (err) {
    failed += 1;
    console.error(`failed ${song.id}`, err);
  }
}

console.log(`Done. failed=${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
