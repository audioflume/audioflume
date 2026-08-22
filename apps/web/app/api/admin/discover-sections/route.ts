import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import { isDiscoverSectionShelfKey } from "@/lib/discoverSections";

const DISCOVER_FEATURE_CARDS_KEY = "discover_feature_cards";
const DISCOVER_FEATURE_CARDS_LIMIT = 2;

function cleanPlaylistIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
}

function sectionError(err: unknown) {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message || "")
      : "";

  if (message.toLowerCase().includes("curated_playlist_shelf_items")) {
    return "Discover sections require the latest curated playlist shelf migration.";
  }

  return message || "Failed to update Discover section";
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const shelfKey = body.shelf_key;
    const playlistIds = cleanPlaylistIds(body.playlist_ids);

    if (!isDiscoverSectionShelfKey(shelfKey) || playlistIds.length === 0) {
      return NextResponse.json(
        { error: "Missing section or content" },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseServer
      .from("curated_playlist_shelf_items")
      .select("curated_playlist_id")
      .eq("shelf_key", shelfKey);

    if (existingError) throw existingError;

    const existingIds = new Set(
      (existing ?? []).map((row) => Number(row.curated_playlist_id)),
    );
    const newIds = playlistIds.filter((id) => !existingIds.has(id));

    if (
      shelfKey === DISCOVER_FEATURE_CARDS_KEY &&
      existingIds.size + newIds.length > DISCOVER_FEATURE_CARDS_LIMIT
    ) {
      return NextResponse.json(
        { error: "Featured Cards can contain up to 2 playlists." },
        { status: 400 },
      );
    }

    if (newIds.length === 0) {
      return NextResponse.json({ success: true, added_playlist_ids: [] });
    }

    const { data: lastItems, error: positionError } = await supabaseServer
      .from("curated_playlist_shelf_items")
      .select("position")
      .eq("shelf_key", shelfKey)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition =
      lastItems?.[0]?.position != null ? Number(lastItems[0].position) + 1 : 0;

    const { error: insertError } = await supabaseServer
      .from("curated_playlist_shelf_items")
      .insert(
        newIds.map((playlistId, index) => ({
          shelf_key: shelfKey,
          curated_playlist_id: playlistId,
          position: nextPosition + index,
        })),
      );

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      added_playlist_ids: newIds,
    });
  } catch (err) {
    console.error("Admin Discover section add failed:", err);
    return NextResponse.json({ error: sectionError(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const shelfKey = body.shelf_key;
    const playlistIds = cleanPlaylistIds(body.playlist_ids);

    if (!isDiscoverSectionShelfKey(shelfKey)) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    if (
      shelfKey === DISCOVER_FEATURE_CARDS_KEY &&
      playlistIds.length > DISCOVER_FEATURE_CARDS_LIMIT
    ) {
      return NextResponse.json(
        { error: "Featured Cards can contain up to 2 playlists." },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      playlistIds.map((playlistId, position) =>
        supabaseServer
          .from("curated_playlist_shelf_items")
          .update({ position })
          .eq("shelf_key", shelfKey)
          .eq("curated_playlist_id", playlistId),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin Discover section reorder failed:", err);
    return NextResponse.json({ error: sectionError(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const shelfKey = body.shelf_key;
    const playlistId = Number(body.playlist_id);

    if (
      !isDiscoverSectionShelfKey(shelfKey) ||
      !Number.isInteger(playlistId) ||
      playlistId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid section or content" },
        { status: 400 },
      );
    }

    const { error } = await supabaseServer
      .from("curated_playlist_shelf_items")
      .delete()
      .eq("shelf_key", shelfKey)
      .eq("curated_playlist_id", playlistId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin Discover section remove failed:", err);
    return NextResponse.json({ error: sectionError(err) }, { status: 500 });
  }
}
