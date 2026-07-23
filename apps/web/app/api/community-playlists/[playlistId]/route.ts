import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  isCommunityPlaylistCategory,
  normalizeCommunityPlaylistCategories,
} from "@/lib/communityPlaylistCategories";
import type { Song } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

type CommunityPlaylistRow = {
  id: number;
  clerk_user_id: string;
  name: string;
  cover_image_url: string | null;
  published_at: string | null;
  primary_category: string | null;
  secondary_categories: string[] | null;
  play_count: number | string | null;
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
  ai_generated: boolean | null;
  edit_points: string | null;
};

type StemItem = {
  name: string;
  url: string;
};

type CommunityPlaylistSong = Song & {
  playlist_song_id: number;
  playlist_id: number;
  song_id: string;
  position: number;
  created_at: string;
};

const PLAYLIST_SONG_SELECT =
  "id, playlist_id, song_id, position, created_at";
const SONG_SELECT =
  "id, title, artist, audio_url, cover_url, stems, waveform_peaks, duration, key, bpm, genres, moods, instruments, builds, vocals, instrumental, ai_generated, edit_points";

function getDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Filmwave member"
  );
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
      .replace(/\b\w/g, (character) => character.toUpperCase());
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
    playbackUrl: String(row.audio_url || ""),
    hlsUrl: "",
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
    aiGenerated: Boolean(row.ai_generated),
    editPoints: String(row.edit_points || '{"markers":[],"ranges":[]}'),
  };
}

function mergePlaylistSong(
  playlistSong: PlaylistSongRow,
  song: Song,
): CommunityPlaylistSong {
  return {
    ...song,
    playlist_song_id: playlistSong.id,
    playlist_id: playlistSong.playlist_id,
    song_id: playlistSong.song_id,
    position: playlistSong.position,
    created_at: playlistSong.created_at,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { playlistId } = await context.params;
    const numericPlaylistId = Number(playlistId);

    if (!Number.isInteger(numericPlaylistId) || numericPlaylistId <= 0) {
      return NextResponse.json(
        { error: "Community playlist not found" },
        { status: 404 },
      );
    }

    const { data: playlistData, error: playlistError } = await supabaseServer
      .from("playlists")
      .select(
        "id, clerk_user_id, name, cover_image_url, published_at, primary_category, secondary_categories, play_count",
      )
      .eq("id", numericPlaylistId)
      .eq("is_public", true)
      .maybeSingle();

    if (playlistError) throw playlistError;
    if (!playlistData) {
      return NextResponse.json(
        { error: "Community playlist not found" },
        { status: 404 },
      );
    }

    const playlist = playlistData as CommunityPlaylistRow;
    const [playlistSongsResult, favoritesResult] = await Promise.all([
      supabaseServer
        .from("playlist_songs")
        .select(PLAYLIST_SONG_SELECT)
        .eq("playlist_id", numericPlaylistId)
        .order("position", { ascending: true }),
      supabaseServer
        .from("community_playlist_favorites")
        .select("playlist_id", { count: "exact", head: true })
        .eq("playlist_id", numericPlaylistId),
    ]);

    if (playlistSongsResult.error) throw playlistSongsResult.error;
    if (favoritesResult.error) throw favoritesResult.error;

    const playlistSongRows =
      (playlistSongsResult.data ?? []) as PlaylistSongRow[];
    const songIds = [
      ...new Set(playlistSongRows.map((item) => item.song_id).filter(Boolean)),
    ];

    let songs: CommunityPlaylistSong[] = [];
    if (songIds.length > 0) {
      const { data: songRows, error: songsError } = await supabaseServer
        .from("songs")
        .select(SONG_SELECT)
        .filter(
          "id",
          "in",
          `(${songIds.map((songId) => `"${songId}"`).join(",")})`,
        );

      if (songsError) throw songsError;

      const songsById = new Map(
        ((songRows ?? []) as SupabaseSongRow[]).map((song) => [
          String(song.id),
          normalizeSongRow(song),
        ]),
      );

      songs = playlistSongRows
        .map((playlistSong) => {
          const song = songsById.get(playlistSong.song_id);
          return song ? mergePlaylistSong(playlistSong, song) : null;
        })
        .filter((song): song is CommunityPlaylistSong => Boolean(song));
    }

    let creator = { name: "Filmwave member", imageUrl: null as string | null };
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(playlist.clerk_user_id);
      creator = {
        name: getDisplayName(user),
        imageUrl: user.imageUrl ?? null,
      };
    } catch {
      // Keep the fallback creator when the Clerk profile is unavailable.
    }

    return NextResponse.json(
      {
        playlist: {
          id: playlist.id,
          name: playlist.name,
          cover_image_url: playlist.cover_image_url,
          published_at: playlist.published_at,
          primary_category: isCommunityPlaylistCategory(
            playlist.primary_category,
          )
            ? playlist.primary_category
            : null,
          secondary_categories: normalizeCommunityPlaylistCategories(
            playlist.secondary_categories,
          ),
          song_count: songs.length,
          play_count: Math.max(0, Number(playlist.play_count) || 0),
          like_count: favoritesResult.count ?? 0,
          creator,
        },
        songs,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Community playlist detail fetch error:", error);
    return NextResponse.json(
      { error: "Could not load community playlist" },
      { status: 500 },
    );
  }
}
