import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const onlyIdArg = process.argv.find((arg) => arg.startsWith("--id="));
const limit = limitArg ? Number(limitArg.replace("--limit=", "")) : 25;
const onlyId = onlyIdArg ? onlyIdArg.replace("--id=", "").trim() : "";

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
  await execFileAsync(ffmpegPath, args, {
    maxBuffer: 1024 * 1024 * 20,
  });
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

      await runFfmpeg([
        "-y",
        "-i",
        inputPath,
        "-vn",
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
        inputPath,
        "-vn",
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
    }

    const playbackKey = `${baseKey}/playback/preview.mp3`;
    const hlsBaseKey = `${baseKey}/hls`;
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
  .select("id,title,audio_url,playback_url,hls_url")
  .not("audio_url", "is", null)
  .or("playback_url.is.null,hls_url.is.null")
  .order("created_at", { ascending: false });

if (onlyId) {
  query = query.eq("id", onlyId);
} else if (Number.isFinite(limit) && limit > 0) {
  query = query.limit(limit);
}

const { data: songs, error } = await query;

if (error) throw error;

console.log(`Found ${songs?.length || 0} song${songs?.length === 1 ? "" : "s"} to backfill.`);

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
