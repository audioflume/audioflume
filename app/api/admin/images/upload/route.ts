import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { r2Client } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

// Read env vars inside the handler so they're evaluated fresh on each request
// (avoids module-level caching issues with Next.js Turbopack)
function getBucket() {
  return process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME!;
}

function getPublicUrl() {
  return (
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL!
  ).replace(/\/$/, "");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

const MAX_WIDTH: Record<string, number> = {
  card: 1600,
  hero: 2200,
  thumb: 800,
};

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const BUCKET = getBucket();
  const PUBLIC_URL = getPublicUrl();

  console.log(`[image-upload] BUCKET="${BUCKET}" PUBLIC_URL="${PUBLIC_URL}"`);

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const target = String(formData.get("target") || "");
    const slug = String(formData.get("slug") || "");
    const variant = String(formData.get("variant") || "card");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
    }
    if (!["playlist", "discover"].includes(target)) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }
    if (!["card", "hero", "thumb"].includes(variant)) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }

    const safeSlug = slugify(slug || "untitled");
    const baseFolder = target === "playlist" ? "images/playlists" : "images/discover";
    const key = `${baseFolder}/${safeSlug}/${variant}-${Date.now()}.webp`;

    const sharp = (await import("sharp")).default;
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const maxWidth = MAX_WIDTH[variant] ?? 1600;

    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const r2Response = await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: outputBuffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000",
      }),
    );

    console.log(`[image-upload] R2 httpStatusCode=${r2Response.$metadata.httpStatusCode} key="${key}"`);

    const imageUrl = `${PUBLIC_URL}/${key}`;
    return NextResponse.json({ imageUrl, imageKey: key });
  } catch (err) {
    console.error("Image upload failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
