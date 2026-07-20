import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName =
  process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
  process.env.CLOUDFLARE_R2_BUCKET_NAME;
const publicUrl = (
  process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
  process.env.CLOUDFLARE_R2_PUBLIC_URL ||
  ""
).replace(/\/$/, "");
const dryRun = process.argv.includes("--dry-run");

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!accountId) throw new Error("Missing CLOUDFLARE_R2_ACCOUNT_ID");
if (!accessKeyId) throw new Error("Missing CLOUDFLARE_R2_ACCESS_KEY_ID");
if (!secretAccessKey) throw new Error("Missing CLOUDFLARE_R2_SECRET_ACCESS_KEY");
if (!bucketName) throw new Error("Missing Cloudflare R2 image bucket");
if (!publicUrl) throw new Error("Missing Cloudflare R2 image public URL");

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

function safePathSegment(value) {
  return (
    String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

function isEmbeddedImage(value) {
  return (
    typeof value === "string" &&
    value.trimStart().toLowerCase().startsWith("data:image/")
  );
}

function decodeDataUrl(dataUrl) {
  const match = dataUrl.trim().match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/is);

  if (!match) {
    throw new Error("Unsupported playlist cover data URL");
  }

  return Buffer.from(match[1], "base64");
}

async function getEmbeddedPlaylistCovers() {
  const { data, error } = await supabase
    .from("playlists")
    .select("id, clerk_user_id, name, cover_image_url")
    .not("cover_image_url", "is", null)
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = data ?? [];
  const embeddedRows = rows.filter((playlist) =>
    isEmbeddedImage(playlist.cover_image_url),
  );

  return {
    totalRows: rows.length,
    embeddedRows,
  };
}

async function migratePlaylistCover(playlist) {
  const inputBuffer = decodeDataUrl(playlist.cover_image_url);
  const outputBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const key = `images/user-playlists/${safePathSegment(
    playlist.clerk_user_id,
  )}/${playlist.id}/cover-${Date.now()}-${randomUUID()}.webp`;
  const imageUrl = `${publicUrl}/${key}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: outputBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const { error } = await supabase
    .from("playlists")
    .update({ cover_image_url: imageUrl })
    .eq("id", playlist.id)
    .eq("clerk_user_id", playlist.clerk_user_id);

  if (error) throw error;

  return {
    imageUrl,
    originalBytes: inputBuffer.length,
    migratedBytes: outputBuffer.length,
  };
}

const { totalRows, embeddedRows: playlists } =
  await getEmbeddedPlaylistCovers();

console.log(
  `Checked ${totalRows} playlist${totalRows === 1 ? "" : "s"} with cover values.`,
);
console.log(
  `Found ${playlists.length} playlist${
    playlists.length === 1 ? "" : "s"
  } with embedded cover images.`,
);

if (dryRun) {
  const totalCharacters = playlists.reduce(
    (total, playlist) => total + String(playlist.cover_image_url || "").length,
    0,
  );

  console.log(
    `Dry run only. Embedded cover payload is approximately ${(
      totalCharacters /
      1024 /
      1024
    ).toFixed(2)} MB.`,
  );
  process.exit(0);
}

let migrated = 0;
let failed = 0;
let originalBytes = 0;
let migratedBytes = 0;

for (const playlist of playlists) {
  try {
    const result = await migratePlaylistCover(playlist);
    migrated += 1;
    originalBytes += result.originalBytes;
    migratedBytes += result.migratedBytes;

    console.log(
      `migrated ${playlist.id} — ${playlist.name || "Untitled"} — ${result.imageUrl}`,
    );
  } catch (error) {
    failed += 1;
    console.error(`failed ${playlist.id} — ${playlist.name || "Untitled"}`, error);
  }
}

console.log(
  `Done. migrated=${migrated} failed=${failed} original=${(
    originalBytes /
    1024 /
    1024
  ).toFixed(2)}MB webp=${(migratedBytes / 1024 / 1024).toFixed(2)}MB`,
);

if (failed > 0) {
  process.exitCode = 1;
}
