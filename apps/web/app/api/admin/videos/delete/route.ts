import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { r2Client } from "@/lib/r2";

export const runtime = "nodejs";

const DEFAULT_VIDEO_BUCKET = "video";
const PLAYLIST_COVER_FOLDER = "playlist covers/";

export async function DELETE(req: Request) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const videoKey = String(body.videoKey || "")
      .trim()
      .replace(/^\/+/, "");

    if (!videoKey.startsWith(PLAYLIST_COVER_FOLDER)) {
      return NextResponse.json({ error: "Invalid video key" }, { status: 400 });
    }

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket:
          process.env.CLOUDFLARE_R2_VIDEO_BUCKET_NAME || DEFAULT_VIDEO_BUCKET,
        Key: videoKey,
      }),
    );

    return NextResponse.json({ success: true, videoKey });
  } catch (error) {
    console.error("Video deletion failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 500 },
    );
  }
}
