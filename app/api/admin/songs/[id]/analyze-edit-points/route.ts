import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSongById } from "@/lib/songs";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const analyzerUrl = process.env.AUDIO_ANALYZER_URL;
  const analyzerSecret = process.env.AUDIO_ANALYZER_SECRET;

  if (!analyzerUrl || !analyzerSecret) {
    return NextResponse.json(
      { error: "Missing analyzer environment variables." },
      { status: 500 },
    );
  }

  const song = await getSongById(id);

  if (!song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  if (!song.audioUrl) {
    return NextResponse.json(
      { error: "Song is missing an audio URL." },
      { status: 400 },
    );
  }

  const response = await fetch(`${analyzerUrl.replace(/\/$/, "")}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-analyzer-secret": analyzerSecret,
    },
    body: JSON.stringify({
      songId: song.id,
      audioUrl: song.audioUrl,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Analyzer failed.",
        detail: data,
      },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
