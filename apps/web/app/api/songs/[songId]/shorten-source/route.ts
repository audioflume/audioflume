import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ songId: string }> },
) {
  const { songId } = await params;

  const { data: song, error: fetchError } = await supabaseServer
    .from("songs")
    .select("audio_url, playback_url")
    .eq("id", songId)
    .single();

  if (fetchError || !song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const sourceUrl = String(song.audio_url || song.playback_url || "").trim();

  if (!sourceUrl) {
    return NextResponse.json({ error: "Song audio not found" }, { status: 404 });
  }

  try {
    const upstream = await fetch(sourceUrl, { cache: "no-store" });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Could not load song audio" },
        { status: upstream.status || 502 },
      );
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    const contentLength = upstream.headers.get("content-length");

    headers.set("Cache-Control", "no-store");
    headers.set("Content-Type", contentType || "audio/mpeg");

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("Failed to proxy shorten track audio", error);

    return NextResponse.json(
      { error: "Could not load song audio" },
      { status: 502 },
    );
  }
}
