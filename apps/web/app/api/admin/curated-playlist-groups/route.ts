import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  getCuratedPlaylistError,
  normalizeCuratedPlaylistGroup,
} from "@/lib/curatedPlaylists";

function cleanGroupName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanDescription(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("curated_playlist_groups")
      .select("*")
      .order("position", { ascending: true });

    if (error) throw error;

    const playlistCountsResult = await supabaseServer
      .from("curated_playlists")
      .select("playlist_group");

    const counts = new Map<string, number>();
    for (const row of playlistCountsResult.data ?? []) {
      const g = String(row.playlist_group || DEFAULT_CURATED_PLAYLIST_GROUP);
      counts.set(g, (counts.get(g) || 0) + 1);
    }

    return NextResponse.json(
      (data ?? []).map((row) =>
        normalizeCuratedPlaylistGroup({
          ...row,
          playlist_count: counts.get(String(row.name)) || 0,
        }),
      ),
    );
  } catch (err) {
    console.error("Admin curated playlist groups fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load playlist groups"),
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = cleanGroupName(body.name);
    const description = cleanDescription(body.description) || null;

    if (!name) {
      return NextResponse.json({ error: "Missing group name" }, { status: 400 });
    }

    const { data: existing, error: positionError } = await supabaseServer
      .from("curated_playlist_groups")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition =
      existing?.[0]?.position != null ? existing[0].position + 1 : 0;

    const { data, error } = await supabaseServer
      .from("curated_playlist_groups")
      .insert({ name, position: nextPosition, description })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      normalizeCuratedPlaylistGroup({ ...data, playlist_count: 0 }),
    );
  } catch (err) {
    console.error("Admin curated playlist group create failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to create playlist group"),
      { status: 500 },
    );
  }
}
