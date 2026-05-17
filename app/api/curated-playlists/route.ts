import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";

export async function GET() {
  try {
    const [groupsResult, playlistsResult] = await Promise.all([
      supabaseServer
        .from("curated_playlist_groups")
        .select("name, position")
        .order("position", { ascending: true }),
      supabaseServer
        .from("curated_playlists")
        .select("*, curated_playlist_songs(count)")
        .order("position", { ascending: true }),
    ]);

    if (groupsResult.error) throw groupsResult.error;
    if (playlistsResult.error) throw playlistsResult.error;

    // Build a lookup of group name → position for correct shelf ordering
    const groupPositions = new Map(
      (groupsResult.data ?? []).map((g) => [g.name, Number(g.position)]),
    );

    const playlists = (playlistsResult.data ?? [])
      .map((row) =>
        normalizeCuratedPlaylist({
          ...row,
          song_count: row.curated_playlist_songs?.[0]?.count ?? 0,
        }),
      )
      .sort((a, b) => {
        const groupA = groupPositions.get(a.playlist_group) ?? 999;
        const groupB = groupPositions.get(b.playlist_group) ?? 999;
        if (groupA !== groupB) return groupA - groupB;
        return a.position - b.position;
      });

    return NextResponse.json(playlists);
  } catch (err) {
    console.error("Curated playlists fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load curated playlists"),
      { status: 500 },
    );
  }
}
