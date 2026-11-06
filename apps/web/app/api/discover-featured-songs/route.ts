import { NextResponse } from "next/server";

import { attachEditPoints, attachPrimaryArtistProfiles, normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const songIds: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabaseServer.from("discover_featured_songs")
        .select("song_id").order("position", { ascending: true })
        .order("song_id", { ascending: true }).range(from, from + 999);
      if (error) throw error;
      songIds.push(...(data ?? []).map((row) => String(row.song_id)));
      if (!data || data.length < 1000) break;
    }
    if (!songIds.length) return NextResponse.json({ songs: [] });

    const songRows: Record<string, unknown>[] = [];
    for (let from = 0; from < songIds.length; from += 200) {
      const { data, error } = await supabaseServer.from("songs")
        .select("*").in("id", songIds.slice(from, from + 200)).eq("status", "published");
      if (error) throw error;
      songRows.push(...(data ?? []));
    }
    const songs = await attachPrimaryArtistProfiles(
      await attachEditPoints(songRows.map(normalizeSongRow)),
    );
    const byId = new Map(songs.map((song) => [song.id, song]));
    return NextResponse.json({ songs: songIds.flatMap((id) => {
      const song = byId.get(id);
      return song ? [song] : [];
    }) });
  } catch (error) {
    console.error("Discover featured songs fetch failed:", error);
    return NextResponse.json({ error: "Failed to load featured songs" }, { status: 500 });
  }
}
