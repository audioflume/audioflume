import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const { data: artists, error: artistsError } = await supabaseServer
      .from("artists")
      .select("id, name, slug, hero_image_url, profile_image_url")
      .eq("status", "approved")
      .order("name", { ascending: true });
    if (artistsError) throw artistsError;

    const ids = (artists ?? []).map((artist) => artist.id);
    if (!ids.length) return NextResponse.json({ artists: [] });

    const { data: links, error: linksError } = await supabaseServer
      .from("song_artists")
      .select("artist_id, song_id")
      .in("artist_id", ids);
    if (linksError) throw linksError;

    const songIds = [...new Set((links ?? []).map((link) => link.song_id))];
    const { data: songs, error: songsError } = songIds.length
      ? await supabaseServer
          .from("songs")
          .select("id, genres, moods, instruments")
          .in("id", songIds)
          .eq("status", "published")
      : { data: [], error: null };
    if (songsError) throw songsError;

    const tagsBySong = new Map((songs ?? []).map((song) => [
      song.id,
      [...(song.genres ?? []), ...(song.moods ?? []), ...(song.instruments ?? [])],
    ]));
    const tagsByArtist = new Map<string, Set<string>>();
    for (const link of links ?? []) {
      const tags = tagsBySong.get(link.song_id);
      if (!tags) continue;
      const current = tagsByArtist.get(link.artist_id) ?? new Set<string>();
      for (const tag of tags) current.add(String(tag));
      tagsByArtist.set(link.artist_id, current);
    }

    return NextResponse.json({
      artists: (artists ?? []).map((artist) => ({
        ...artist,
        tags: [...(tagsByArtist.get(artist.id) ?? [])],
      })),
    });
  } catch (error) {
    console.error("Homepage artist search lookup failed", error);
    return NextResponse.json({ error: "Unable to load artists" }, { status: 500 });
  }
}
