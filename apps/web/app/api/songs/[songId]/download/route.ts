import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ songId: string }> },
) {
  const { songId } = await params;

  const { data: song, error: fetchError } = await supabaseServer
    .from("songs")
    .select("audio_url, playback_url, download_count")
    .eq("id", songId)
    .single();

  if (fetchError || !song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const currentDownloadCount = Number(song.download_count || 0);

  const { error: updateError } = await supabaseServer
    .from("songs")
    .update({ download_count: currentDownloadCount + 1 })
    .eq("id", songId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    downloadUrl: String(song.audio_url || song.playback_url || ""),
  });
}
