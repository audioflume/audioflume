import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { r2Client } from "@/lib/r2";

export const runtime = "nodejs";

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

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "playlist"
  );
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const playlistName = String(formData.get("name") || "playlist");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 20 MB)" },
        { status: 400 },
      );
    }

    const safeUserId = slugify(userId);
    const safePlaylistName = slugify(playlistName);
    const key = `images/user-playlists/${safeUserId}/${safePlaylistName}/cover-${Date.now()}-${randomUUID()}.webp`;
    const sharp = (await import("sharp")).default;
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    await r2Client.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: outputBuffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return NextResponse.json({
      imageUrl: `${getPublicUrl()}/${key}`,
      imageKey: key,
    });
  } catch (err) {
    console.error("Playlist cover upload failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to upload playlist cover",
      },
      { status: 500 },
    );
  }
}
