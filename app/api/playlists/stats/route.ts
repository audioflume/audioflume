import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import base from "@/lib/airtable";
import { supabaseServer } from "@/lib/supabaseServer";

type PlaylistSongRow = {
  playlist_id: number;
  song_id: string;
};

type AirtableSongFields = {
  Genre?: string[] | string;
  Genres?: string[] | string;
};

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item: unknown) => getStringArray(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ stats: {} });
  }

  const tableId = process.env.AIRTABLE_SONGS_TABLE_ID;

  if (!tableId) {
    return NextResponse.json(
      { error: "Missing AIRTABLE_SONGS_TABLE_ID" },
      { status: 500 },
    );
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

  const playlistIds = (playlists ?? []).map((playlist) => playlist.id);

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
  const uniqueSongIds = [...new Set(rows.map((row) => row.song_id))];

  const songGenreEntries: Array<[string, string[]]> = await Promise.all(
    uniqueSongIds.map(async (songId): Promise<[string, string[]]> => {
      try {
        const record = await base(tableId).find(songId);
        const fields = record.fields as AirtableSongFields;

        return [songId, getStringArray(fields.Genres ?? fields.Genre)];
      } catch {
        return [songId, []];
      }
    }),
  );

  const genresBySongId = new Map<string, string[]>(songGenreEntries);

  const stats = Object.fromEntries(
    playlistIds.map((playlistId) => {
      const rowsForPlaylist = rows.filter(
        (row) => row.playlist_id === playlistId,
      );

      const genreCounts = new Map<string, number>();

      rowsForPlaylist.forEach((row) => {
        const genres = genresBySongId.get(row.song_id) ?? [];

        genres.forEach((genre) => {
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
          songCount: rowsForPlaylist.length,
          topGenres,
        },
      ];
    }),
  );

  return NextResponse.json({ stats });
}
