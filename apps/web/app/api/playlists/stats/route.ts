import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type PlaylistSongRow = {
  playlist_id: number;
  song_id: string;
};

type PlaylistGenreRow = {
  id: string | number;
  genres: string[] | null;
};

type PlaylistStats = {
  songCount: number;
  topGenres: string[];
};

function quoteFilterValue(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

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
  const uniqueSongIds = [
    ...new Set(rows.map((row) => row.song_id).filter(Boolean)),
  ];

  let songRows: PlaylistGenreRow[] = [];

  if (uniqueSongIds.length > 0) {
    const { data: songs, error: songsError } = await supabaseServer
      .from("songs")
      .select("id, genres")
      .filter(
        "id",
        "in",
        `(${uniqueSongIds.map(quoteFilterValue).join(",")})`,
      );

    if (songsError) {
      return NextResponse.json(
        {
          error: songsError.message,
          details: songsError.details,
          hint: songsError.hint,
          code: songsError.code,
        },
        { status: 500 },
      );
    }

    songRows = (songs ?? []) as PlaylistGenreRow[];
  }

  const genresBySongId = new Map(
    songRows.map((song) => [
      String(song.id),
      Array.isArray(song.genres) ? song.genres : [],
    ]),
  );
  const rowsByPlaylistId = new Map<number, PlaylistSongRow[]>();

  rows.forEach((row) => {
    const current = rowsByPlaylistId.get(row.playlist_id) ?? [];
    current.push(row);
    rowsByPlaylistId.set(row.playlist_id, current);
  });

  const stats = Object.fromEntries(
    playlistIds.map((playlistId): [number, PlaylistStats] => {
      const genreCounts = new Map<string, number>();
      let songCount = 0;

      (rowsByPlaylistId.get(playlistId) ?? []).forEach((row) => {
        const genres = genresBySongId.get(row.song_id);
        if (!genres) return;

        songCount += 1;
        genres.forEach((genre) => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
      });

      return [
        playlistId,
        {
          songCount,
          topGenres: [...genreCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genre]) => genre),
        },
      ];
    }),
  );

  return NextResponse.json({ stats });
}
