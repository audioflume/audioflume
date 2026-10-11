import { NextResponse } from "next/server";

import {
  attachEditPoints,
  attachPrimaryArtistProfiles,
  normalizeSongRow,
} from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const { data: artists, error: artistsError } = await supabaseServer
      .from("artists")
      .select(
        "id, name, slug, hero_image_url, hero_image_position_x, hero_image_position_y",
      )
      .eq("status", "approved")
      .order("name", { ascending: true });

    if (artistsError) throw artistsError;

    const artistIds = (artists ?? []).map((artist) => String(artist.id));

    const { data: songLinks, error: songLinksError } =
      artistIds.length > 0
        ? await supabaseServer
            .from("song_artists")
            .select("song_id, artist_id")
            .in("artist_id", artistIds)
        : { data: [], error: null };

    if (songLinksError) throw songLinksError;

    const songIds = [
      ...new Set(
        (songLinks ?? [])
          .map((link) => String(link.song_id || ""))
          .filter(Boolean),
      ),
    ];

    const { data: songRows, error: songsError } =
      songIds.length > 0
        ? await supabaseServer
            .from("songs")
            .select("*")
            .in("id", songIds)
            .eq("status", "published")
            .order("created_at", { ascending: false })
        : { data: [], error: null };

    if (songsError) throw songsError;

    const songs = await attachPrimaryArtistProfiles(
      await attachEditPoints((songRows ?? []).map((row) => normalizeSongRow(row))),
    );

    const songIdsByArtist = new Map<string, Set<string>>();
    for (const link of songLinks ?? []) {
      const artistId = String(link.artist_id || "");
      const songId = String(link.song_id || "");
      if (!artistId || !songId) continue;

      const current = songIdsByArtist.get(artistId) ?? new Set<string>();
      current.add(songId);
      songIdsByArtist.set(artistId, current);
    }

    return NextResponse.json({
      artists: (artists ?? []).map((artist) => {
        const artistId = String(artist.id);
        const linkedSongIds = songIdsByArtist.get(artistId) ?? new Set<string>();

        return {
          id: artistId,
          name: String(artist.name || ""),
          slug: String(artist.slug || ""),
          custom_text: null,
          hero_image_url: artist.hero_image_url
            ? String(artist.hero_image_url)
            : null,
          hero_image_position_x: Number(artist.hero_image_position_x ?? 50),
          hero_image_position_y: Number(artist.hero_image_position_y ?? 50),
          songs: songs.filter((song) => linkedSongIds.has(song.id)),
        };
      }),
    });
  } catch (error) {
    console.error("Discover feature card artists fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to load Featured Cards" },
      { status: 500 },
    );
  }
}
