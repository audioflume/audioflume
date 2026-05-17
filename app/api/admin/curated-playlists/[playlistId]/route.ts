import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { playlistId } = await context.params;
    const body = await req.json();
    const name = cleanString(body.name);

    if (!name) {
      return NextResponse.json({ error: "Missing playlist name" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .update({
        name,
        kicker: cleanString(body.kicker) || "Curated selection",
        cover_image_url: cleanString(body.cover_image_url) || null,
        playlist_group:
          cleanString(body.playlist_group) || DEFAULT_CURATED_PLAYLIST_GROUP,
      })
      .eq("id", playlistId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeCuratedPlaylist(data));
  } catch (err) {
    console.error("Admin curated playlist update failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to update curated playlist"),
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { playlistId } = await context.params;

    const { error } = await supabaseServer
      .from("curated_playlists")
      .delete()
      .eq("id", playlistId);

    if (error) throw error;

    return NextResponse.json({ success: true, id: Number(playlistId) });
  } catch (err) {
    console.error("Admin curated playlist delete failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to delete curated playlist"),
      { status: 500 },
    );
  }
}
