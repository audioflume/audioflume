import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

const FEATURE_CARD_LIMIT = 2;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanArtistIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => UUID_PATTERN.test(id)),
    ),
  ];
}

function featureCardArtistError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";

  if (message.toLowerCase().includes("discover_feature_card_artists")) {
    return "Featured Cards require the latest Discover migration.";
  }

  return message || "Failed to update Featured Cards";
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data: featureRows, error: featureError } = await supabaseServer
      .from("discover_feature_card_artists")
      .select("artist_id, position")
      .order("position", { ascending: true });

    if (featureError) throw featureError;

    const artistIds = (featureRows ?? [])
      .map((row) => String(row.artist_id || ""))
      .filter((id) => UUID_PATTERN.test(id));

    if (artistIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: artists, error: artistsError } = await supabaseServer
      .from("artists")
      .select("id, name, slug, profile_image_url, hero_image_url, status")
      .in("id", artistIds);

    if (artistsError) throw artistsError;

    const artistById = new Map(
      (artists ?? []).map((artist) => [String(artist.id), artist] as const),
    );

    return NextResponse.json({
      items: (featureRows ?? []).flatMap((row) => {
        const artistId = String(row.artist_id || "");
        const artist = artistById.get(artistId);
        if (!artist) return [];

        return [
          {
            artist_id: artistId,
            position: Number(row.position || 0),
            artist: {
              id: artistId,
              name: String(artist.name || ""),
              slug: String(artist.slug || ""),
              profile_image_url: artist.profile_image_url
                ? String(artist.profile_image_url)
                : null,
              hero_image_url: artist.hero_image_url
                ? String(artist.hero_image_url)
                : null,
              status: String(artist.status || ""),
            },
          },
        ];
      }),
    });
  } catch (error) {
    console.error("Admin feature card artists fetch failed:", error);
    return NextResponse.json(
      { error: featureCardArtistError(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const artistIds = cleanArtistIds(body.artist_ids);

    if (artistIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one artist" },
        { status: 400 },
      );
    }

    const { data: approvedArtists, error: artistsError } = await supabaseServer
      .from("artists")
      .select("id")
      .in("id", artistIds)
      .eq("status", "approved");

    if (artistsError) throw artistsError;

    const approvedIds = new Set(
      (approvedArtists ?? []).map((artist) => String(artist.id)),
    );
    const eligibleIds = artistIds.filter((id) => approvedIds.has(id));

    if (eligibleIds.length === 0) {
      return NextResponse.json(
        { error: "Only approved artists can be added" },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseServer
      .from("discover_feature_card_artists")
      .select("artist_id");

    if (existingError) throw existingError;

    const existingIds = new Set(
      (existing ?? []).map((row) => String(row.artist_id)),
    );
    const newIds = eligibleIds.filter((id) => !existingIds.has(id));

    if (existingIds.size + newIds.length > FEATURE_CARD_LIMIT) {
      return NextResponse.json(
        { error: "Featured Cards can contain up to 2 artists." },
        { status: 400 },
      );
    }

    if (newIds.length === 0) {
      return NextResponse.json({ success: true, added_artist_ids: [] });
    }

    const { data: lastRows, error: positionError } = await supabaseServer
      .from("discover_feature_card_artists")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition =
      lastRows?.[0]?.position != null ? Number(lastRows[0].position) + 1 : 0;

    const { error: insertError } = await supabaseServer
      .from("discover_feature_card_artists")
      .insert(
        newIds.map((artistId, index) => ({
          artist_id: artistId,
          position: nextPosition + index,
        })),
      );

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      added_artist_ids: newIds,
    });
  } catch (error) {
    console.error("Admin feature card artist add failed:", error);
    return NextResponse.json(
      { error: featureCardArtistError(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const artistIds = cleanArtistIds(body.artist_ids);

    if (artistIds.length > FEATURE_CARD_LIMIT) {
      return NextResponse.json(
        { error: "Featured Cards can contain up to 2 artists." },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      artistIds.map((artistId, position) =>
        supabaseServer
          .from("discover_feature_card_artists")
          .update({ position })
          .eq("artist_id", artistId),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin feature card artist reorder failed:", error);
    return NextResponse.json(
      { error: featureCardArtistError(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const artistId = typeof body.artist_id === "string" ? body.artist_id.trim() : "";

    if (!UUID_PATTERN.test(artistId)) {
      return NextResponse.json({ error: "Invalid artist" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("discover_feature_card_artists")
      .delete()
      .eq("artist_id", artistId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin feature card artist remove failed:", error);
    return NextResponse.json(
      { error: featureCardArtistError(error) },
      { status: 500 },
    );
  }
}
