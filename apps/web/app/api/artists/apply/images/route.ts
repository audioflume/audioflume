import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { r2Client } from "@/lib/r2";

export const runtime = "nodejs";

type ArtistApplicationImageKind = "profile" | "hero";

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

function getUserKey(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "");
}

function normalizeImageKind(
  value: FormDataEntryValue | null,
): ArtistApplicationImageKind | null {
  if (value === "profile" || value === "hero") return value;
  return null;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = normalizeImageKind(formData.get("kind"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!kind) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
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

    const prefix = `images/artist-applications/${getUserKey(user.id)}`;
    const key = `${prefix}/${kind}-${Date.now()}-${randomUUID()}.webp`;
    const sharp = (await import("sharp")).default;
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: kind === "hero" ? 2400 : 1600,
        withoutEnlargement: true,
      })
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
      upload: {
        kind,
        key,
        url: `${getPublicUrl()}/${key}`,
      },
    });
  } catch (error) {
    console.error("Artist application image upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload artist application image",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | { keys?: unknown }
      | null;
    const prefix = `images/artist-applications/${getUserKey(user.id)}/`;
    const keys = Array.isArray(body?.keys)
      ? body.keys.filter(
          (key): key is string =>
            typeof key === "string" && key.startsWith(prefix),
        )
      : [];

    if (keys.length > 0) {
      await r2Client.send(
        new DeleteObjectsCommand({
          Bucket: getBucket(),
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Artist application image cleanup failed:", error);
    return NextResponse.json(
      { error: "Failed to clean up artist application images" },
      { status: 500 },
    );
  }
}
