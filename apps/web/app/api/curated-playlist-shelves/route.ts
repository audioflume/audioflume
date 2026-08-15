import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import type {
  CuratedPlaylistShelfItem,
  CuratedPlaylistShelfState,
} from "@/lib/curatedPlaylistShelves";

function emptyShelves(): CuratedPlaylistShelfState {
  return {
    popular: [],
    trending: [],
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("curated_playlist_shelf_items")
      .select("shelf_key, curated_playlist_id, position")
      .order("position", { ascending: true });

    if (!error) {
      const shelves = emptyShelves();

      for (const row of data ?? []) {
        if (row.shelf_key !== "popular" && row.shelf_key !== "trending") {
          continue;
        }

        shelves[row.shelf_key].push({
          playlist_id: Number(row.curated_playlist_id),
          position: Number(row.position || 0),
        });
      }

      return NextResponse.json(shelves);
    }

    // Keep the existing shelves readable until the shelf migration is applied.
    const { data: legacyData, error: legacyError } = await supabaseServer
      .from("curated_playlists")
      .select("id, playlist_group, position")
      .in("playlist_group", ["Popular Right Now", "Trending Playlists"])
      .order("position", { ascending: true });

    if (legacyError) throw error;

    const shelves = emptyShelves();

    for (const row of legacyData ?? []) {
      const item: CuratedPlaylistShelfItem = {
        playlist_id: Number(row.id),
        position: Number(row.position || 0),
      };

      if (row.playlist_group === "Popular Right Now") {
        shelves.popular.push(item);
      } else if (row.playlist_group === "Trending Playlists") {
        shelves.trending.push(item);
      }
    }

    return NextResponse.json(shelves);
  } catch (err) {
    console.error("Curated playlist shelves fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to load curated playlist shelves" },
      { status: 500 },
    );
  }
}
