import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { r2Client } from "@/lib/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const BUCKET =
  process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
  process.env.CLOUDFLARE_R2_BUCKET_NAME!;

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { imageKey } = await req.json();

    if (!imageKey || typeof imageKey !== "string") {
      return NextResponse.json({ error: "Missing imageKey" }, { status: 400 });
    }

    if (!imageKey.startsWith("images/")) {
      return NextResponse.json({ error: "Invalid image key" }, { status: 400 });
    }

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
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
