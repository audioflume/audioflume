import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { playlistId } = await context.params;
    const numericPlaylistId = Number(playlistId);

    if (!Number.isInteger(numericPlaylistId) || numericPlaylistId <= 0) {
      return NextResponse.json(
        { error: "Community playlist not found" },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { song_id?: unknown }
      | null;
    const songId =
      typeof body?.song_id === "string" ? body.song_id.trim() : "";

    if (!songId) {
      return NextResponse.json({ error: "song_id is required" }, { status: 400 });
    }

    const [playlistResult, playlistSongResult, songResult] = await Promise.all([
      supabaseServer
        .from("playlists")
        .select("id")
        .eq("id", numericPlaylistId)
        .eq("is_public", true)
        .maybeSingle(),
      supabaseServer
        .from("playlist_songs")
        .select("id")
        .eq("playlist_id", numericPlaylistId)
        .eq("song_id", songId)
        .maybeSingle(),
      supabaseServer
        .from("songs")
        .select("id")
        .eq("id", songId)
        .eq("status", "published")
        .maybeSingle(),
    ]);

    if (playlistResult.error) throw playlistResult.error;
    if (playlistSongResult.error) throw playlistSongResult.error;
    if (songResult.error) throw songResult.error;

    if (!playlistResult.data || !playlistSongResult.data || !songResult.data) {
      return NextResponse.json(
        { error: "Published playlist song not found" },
        { status: 404 },
      );
    }

    const { error: insertError } = await supabaseServer
      .from("community_playlist_play_events")
      .insert({
        playlist_id: numericPlaylistId,
        song_id: songId,
      });

    if (insertError) throw insertError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Community playlist play tracking error:", error);
    return NextResponse.json(
      { error: "Could not record community playlist play" },
      { status: 500 },
    );
  }
}
