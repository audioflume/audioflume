import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { playlistId } = await context.params;

    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .select("*, curated_playlist_songs(count)")
      .eq("id", playlistId)
      .single();

    if (error) throw error;

    return NextResponse.json(
      normalizeCuratedPlaylist({
        ...data,
        song_count: data.curated_playlist_songs?.[0]?.count ?? 0,
      }),
    );
  } catch (err) {
    console.error("Curated playlist fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load curated playlist"),
      { status: 500 },
    );
  }
}
