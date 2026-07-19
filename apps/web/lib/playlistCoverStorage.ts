import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";

const MAX_PLAYLIST_COVER_BYTES = 10 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is;

function getBucket() {
  return (
    process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME!
  );
}

function getPublicUrl() {
  return (
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL!
  ).replace(/\/$/, "");
}

export async function storePlaylistCover(
  coverValue: unknown,
  userId: string,
): Promise<string | null> {
  if (typeof coverValue !== "string") return null;

  const cleanValue = coverValue.trim();
  if (!cleanValue) return null;
  if (!cleanValue.startsWith("data:")) return cleanValue;

  const match = cleanValue.match(DATA_IMAGE_PATTERN);

  if (!match) {
    throw new Error("Invalid playlist cover image data");
  }

  const inputBuffer = Buffer.from(match[2], "base64");

  if (!inputBuffer.length) {
    throw new Error("Playlist cover image is empty");
  }

  if (inputBuffer.length > MAX_PLAYLIST_COVER_BYTES) {
    throw new Error("Playlist cover image must be smaller than 10 MB");
  }

  const sharp = (await import("sharp")).default;
  const outputBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const uniqueSuffix = Math.random().toString(36).slice(2, 10);
  const key = `images/playlists/${safeUserId}/cover-${Date.now()}-${uniqueSuffix}.webp`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: outputBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000",
    }),
  );

  return `${getPublicUrl()}/${key}`;
}
