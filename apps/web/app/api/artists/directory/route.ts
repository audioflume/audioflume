import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { attachEditPoints, attachPrimaryArtistProfiles, normalizeSongRow } from "@/lib/songs";

type ArtistRow = {
  id: string;
  name: string | null;
  slug: string | null;
  designation: string | null;
  intro_text: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  hero_image_position_x: number | null;
  hero_image_position_y: number | null;
};

type SongLink = { artist_id: string; song_id: string };
type GenreSong = { id: string; genres: string[] | null };

export async function GET() {
  try {
    const { data, error: artistError } = await supabaseServer
      .from("artists")
      .select("id, name, slug, designation, intro_text, profile_image_url, hero_image_url, hero_image_position_x, hero_image_position_y")
      .eq("status", "approved")
      .order("name", { ascending: true });

    if (artistError) throw artistError;

    const artists = (data ?? []) as ArtistRow[];
    const ids = artists.map((artist) => artist.id);
    const links: SongLink[] = [];

    for (let start = 0; start < ids.length; start += 100) {
      const { data: batch, error } = await supabaseServer
        .from("song_artists")
        .select("artist_id, song_id")
        .in("artist_id", ids.slice(start, start + 100));
      if (error) throw error;
      links.push(...((batch ?? []) as SongLink[]));
    }

    const songIds = [...new Set(links.map((link) => link.song_id))];
    const songs: GenreSong[] = [];

    for (let start = 0; start < songIds.length; start += 100) {
      const { data: batch, error } = await supabaseServer
        .from("songs")
        .select("*")
        .in("id", songIds.slice(start, start + 100))
        .eq("status", "published");
      if (error) throw error;
      songs.push(...((batch ?? []) as GenreSong[]));
    }

    const playableSongs = await attachPrimaryArtistProfiles(
      await attachEditPoints(songs.map((song) => normalizeSongRow(song))),
    );
    const songsById = new Map(playableSongs.map((song) => [song.id, song]));
    const songIdsByArtist = new Map<string, string[]>();
    for (const link of links) {
      if (!songsById.has(link.song_id)) continue;
      const artistSongIds = songIdsByArtist.get(link.artist_id) ?? [];
      if (!artistSongIds.includes(link.song_id)) artistSongIds.push(link.song_id);
      songIdsByArtist.set(link.artist_id, artistSongIds);
    }

    const genresBySong = new Map(songs.map((song) => [song.id, song.genres ?? []]));
    const genresByArtist = new Map<string, Set<string>>();
    const trackCounts = new Map<string, number>();

    for (const link of links) {
      const genres = genresBySong.get(link.song_id);
      if (!genres) continue;

      trackCounts.set(link.artist_id, (trackCounts.get(link.artist_id) ?? 0) + 1);
      const artistGenres = genresByArtist.get(link.artist_id) ?? new Set<string>();
      for (const genre of genres) {
        if (typeof genre === "string" && genre.trim()) artistGenres.add(genre.trim());
      }
      genresByArtist.set(link.artist_id, artistGenres);
    }

    return NextResponse.json({
      artists: artists
        .filter((artist) => artist.slug && artist.name)
        .map((artist) => ({
          id: artist.id,
          name: artist.name,
          slug: artist.slug,
          designation: artist.designation,
          intro_text: artist.intro_text,
          profile_image_url: artist.profile_image_url,
          hero_image_url: artist.hero_image_url,
          hero_image_position_x: artist.hero_image_position_x ?? 50,
          hero_image_position_y: artist.hero_image_position_y ?? 50,
          genres: [...(genresByArtist.get(artist.id) ?? [])].sort((a, b) => a.localeCompare(b)),
          track_count: trackCounts.get(artist.id) ?? 0,
          songs: (songIdsByArtist.get(artist.id) ?? [])
            .map((songId) => songsById.get(songId))
            .filter((song) => Boolean(song)),
        })),
    });
  } catch (error) {
    console.error("Public artist directory lookup failed:", error);
    return NextResponse.json({ error: "Unable to load artists" }, { status: 500 });
  }
}
