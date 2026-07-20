import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { r2Client } from "@/lib/r2";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type PlaylistCoverRow = {
  id: number;
  clerk_user_id: string;
  name: string;
  cover_image_url: string | null;
};

function getBucket() {
  const bucket =
    process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!bucket) throw new Error("Missing Cloudflare R2 image bucket");
  return bucket;
}

function getPublicUrl() {
  const publicUrl =
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!publicUrl) throw new Error("Missing Cloudflare R2 image public URL");
  return publicUrl.replace(/\/$/, "");
}

function safePathSegment(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

function isEmbeddedImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trimStart().toLowerCase().startsWith("data:image/")
  );
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.trim().match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/is);

  if (!match) {
    throw new Error("Unsupported playlist cover data URL");
  }

  return Buffer.from(match[1], "base64");
}

async function migrateCover(playlist: PlaylistCoverRow) {
  if (!isEmbeddedImage(playlist.cover_image_url)) return null;

  const inputBuffer = decodeDataUrl(playlist.cover_image_url);
  const sharp = (await import("sharp")).default;
  const outputBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const key = `images/user-playlists/${safePathSegment(
    playlist.clerk_user_id,
  )}/${playlist.id}/cover-${Date.now()}-${randomUUID()}.webp`;
  const imageUrl = `${getPublicUrl()}/${key}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: outputBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const { error } = await supabaseServer
    .from("playlists")
    .update({ cover_image_url: imageUrl })
    .eq("id", playlist.id)
    .eq("clerk_user_id", playlist.clerk_user_id);

  if (error) throw error;

  return imageUrl;
}

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("playlists")
      .select("id, clerk_user_id, name, cover_image_url")
      .eq("clerk_user_id", userId)
      .not("cover_image_url", "is", null)
      .order("id", { ascending: true });

    if (error) throw error;

    const embeddedPlaylists = ((data ?? []) as PlaylistCoverRow[]).filter(
      (playlist) => isEmbeddedImage(playlist.cover_image_url),
    );
    let migrated = 0;
    const failures: Array<{ id: number; name: string; error: string }> = [];

    for (const playlist of embeddedPlaylists) {
      try {
        const imageUrl = await migrateCover(playlist);
        if (imageUrl) migrated += 1;
      } catch (migrationError) {
        failures.push({
          id: playlist.id,
          name: playlist.name,
          error:
            migrationError instanceof Error
              ? migrationError.message
              : "Failed to migrate playlist cover",
        });
      }
    }

    return NextResponse.json({
      found: embeddedPlaylists.length,
      migrated,
      failed: failures.length,
      failures,
    });
  } catch (err) {
    console.error("Playlist cover migration failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to migrate playlist covers",
      },
      { status: 500 },
    );
  }
}
