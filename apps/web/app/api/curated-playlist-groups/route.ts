import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCuratedPlaylistError } from "@/lib/curatedPlaylists";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("curated_playlist_groups")
      .select("*")
      .order("position", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((row) => ({
        id: Number(row.id),
        name: String(row.name || ""),
        position: Number(row.position || 0),
        description: row.description ? String(row.description) : null,
      })),
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (err) {
    console.error("Curated playlist groups fetch failed:", err);
    return NextResponse.json(
      getCuratedPlaylistError(err, "Failed to load playlist groups"),
      { status: 500 },
    );
  }
}
