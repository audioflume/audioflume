import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { normalizePlaylist, getPlaylistErrorResponse } from "@/lib/playlists";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params:
    | Promise<{ playlistId: string }>
    | { playlistId: string };
};

export async function POST(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistId } = await context.params;
    const numericPlaylistId = Number(playlistId);

    if (!Number.isInteger(numericPlaylistId) || numericPlaylistId <= 0) {
      return NextResponse.json(
        { error: "Invalid curated playlist id" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer.rpc(
      "save_curated_playlist_to_user",
      {
        p_clerk_user_id: userId,
        p_curated_playlist_id: numericPlaylistId,
      },
    );

    if (error) throw error;

    const savedPlaylist = Array.isArray(data) ? data[0] : null;

    if (!savedPlaylist) {
      return NextResponse.json(
        { error: "Failed to save curated playlist" },
        { status: 500 },
      );
    }

    return NextResponse.json(normalizePlaylist(savedPlaylist));
  } catch (error) {
    console.error("Fast curated playlist save failed:", error);

    return NextResponse.json(
      getPlaylistErrorResponse(
        error instanceof Error
          ? { message: error.message }
          : { message: "Failed to save curated playlist" },
      ),
      { status: 500 },
    );
  }
}
