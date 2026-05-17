import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  getCuratedPlaylistError,
  normalizeCuratedPlaylist,
} from "@/lib/curatedPlaylists";

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
    console.error("Curated playlists fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load curated playlists"),
      { status: 500 },
    );
  }
}
