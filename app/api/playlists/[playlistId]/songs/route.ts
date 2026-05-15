import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Song } from "@/lib/types";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

type StemItem = {
  name: string;
  url: string;
};

type PlaylistSongRow = {
  id: number;
  playlist_id: number;
  song_id: string;
  position: number;
  created_at: string;
};

type SupabaseSongRow = {
  id: string | number;
  title: string | null;
  artist: string | null;
  audio_url: string | null;
  cover_url: string | null;
  stems: string | null;
  waveform_peaks: string | null;
  duration: number | null;
  key: string | null;
  bpm: number | null;
  genres: string[] | null;
  moods: string[] | null;
  instruments: string[] | null;
  builds: string[] | null;
  vocals: string[] | null;
  instrumental: boolean | null;
  edit_points: string | null;
};

type PlaylistSong = Song & {
  playlist_song_id: number;
  playlist_id: number;
  song_id: string;
  position: number;
  created_at: string;
};

async function verifyPlaylistOwner(playlistId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from("playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("clerk_user_id", userId)
    .single();

  if (error || !data) return false;

  return true;
}

async function verifySongExists(songId: string) {
  const { data, error } = await supabaseServer
    .from("songs")
    .select("id")
    .eq("id", songId)
    .maybeSingle();

  if (error || !data) return false;

  return true;
}

function getStemNameFromUrl(url: string, index: number) {
  const decodedUrl = decodeURIComponent(url);
  const filename =
    decodedUrl
      .split("/")
      .pop()
      ?.replace(/\.[^/.]+$/, "") || "";

  if (filename) {
    return filename
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return `Stem ${index + 1}`;
}

function parseStems(value: string | null): StemItem[] {
  if (!value) return [];

  return value
    .split("\n")
    .map((url, index) => {
      const cleanUrl = url.trim();

      if (!cleanUrl) return null;

      return {
        name: getStemNameFromUrl(cleanUrl, index),
        url: cleanUrl,
      };
    })
    .filter((item): item is StemItem => Boolean(item));
}

function normalizeSongRow(row: SupabaseSongRow): Song {
  return {
    id: String(row.id),
    title: String(row.title || ""),
    artist: String(row.artist || ""),
    audioUrl: String(row.audio_url || ""),
    coverArt: row.cover_url ? String(row.cover_url) : null,
    stems: parseStems(row.stems),
    waveformPeaks: String(row.waveform_peaks || "[]"),
    duration: Number(row.duration || 0),
    key: String(row.key || ""),
    bpm: Number(row.bpm || 0),
    genres: Array.isArray(row.genres) ? row.genres : [],
    moods: Array.isArray(row.moods) ? row.moods : [],
    instruments: Array.isArray(row.instruments) ? row.instruments : [],
    builds: Array.isArray(row.builds) ? row.builds : [],
    vocals: Array.isArray(row.vocals) ? row.vocals : [],
    instrumental: Boolean(row.instrumental),
    editPoints: String(row.edit_points || '{"markers":[],"ranges":[]}'),
  };
}

function mergePlaylistSong(
  playlistSong: PlaylistSongRow,
  song: Song,
): PlaylistSong {
  return {
    ...song,
    playlist_song_id: playlistSong.id,
    playlist_id: playlistSong.playlist_id,
    song_id: playlistSong.song_id,
    position: playlistSong.position,
    created_at: playlistSong.created_at,
  };
}

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistId } = await context.params;
    const isOwner = await verifyPlaylistOwner(playlistId, userId);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 },
      );
    }

    const { data: playlistSongs, error: playlistSongsError } =
      await supabaseServer
        .from("playlist_songs")
        .select("*")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });

    if (playlistSongsError) {
      throw playlistSongsError;
    }

    const rows = (playlistSongs ?? []) as PlaylistSongRow[];

    if (!rows.length) {
      return NextResponse.json([]);
    }

    const songIds = [
      ...new Set(rows.map((row) => row.song_id).filter(Boolean)),
    ];

    if (!songIds.length) {
      return NextResponse.json([]);
    }

    const { data: songs, error: songsError } = await supabaseServer
      .from("songs")
      .select("*")
      .in("id", songIds);

    if (songsError) {
      throw songsError;
    }

    const songsById = new Map(
      ((songs ?? []) as SupabaseSongRow[]).map((song) => [
        String(song.id),
        normalizeSongRow(song),
      ]),
    );

    const playlistSongResults = rows
      .map((playlistSong) => {
        const song = songsById.get(playlistSong.song_id);

        if (!song) return null;

        return mergePlaylistSong(playlistSong, song);
      })
      .filter((song): song is PlaylistSong => Boolean(song));

    return NextResponse.json(playlistSongResults);
  } catch (err) {
    console.error("Failed to load playlist songs:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load playlist songs",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistId } = await context.params;
    const body = await req.json();

    const songId =
      typeof body.song_id === "string" ? decodeURIComponent(body.song_id) : "";

    if (!songId) {
      return NextResponse.json({ error: "Missing song_id" }, { status: 400 });
    }

    const isOwner = await verifyPlaylistOwner(playlistId, userId);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 },
      );
    }

    const songExists = await verifySongExists(songId);

    if (!songExists) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const { data: existingSong, error: existingError } = await supabaseServer
      .from("playlist_songs")
      .select("*")
      .eq("playlist_id", playlistId)
      .eq("song_id", songId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingSong) {
      return NextResponse.json(existingSong);
    }

    const { data: lastSong, error: positionError } = await supabaseServer
      .from("playlist_songs")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) {
      throw positionError;
    }

    const nextPosition =
      lastSong?.[0]?.position != null ? lastSong[0].position + 1 : 0;

    const requestedPosition = Number(body.position);

    const { data, error } = await supabaseServer
      .from("playlist_songs")
      .insert({
        playlist_id: Number(playlistId),
        song_id: songId,
        position: Number.isFinite(requestedPosition)
          ? requestedPosition
          : nextPosition,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to add playlist song:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to add song to playlist",
      },
      { status: 500 },
    );
  }
}
