import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .select("*, curated_playlist_songs(count)")
      .order("playlist_group", { ascending: true })
      .order("position", { ascending: true });

    if (error) throw error;

    const playlists = (data ?? []).map((row) =>
      normalizeCuratedPlaylist({
        ...row,
        song_count: row.curated_playlist_songs?.[0]?.count ?? 0,
      }),
    );

    return NextResponse.json(playlists);
  } catch (err) {
    console.error("Curated playlists fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load curated playlists"),
      { status: 500 },
    );
  }
}
