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
const TARGET_INTEGRATED_LUFS = -14;
const TARGET_TRUE_PEAK_DBTP = -1;
const TARGET_LOUDNESS_RANGE = 11;
const LOUDNESS_TOLERANCE_LU = 0.25;
const TRUE_PEAK_TOLERANCE_DB = 0.1;

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

async function runFfmpeg(args) {
  return execFileAsync(ffmpegPath, args, {
    maxBuffer: 1024 * 1024 * 20,
  });
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
    `loudnorm=I=${TARGET_INTEGRATED_LUFS}:TP=${TARGET_TRUE_PEAK_DBTP}:LRA=${TARGET_LOUDNESS_RANGE}:print_format=json`,
    "-f",
    "null",
    "-",
  ]);

  return parseLoudnessMeasurement(stderr);
}

function makeLoudnessNormalizationFilter(measurement) {
  return [
    `loudnorm=I=${TARGET_INTEGRATED_LUFS}`,
    `TP=${TARGET_TRUE_PEAK_DBTP}`,
    `LRA=${TARGET_LOUDNESS_RANGE}`,
    `measured_I=${measurement.inputI}`,
    `measured_TP=${measurement.inputTp}`,
    `measured_LRA=${measurement.inputLra}`,
    `measured_thresh=${measurement.inputThresh}`,
    `offset=${measurement.targetOffset}`,
    "linear=true",
  ].join(":");
}

async function getLoudnessNormalizationFilter(inputPath) {
  const measurement = await measureLoudness(inputPath);
  return {
    measurement,
    filter: makeLoudnessNormalizationFilter(measurement),
  };
}

function isLoudnessWithinTolerance(measurement) {
  const integratedDifference = Math.abs(
    measurement.inputI - TARGET_INTEGRATED_LUFS,
  );
  const truePeakCeiling = TARGET_TRUE_PEAK_DBTP + TRUE_PEAK_TOLERANCE_DB;

  return (
    integratedDifference <= LOUDNESS_TOLERANCE_LU &&
    measurement.inputTp <= truePeakCeiling
  );
}

async function renderNormalizedIntermediate(inputPath, outputPath) {
  const { measurement, filter } = await getLoudnessNormalizationFilter(inputPath);
  console.log(
    `measured ${measurement.inputI.toFixed(2)} LUFS / ${measurement.inputTp.toFixed(2)} dBTP; target ${TARGET_INTEGRATED_LUFS} LUFS / ${TARGET_TRUE_PEAK_DBTP} dBTP`,
  );

  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-af",
    filter,
    "-ar",
    "48000",
    "-codec:a",
    "flac",
    outputPath,
  ]);
}

async function createVerifiedNormalizedSource(inputPath, tempDir) {
  const normalizedPath = path.join(tempDir, "normalized.flac");
  await renderNormalizedIntermediate(inputPath, normalizedPath);

  const normalizedMeasurement = await measureLoudness(normalizedPath);
  console.log(
    `normalized source ${normalizedMeasurement.inputI.toFixed(2)} LUFS / ${normalizedMeasurement.inputTp.toFixed(2)} dBTP`,
  );

  if (isLoudnessWithinTolerance(normalizedMeasurement)) {
    return normalizedPath;
  }

  console.log("normalized source outside tolerance; running corrective pass");
  const correctedPath = path.join(tempDir, "normalized-corrected.flac");
  await renderNormalizedIntermediate(normalizedPath, correctedPath);

  const correctedMeasurement = await measureLoudness(correctedPath);
  console.log(
    `corrected source ${correctedMeasurement.inputI.toFixed(2)} LUFS / ${correctedMeasurement.inputTp.toFixed(2)} dBTP`,
  );

  if (!isLoudnessWithinTolerance(correctedMeasurement)) {
    throw new Error(
      `Normalized source remained outside tolerance at ${correctedMeasurement.inputI.toFixed(2)} LUFS / ${correctedMeasurement.inputTp.toFixed(2)} dBTP.`,
    );
  }

  return correctedPath;
}

async function verifyNormalizedOutput(outputPath, label) {
  const measurement = await measureLoudness(outputPath);
  const deviation = Math.abs(measurement.inputI - TARGET_INTEGRATED_LUFS);

  console.log(
    `${label} ${measurement.inputI.toFixed(2)} LUFS / ${measurement.inputTp.toFixed(2)} dBTP`,
  );

  if (deviation > LOUDNESS_TOLERANCE_LU) {
    throw new Error(
      `${label} missed target by ${deviation.toFixed(2)} LU (measured ${measurement.inputI.toFixed(2)} LUFS).`,
    );
  }
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
