import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type PlaylistPositionUpdate = {
  id: number;
  position: number;
};

function isValidPlaylistUpdate(
  value: unknown,
): value is PlaylistPositionUpdate {
  const item = value as Partial<PlaylistPositionUpdate>;

  return (
    typeof item.id === "number" &&
    Number.isFinite(item.id) &&
    typeof item.position === "number" &&
    Number.isFinite(item.position)
  );
}

export async function PATCH(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const playlists = body.playlists;

    if (!Array.isArray(playlists)) {
      return NextResponse.json(
        { error: "Invalid playlists payload" },
        { status: 400 },
      );
    }

    const updates = playlists.filter(isValidPlaylistUpdate);

    if (updates.length !== playlists.length) {
      return NextResponse.json(
        { error: "Invalid playlist position update" },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      updates.map((playlist) =>
        supabaseServer
          .from("playlists")
          .update({ position: playlist.position })
          .eq("id", playlist.id)
          .eq("clerk_user_id", userId),
      ),
    );

    const firstError = results.find((result) => result.error)?.error;

    if (firstError) {
      throw firstError;
    }

    return NextResponse.json({
      success: true,
      updatedCount: updates.length,
      playlists: updates,
    });
  } catch (err) {
    console.error("Playlist reorder failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to reorder playlists",
      },
      { status: 500 },
    );
  }
}
