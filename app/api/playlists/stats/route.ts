import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSongs } from "@/lib/songs";

type PlaylistSongRow = {
  playlist_id: number;
  song_id: string;
};

type PlaylistStats = {
  songCount: number;
  topGenres: string[];
};

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ stats: {} });
  }

  const { data: playlists, error: playlistsError } = await supabaseServer
    .from("playlists")
    .select("id")
    .eq("clerk_user_id", userId);

  if (playlistsError) {
    return NextResponse.json(
      {
        error: playlistsError.message,
        details: playlistsError.details,
        hint: playlistsError.hint,
        code: playlistsError.code,
      },
      { status: 500 },
    );
  }

  const playlistIds = (playlists ?? [])
    .map((playlist) => Number(playlist.id))
    .filter((id) => Number.isFinite(id));

  if (playlistIds.length === 0) {
    return NextResponse.json({ stats: {} });
  }

  const { data: playlistSongs, error: playlistSongsError } =
    await supabaseServer
      .from("playlist_songs")
      .select("playlist_id, song_id")
      .in("playlist_id", playlistIds);

  if (playlistSongsError) {
    return NextResponse.json(
      {
        error: playlistSongsError.message,
        details: playlistSongsError.details,
        hint: playlistSongsError.hint,
        code: playlistSongsError.code,
      },
      { status: 500 },
    );
  }

  const rows = (playlistSongs ?? []) as PlaylistSongRow[];
  const songs = await getSongs();
  const songsById = new Map(songs.map((song) => [song.id, song]));

  const stats = Object.fromEntries(
    playlistIds.map((playlistId): [number, PlaylistStats] => {
      const rowsForPlaylist = rows.filter(
        (row) => row.playlist_id === playlistId,
      );

      const validSongsForPlaylist = rowsForPlaylist
        .map((row) => songsById.get(row.song_id))
        .filter((song): song is NonNullable<typeof song> => Boolean(song));

      const genreCounts = new Map<string, number>();

      validSongsForPlaylist.forEach((song) => {
        song.genres.forEach((genre) => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
      });

      const topGenres = [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      return [
        playlistId,
        {
          songCount: validSongsForPlaylist.length,
          topGenres,
        },
      ];
    }),
  );

  return NextResponse.json({ stats });
}
