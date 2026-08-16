import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizeCuratedBrowseAssignments } from "@/lib/curatedBrowseTaxonomy";
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

    const [playlistResult, assignmentsResult] = await Promise.all([
      supabaseServer
        .from("curated_playlists")
        .select("*, curated_playlist_songs(count)")
        .eq("id", playlistId)
        .single(),
      supabaseServer
        .from("curated_playlist_browse_assignments")
        .select("browse_filter, subcategory_id")
        .eq("curated_playlist_id", playlistId),
    ]);

    if (playlistResult.error) throw playlistResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;

    return NextResponse.json({
      ...normalizeCuratedPlaylist({
        ...playlistResult.data,
        song_count:
          playlistResult.data.curated_playlist_songs?.[0]?.count ?? 0,
      }),
      browse_assignments: normalizeCuratedBrowseAssignments(
        assignmentsResult.data ?? [],
      ),
    });
  } catch (err) {
    console.error("Curated playlist fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load curated playlist"),
      { status: 500 },
    );
  }
}
