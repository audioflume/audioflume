import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params:
    | Promise<{ playlistId: string; songId: string }>
    | { playlistId: string; songId: string };
};

async function verifyPlaylistOwner(playlistId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from("playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("clerk_user_id", userId)
    .single();

  if (error || !data) return false;

  return true;
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistId, songId } = await context.params;
    const decodedSongId = decodeURIComponent(songId);

    const isOwner = await verifyPlaylistOwner(playlistId, userId);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 },
      );
    }

    const { error } = await supabaseServer
      .from("playlist_songs")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("song_id", decodedSongId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      playlist_id: Number(playlistId),
      song_id: decodedSongId,
    });
  } catch (err) {
    console.error("Playlist song delete failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to remove song from playlist",
      },
      { status: 500 },
    );
  }
}
