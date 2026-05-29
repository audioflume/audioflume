import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params:
    | Promise<{ playlistId: string; songId: string }>
    | { playlistId: string; songId: string };
};

export async function DELETE(_req: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { playlistId, songId } = await context.params;
    const decodedSongId = decodeURIComponent(songId);

    const { error } = await supabaseServer
      .from("curated_playlist_songs")
      .delete()
      .eq("curated_playlist_id", playlistId)
      .eq("song_id", decodedSongId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      curated_playlist_id: Number(playlistId),
      song_id: decodedSongId,
    });
  } catch (err) {
    console.error("Admin curated playlist song delete failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove song" },
      { status: 500 },
    );
  }
}
