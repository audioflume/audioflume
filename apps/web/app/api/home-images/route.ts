import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { r2Client } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "config/home-images.json";
const DEFAULTS = {
  hero: "https://images.filmwave.io/images/home/jakob-owens-xKfS7Hll0Ck-unsplash.jpg",
  lowerBanner: "https://images.filmwave.io/images/home/yunus-tug-HA3X_sDhAgk-unsplash-web.jpg",
};

function bucket() {
  return process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME!;
}

export async function GET() {
  try {
    const object = await r2Client.send(new GetObjectCommand({ Bucket: bucket(), Key: KEY }));
    const stored = JSON.parse((await object.Body?.transformToString()) || "{}");
    return NextResponse.json({ ...DEFAULTS, ...stored }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey" || (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return NextResponse.json(DEFAULTS, { headers: { "Cache-Control": "no-store" } });
    }
    console.error("Homepage image settings fetch failed", error);
    return NextResponse.json({ error: "Unable to load homepage images" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await request.json();
    if (!body || typeof body.hero !== "string" || typeof body.lowerBanner !== "string") {
      return NextResponse.json({ error: "Both image URLs are required" }, { status: 400 });
    }
    for (const value of [body.hero, body.lowerBanner]) {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error("Images must use HTTPS URLs");
    }
    const images = { hero: body.hero, lowerBanner: body.lowerBanner };
    await r2Client.send(new PutObjectCommand({
      Bucket: bucket(), Key: KEY, Body: JSON.stringify(images),
      ContentType: "application/json", CacheControl: "no-store",
    }));
    return NextResponse.json(images);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save images" }, { status: 400 });
  }
}
