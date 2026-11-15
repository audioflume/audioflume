import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const { data: rows, error } = await supabaseServer.from("music_featured_artists")
      .select("artist_id, position, focal_x, focal_y").order("position").limit(4);
    if (error) throw error;
    const ids = (rows ?? []).map(row => row.artist_id);
    if (!ids.length) return NextResponse.json({ artists: [] });
    const { data: artists, error: artistError } = await supabaseServer.from("artists")
      .select("id, name, designation, hero_image_url, status").in("id", ids).eq("status", "approved");
    if (artistError) throw artistError;
    const byId = new Map((artists ?? []).map(a => [a.id, a]));
    return NextResponse.json({
      artists: (rows ?? []).flatMap(row => {
        const artist = byId.get(row.artist_id);
        if (!artist?.hero_image_url) return [];
        return [{
          id: row.artist_id,
          name: artist.name,
          designation: artist.designation,
          hero_image_url: artist.hero_image_url,
          hero_image_position_x: Number(row.focal_x),
          hero_image_position_y: Number(row.focal_y),
        }];
      }),
    });
  } catch (error) {
    console.error("Music featured artists failed:", error);
    return NextResponse.json({ error: "Unable to load Music featured artists" }, { status: 500 });
  }
}
