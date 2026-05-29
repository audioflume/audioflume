import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizePlaylist } from "@/lib/playlists";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistId } = await context.params;
    const body = await req.json();

    const cleanName = typeof body.name === "string" ? body.name.trim() : "";

    if (!cleanName) {
      return NextResponse.json(
        { error: "Missing playlist name" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from("playlists")
      .update({
        name: cleanName,
        cover_image_url: body.cover_image_url || null,
      })
      .eq("id", playlistId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(normalizePlaylist(data));
  } catch (err) {
    console.error("Playlist update failed:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update playlist",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistId } = await context.params;

    const { error } = await supabaseServer
      .from("playlists")
      .delete()
      .eq("id", playlistId)
      .eq("clerk_user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      id: Number(playlistId),
    });
  } catch (err) {
    console.error("Playlist delete failed:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete playlist",
      },
      { status: 500 },
    );
  }
}
