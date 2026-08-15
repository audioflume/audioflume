import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DISCOVER_SECTION_SHELF_KEYS,
  EMPTY_DISCOVER_SECTION_SHELVES,
  type DiscoverSectionShelfState,
} from "@/lib/discoverSections";

function emptySections(): DiscoverSectionShelfState {
  return {
    discover_moods: [...EMPTY_DISCOVER_SECTION_SHELVES.discover_moods],
    discover_curated: [...EMPTY_DISCOVER_SECTION_SHELVES.discover_curated],
    discover_production: [...EMPTY_DISCOVER_SECTION_SHELVES.discover_production],
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("curated_playlist_shelf_items")
      .select("shelf_key, curated_playlist_id, position")
      .in("shelf_key", [...DISCOVER_SECTION_SHELF_KEYS])
      .order("position", { ascending: true });

    if (error) throw error;

    const sections = emptySections();

    for (const row of data ?? []) {
      const key = row.shelf_key as keyof DiscoverSectionShelfState;
      if (!DISCOVER_SECTION_SHELF_KEYS.includes(key)) continue;

      sections[key].push({
        playlist_id: Number(row.curated_playlist_id),
        position: Number(row.position || 0),
      });
    }

    return NextResponse.json(sections);
  } catch (err) {
    console.error("Discover sections fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to load Discover sections" },
      { status: 500 },
    );
  }
}
