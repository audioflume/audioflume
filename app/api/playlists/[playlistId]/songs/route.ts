import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import base from "@/lib/airtable";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Song } from "@/lib/types";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

type StemItem = {
  name: string;
  url: string;
};

type AirtableSongFields = {
  "Song Title"?: string;
  Artist?: string;
  Genre?: string[] | string;
  Genres?: string[] | string;
  Mood?: string[] | string;
  Moods?: string[] | string;
  Instrument?: string[] | string;
  Instruments?: string[] | string;
  Build?: string[] | string;
  Builds?: string[] | string;
  Vocals?: string[] | string;
  Instrumental?: boolean | string;
  Stems?: unknown;
  "Stem Files"?: unknown;
  "Cover Art"?: unknown;
  "Cover URL"?: string;
  "Audio URL"?: string;
  "R2 Audio URL"?: string;
  "Waveform Peaks"?: string;
  waveformPeaks?: string;
  Key?: string;
  BPM?: number | string;
  Duration?: string | number;
  "Edit Points"?: string;
};

type PlaylistSongRow = {
  id: number;
  playlist_id: number;
  song_id: string;
  position: number;
  created_at: string;
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

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return ["true", "yes", "1", "instrumental"].includes(
      value.trim().toLowerCase(),
    );
  }

  return false;
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item: unknown) => getStringArray(item))
      .map((item: string) => item.trim())
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

function getStems(value: unknown): StemItem[] {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return getStems(JSON.parse(value));
    } catch {
      return value
        .split("\n")
        .map((url, index) => {
          const cleanUrl = url.trim();

          if (!cleanUrl) return null;

          return {
            name: `Stem ${index + 1}`,
            url: cleanUrl,
          };
        })
        .filter((item): item is StemItem => Boolean(item));
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();

        if (!url) return null;

        return {
          name: `Stem ${index + 1}`,
          url,
        };
      }

      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;

      const name =
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : `Stem ${index + 1}`;

      const url =
        typeof record.url === "string" && record.url.trim()
          ? record.url.trim()
          : "";

      if (!url) return null;

      return { name, url };
    })
    .filter((item): item is StemItem => Boolean(item));
}

function getDurationSeconds(value: unknown) {
  if (!value) return 0;

  if (typeof value === "number") {
    return value;
  }

  const parts = String(value)
    .split(":")
    .map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getCoverArt(fields: AirtableSongFields) {
  if (typeof fields["Cover URL"] === "string" && fields["Cover URL"].trim()) {
    return fields["Cover URL"];
  }

  const coverArt = fields["Cover Art"];

  if (Array.isArray(coverArt)) {
    return (coverArt[0] as { url?: string })?.url ?? null;
  }

  if (typeof coverArt === "string" && coverArt.trim()) {
    return coverArt;
  }

  return null;
}

function normalizeAirtableSong(
  recordId: string,
  fields: AirtableSongFields,
): Song {
  return {
    id: recordId,
    title: getString(fields["Song Title"]),
    artist: getString(fields.Artist),
    audioUrl: getString(fields["Audio URL"] || fields["R2 Audio URL"]),
    stems: getStems(fields.Stems || fields["Stem Files"]),
    coverArt: getCoverArt(fields),
    waveformPeaks:
      getString(fields["Waveform Peaks"] || fields.waveformPeaks) || "[]",
    duration: getDurationSeconds(fields.Duration),
    key: getString(fields.Key),
    bpm: getNumber(fields.BPM),
    genres: getStringArray(fields.Genres || fields.Genre),
    moods: getStringArray(fields.Moods || fields.Mood),
    instruments: getStringArray(fields.Instruments || fields.Instrument),
    builds: getStringArray(fields.Builds || fields.Build),
    vocals: getStringArray(fields.Vocals),
    instrumental: getBoolean(fields.Instrumental),
    editPoints:
      getString(fields["Edit Points"]) || '{"markers":[],"ranges":[]}',
  };
}

function getFallbackPlaylistSong(playlistSong: PlaylistSongRow): PlaylistSong {
  return {
    playlist_song_id: playlistSong.id,
    playlist_id: playlistSong.playlist_id,
    song_id: playlistSong.song_id,
    position: playlistSong.position,
    created_at: playlistSong.created_at,

    id: playlistSong.song_id,
    title: "",
    artist: "",
    audioUrl: "",
    stems: [],
    coverArt: null,
    waveformPeaks: "[]",
    duration: 0,
    key: "",
    bpm: 0,
    genres: [],
    moods: [],
    instruments: [],
    builds: [],
    vocals: [],
    instrumental: false,
    editPoints: '{"markers":[],"ranges":[]}',
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

    const tableId = process.env.AIRTABLE_SONGS_TABLE_ID;

    if (!tableId) {
      return NextResponse.json(
        { error: "Missing AIRTABLE_SONGS_TABLE_ID" },
        { status: 500 },
      );
    }

    const { data: playlistSongs, error } = await supabaseServer
      .from("playlist_songs")
      .select("*")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true });

    if (error) {
      throw error;
    }

    if (!playlistSongs?.length) {
      return NextResponse.json([]);
    }

    const songs = await Promise.all(
      (playlistSongs as PlaylistSongRow[]).map(async (playlistSong) => {
        try {
          const record = await base(tableId).find(playlistSong.song_id);
          const normalizedSong = normalizeAirtableSong(
            record.id,
            record.fields as AirtableSongFields,
          );

          return mergePlaylistSong(playlistSong, normalizedSong);
        } catch {
          return getFallbackPlaylistSong(playlistSong);
        }
      }),
    );

    return NextResponse.json(songs);
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
