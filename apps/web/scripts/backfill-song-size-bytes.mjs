import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const dryRun = process.argv.includes("--dry-run");

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!accountId) throw new Error("Missing CLOUDFLARE_R2_ACCOUNT_ID");
if (!accessKeyId) throw new Error("Missing CLOUDFLARE_R2_ACCESS_KEY_ID");
if (!secretAccessKey) throw new Error("Missing CLOUDFLARE_R2_SECRET_ACCESS_KEY");
if (!bucketName) throw new Error("Missing CLOUDFLARE_R2_BUCKET_NAME");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function getR2KeyFromUrl(url) {
  const pathname = new URL(url).pathname;
  return decodeURIComponent(pathname.replace(/^\/+/, ""));
}

function getSongUrl(song) {
  return song.audio_url || song.playback_url || null;
}

async function getSongsMissingSize() {
  const { data, error } = await supabase
    .from("songs")
    .select("id, title, audio_url, playback_url, size_bytes")
    .is("size_bytes", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function getObjectSizeBytes(key) {
  const head = await r2Client.send(
    new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );

  const sizeBytes = Number(head.ContentLength || 0);
  return sizeBytes > 0 ? sizeBytes : null;
}

async function updateSongSize(songId, sizeBytes) {
  if (dryRun) return;

  const { error } = await supabase
    .from("songs")
    .update({ size_bytes: sizeBytes })
    .eq("id", songId);

  if (error) throw error;
}

const songs = await getSongsMissingSize();

console.log(
  `Found ${songs.length} song${songs.length === 1 ? "" : "s"} missing size_bytes.`,
);

let updated = 0;
let skipped = 0;
let failed = 0;

for (const song of songs) {
  const url = getSongUrl(song);

  if (!url) {
    skipped += 1;
    console.log(`skip ${song.id} — missing audio URL`);
    continue;
  }

  try {
    const key = getR2KeyFromUrl(url);
    const sizeBytes = await getObjectSizeBytes(key);

    if (!sizeBytes) {
      skipped += 1;
      console.log(`skip ${song.id} — no ContentLength for ${key}`);
      continue;
    }

    await updateSongSize(song.id, sizeBytes);
    updated += 1;

    console.log(
      `${dryRun ? "dry-run" : "updated"} ${song.id} — ${song.title || "Untitled"} — ${sizeBytes} bytes`,
    );
  } catch (error) {
    failed += 1;
    console.error(`failed ${song.id}`, error);
  }
}

console.log(`Done. updated=${updated} skipped=${skipped} failed=${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
