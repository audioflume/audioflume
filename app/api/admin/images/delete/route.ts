import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";

export const runtime = "nodejs";

// Uses the dedicated images bucket if configured, falls back to the main bucket
const IMAGES_BUCKET =
  process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
  process.env.CLOUDFLARE_R2_BUCKET_NAME!;

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const imageKey = typeof body.imageKey === "string" ? body.imageKey.trim() : "";

    if (!imageKey) {
      return NextResponse.json({ error: "Missing imageKey" }, { status: 400 });
    }

    // Safety: only allow deleting from the images/ prefix
    if (!imageKey.startsWith("images/")) {
      return NextResponse.json(
        { error: "Can only delete from the images/ prefix" },
        { status: 400 },
      );
    }

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: IMAGES_BUCKET,
        Key: imageKey,
      }),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Image delete failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    );
  }
}
