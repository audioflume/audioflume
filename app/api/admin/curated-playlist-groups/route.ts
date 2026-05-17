import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  getCuratedPlaylistError,
} from "@/lib/curatedPlaylists";

type CuratedPlaylistGroupRow = {
  id: string | number;
  name: string | null;
  position: number | null;
  created_at?: string | null;
  playlist_count?: number | null;
};

function normalizeCuratedPlaylistGroup(row: CuratedPlaylistGroupRow) {
  return {
    id: Number(row.id),
    name: String(row.name || DEFAULT_CURATED_PLAYLIST_GROUP),
    position: Number(row.position || 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    playlist_count: Number(row.playlist_count || 0),
  };
}

function cleanGroupName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

async function getPlaylistCountsByGroup() {
  const { data, error } = await supabaseServer
    .from("curated_playlists")
    .select("playlist_group");

  if (error) throw error;

  return (data ?? []).reduce((counts, playlist) => {
    const group = String(
      playlist.playlist_group || DEFAULT_CURATED_PLAYLIST_GROUP,
    );
    counts.set(group, (counts.get(group) || 0) + 1);
    return counts;
  }, new Map<string, number>());
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const [{ data, error }, playlistCounts] = await Promise.all([
      supabaseServer
        .from("curated_playlist_groups")
        .select("*")
        .order("position", { ascending: true }),
      getPlaylistCountsByGroup(),
    ]);

    if (error) throw error;

    const groups = (data ?? []).map((row) =>
      normalizeCuratedPlaylistGroup({
        ...row,
        playlist_count: playlistCounts.get(String(row.name)) || 0,
      }),
    );

    return NextResponse.json(groups);
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
      .insert({
        name,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeCuratedPlaylistGroup(data));
  } catch (err) {
    console.error("Admin curated playlist group create failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to create playlist group"),
      { status: 500 },
    );
  }
}
