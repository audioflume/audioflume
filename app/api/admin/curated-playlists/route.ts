import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getGroupOrder() {
  const { data, error } = await supabaseServer
    .from("curated_playlist_groups")
    .select("name, position")
    .order("position", { ascending: true });

  if (error) throw error;

  return new Map(
    (data ?? []).map((group) => [String(group.name), Number(group.position || 0)]),
  );
}

function sortPlaylistsByGroupOrder<T extends { playlist_group: string; position: number; name: string }>(
  playlists: T[],
  groupOrder: Map<string, number>,
) {
  return [...playlists].sort((a, b) => {
    const aGroupPosition = groupOrder.get(a.playlist_group) ?? Number.MAX_SAFE_INTEGER;
    const bGroupPosition = groupOrder.get(b.playlist_group) ?? Number.MAX_SAFE_INTEGER;

    if (aGroupPosition !== bGroupPosition) return aGroupPosition - bGroupPosition;

    const groupCompare = a.playlist_group.localeCompare(b.playlist_group, undefined, {
      sensitivity: "base",
    });

    if (groupCompare !== 0) return groupCompare;
    if (a.position !== b.position) return a.position - b.position;

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const [{ data, error }, groupOrder] = await Promise.all([
      supabaseServer
        .from("curated_playlists")
        .select("*, curated_playlist_songs(count)"),
      getGroupOrder(),
    ]);

    if (error) throw error;

    const playlists = (data ?? []).map((row) =>
      normalizeCuratedPlaylist({
        ...row,
        song_count: row.curated_playlist_songs?.[0]?.count ?? 0,
      }),
    );

    return NextResponse.json(sortPlaylistsByGroupOrder(playlists, groupOrder));
  } catch (err) {
    console.error("Admin curated playlists fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load curated playlists"),
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
    const name = cleanString(body.name);
    const kicker = cleanString(body.kicker);
    const coverImageUrl = cleanString(body.cover_image_url);
    const playlistGroup = cleanString(body.playlist_group) || DEFAULT_CURATED_PLAYLIST_GROUP;

    if (!name) {
      return NextResponse.json({ error: "Missing playlist name" }, { status: 400 });
    }

    const { data: existing, error: positionError } = await supabaseServer
      .from("curated_playlists")
      .select("position")
      .eq("playlist_group", playlistGroup)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition = existing?.[0]?.position != null ? existing[0].position + 1 : 0;

    const { data, error } = await supabaseServer
      .from("curated_playlists")
      .insert({
        name,
        kicker: kicker || "Curated selection",
        cover_image_url: coverImageUrl || null,
        playlist_group: playlistGroup,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeCuratedPlaylist(data));
  } catch (err) {
    console.error("Admin curated playlist create failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to create curated playlist"),
      { status: 500 },
    );
  }
}
