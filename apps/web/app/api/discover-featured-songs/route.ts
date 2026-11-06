import { NextResponse } from "next/server";

import { attachEditPoints, attachPrimaryArtistProfiles, normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const { data: rows, error } = await supabaseServer.from("discover_featured_songs")
      .select("song_id").order("position", { ascending: true }).limit(6);
    if (error) throw error;
    const songIds = (rows ?? []).map((row) => String(row.song_id));
    if (!songIds.length) return NextResponse.json({ songs: [] });

    const { data: songRows, error: songsError } = await supabaseServer.from("songs")
      .select("*").in("id", songIds).eq("status", "published");
    if (songsError) throw songsError;
    const songs = await attachPrimaryArtistProfiles(
      await attachEditPoints((songRows ?? []).map(normalizeSongRow)),
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
