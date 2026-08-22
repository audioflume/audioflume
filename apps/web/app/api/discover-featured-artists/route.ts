import { NextResponse } from "next/server";

import {
  attachEditPoints,
  attachPrimaryArtistProfiles,
  normalizeSongRow,
} from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const { data: featuredRows, error: featuredError } = await supabaseServer
      .from("discover_featured_artists")
      .select("artist_id, position")
      .order("position", { ascending: true });

    if (featuredError) throw featuredError;

    const orderedArtistIds = (featuredRows ?? [])
      .map((row) => String(row.artist_id || ""))
      .filter(Boolean);

    if (orderedArtistIds.length === 0) {
      return NextResponse.json({ artists: [] });
    }

    const { data: artists, error: artistsError } = await supabaseServer
      .from("artists")
      .select(
        "id, name, slug, designation, intro_text, profile_image_url, hero_image_url, hero_image_position_x, hero_image_position_y",
      )
      .in("id", orderedArtistIds)
      .eq("status", "approved");

    if (artistsError) throw artistsError;

    const approvedArtistIds = (artists ?? []).map((artist) => String(artist.id));

    const { data: songLinks, error: songLinksError } =
      approvedArtistIds.length > 0
        ? await supabaseServer
            .from("song_artists")
            .select("song_id, artist_id")
            .in("artist_id", approvedArtistIds)
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

    const artistById = new Map(
      (artists ?? []).map((artist) => [String(artist.id), artist] as const),
    );

    return NextResponse.json({
      artists: orderedArtistIds.flatMap((artistId) => {
        const artist = artistById.get(artistId);
        if (!artist) return [];

        const linkedSongIds = songIdsByArtist.get(artistId) ?? new Set<string>();

        return [
          {
            id: artistId,
            name: String(artist.name || ""),
            slug: String(artist.slug || ""),
            designation: artist.designation ? String(artist.designation) : null,
            intro_text: artist.intro_text ? String(artist.intro_text) : null,
            profile_image_url: artist.profile_image_url
              ? String(artist.profile_image_url)
              : null,
            hero_image_url: artist.hero_image_url
              ? String(artist.hero_image_url)
              : null,
            hero_image_position_x: Number(artist.hero_image_position_x ?? 50),
            hero_image_position_y: Number(artist.hero_image_position_y ?? 50),
            songs: songs.filter((song) => linkedSongIds.has(song.id)),
          },
        ];
      }),
    });
  } catch (error) {
    console.error("Discover featured artists fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to load featured artists" },
      { status: 500 },
    );
  }
}
