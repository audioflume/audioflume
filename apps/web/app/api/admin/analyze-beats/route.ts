import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST() {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({
    enabled: false,
    bpm: null,
    confidence: null,
    beats: [],
    downbeats: [],
    source: "beat_analyzer_unconfigured",
  });
}
