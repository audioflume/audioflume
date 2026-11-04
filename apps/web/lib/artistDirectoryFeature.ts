import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";

const KEY = "config/artist-directory-feature.json";

function bucket() {
  return process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME!;
}

export async function getDirectoryFeaturedArtistId(): Promise<string | null> {
  try {
    const object = await r2Client.send(new GetObjectCommand({ Bucket: bucket(), Key: KEY }));
    const stored = JSON.parse((await object.Body?.transformToString()) || "{}");
    return typeof stored.artist_id === "string" ? stored.artist_id : null;
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey" ||
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function setDirectoryFeaturedArtistId(artistId: string | null) {
  await r2Client.send(new PutObjectCommand({
    Bucket: bucket(),
    Key: KEY,
    Body: JSON.stringify({ artist_id: artistId }),
    ContentType: "application/json",
    CacheControl: "no-store",
  }));
}
