import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  DEFAULT_DISCOVER_BUTTON_TEXT,
  DISCOVER_SECTION_OPTIONS,
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanDiscoverSection(value: unknown) {
  const section = cleanString(value);

  return DISCOVER_SECTION_OPTIONS.some((option) => option.value === section)
    ? section
    : null;
}

function cleanBoolean(value: unknown) {
  return value === true;
}

function hasField(body: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { playlistId } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const name = cleanString(body.name);

    if (!name) {
      return NextResponse.json(
        { error: "Missing playlist name" },
        { status: 400 },
      );
    }

    const updates: Record<string, string | boolean | null | number> = {
      name,
      kicker: cleanString(body.kicker) || "Curated selection",
      cover_image_url: cleanString(body.cover_image_url) || null,
      playlist_group:
        cleanString(body.playlist_group) || DEFAULT_CURATED_PLAYLIST_GROUP,
      description: cleanString(body.description),
      discover_button_enabled: body.discover_button_enabled !== false,
      discover_button_text:
        cleanString(body.discover_button_text) || DEFAULT_DISCOVER_BUTTON_TEXT,
    };

    if (hasField(body, "discover_section")) {
      updates.discover_section = cleanDiscoverSection(body.discover_section);
    }

    if (hasField(body, "show_on_discover")) {
      updates.show_on_discover = cleanBoolean(body.show_on_discover);
    }

    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .update(updates)
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
