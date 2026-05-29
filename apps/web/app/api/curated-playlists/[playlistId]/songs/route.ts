import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizeSongRow } from "@/lib/songs";
import type { CuratedPlaylistSong } from "@/lib/curatedPlaylists";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

type PlaylistSongRow = {
  id: number;
  curated_playlist_id: number;
  song_id: string;
  position: number;
  created_at: string;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { playlistId } = await context.params;

    const { data: playlistSongs, error: playlistSongsError } =
      await supabaseServer
        .from("curated_playlist_songs")
        .select("*")
        .eq("curated_playlist_id", playlistId)
        .order("position", { ascending: true });

    if (playlistSongsError) throw playlistSongsError;

    const rows = (playlistSongs ?? []) as PlaylistSongRow[];
    const songIds = [...new Set(rows.map((row) => row.song_id).filter(Boolean))];

    if (!songIds.length) return NextResponse.json([]);

    const { data: songs, error: songsError } = await supabaseServer
      .from("songs")
      .select("*")
      .in("id", songIds);

    if (songsError) throw songsError;

    const songsById = new Map(
      (songs ?? []).map((song) => [String(song.id), normalizeSongRow(song)]),
    );

    const results = rows
      .map((playlistSong): CuratedPlaylistSong | null => {
        const song = songsById.get(playlistSong.song_id);
        if (!song) return null;

        return {
          ...song,
          curated_playlist_song_id: playlistSong.id,
          curated_playlist_id: playlistSong.curated_playlist_id,
          song_id: playlistSong.song_id,
          position: playlistSong.position,
          created_at: playlistSong.created_at,
        };
      })
      .filter((song): song is CuratedPlaylistSong => Boolean(song));

    return NextResponse.json(results);
  } catch (err) {
    console.error("Curated playlist songs fetch failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load songs" },
      { status: 500 },
    );
  }
}
