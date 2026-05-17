import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  getCuratedPlaylistError,
  normalizeCuratedPlaylistGroup,
} from "@/lib/curatedPlaylists";

type RouteContext = {
  params: Promise<{ groupId: string }> | { groupId: string };
};

function cleanGroupName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { groupId } = await context.params;
    const body = await req.json();
    const name = cleanGroupName(body.name);
    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;

    if (!name) {
      return NextResponse.json({ error: "Missing group name" }, { status: 400 });
    }

    const { data: existingGroup, error: existingError } = await supabaseServer
      .from("curated_playlist_groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (existingError) throw existingError;

    const previousName = String(existingGroup.name || "");

    const { data, error } = await supabaseServer
      .from("curated_playlist_groups")
      .update({ name, description })
      .eq("id", groupId)
      .select()
      .single();

    if (error) throw error;

    if (previousName && previousName !== name) {
      const { error: playlistUpdateError } = await supabaseServer
        .from("curated_playlists")
        .update({ playlist_group: name })
        .eq("playlist_group", previousName);

      if (playlistUpdateError) throw playlistUpdateError;
    }

    return NextResponse.json(
      normalizeCuratedPlaylistGroup({ ...data, playlist_count: 0 }),
    );
  } catch (err) {
    console.error("Admin curated playlist group update failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to update playlist group"),
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
    const { groupId } = await context.params;

    const { data: group, error: groupError } = await supabaseServer
      .from("curated_playlist_groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (groupError) throw groupError;

    const groupName = String(group.name || "");

    if (groupName === DEFAULT_CURATED_PLAYLIST_GROUP) {
      return NextResponse.json(
        { error: "The default playlist group cannot be deleted" },
        { status: 400 },
      );
    }

    const { error: playlistUpdateError } = await supabaseServer
      .from("curated_playlists")
      .update({ playlist_group: DEFAULT_CURATED_PLAYLIST_GROUP })
      .eq("playlist_group", groupName);

    if (playlistUpdateError) throw playlistUpdateError;

    const { error } = await supabaseServer
      .from("curated_playlist_groups")
      .delete()
      .eq("id", groupId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      id: Number(groupId),
      reassigned_to: DEFAULT_CURATED_PLAYLIST_GROUP,
    });
  } catch (err) {
    console.error("Admin curated playlist group delete failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to delete playlist group"),
      { status: 500 },
    );
  }
}
