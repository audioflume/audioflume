import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import {
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";
import { supabaseServer } from "@/lib/supabaseServer";

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
    const body = (await req.json()) as Record<string, unknown>;
    const featureCoverImageUrl =
      cleanString(body.feature_cover_image_url) || null;

    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .update({ feature_cover_image_url: featureCoverImageUrl })
      .eq("id", playlistId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeCuratedPlaylist(data));
  } catch (err) {
    console.error("Admin curated feature cover update failed:", err);

    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to update feature artwork"),
      { status: 500 },
    );
  }
}
