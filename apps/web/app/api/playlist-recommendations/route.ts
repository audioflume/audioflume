import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  buildPlaylistProfile,
  scorePlaylistSimilarity,
  summarizePlaylistProfile,
  type PlaylistProfileContext,
  type PlaylistProfileSong,
} from "@/lib/playlistProfiles";
import { attachPrimaryArtistProfiles, normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const MAX_RECOMMENDATIONS = 14;
const PROFILE_SONG_SELECT =
  "id, artist, bpm, genres, moods, regions, instruments, builds, vocals, instrumental";
const SONG_SELECT =
  "id, title, artist, audio_url, playback_url, hls_url, cover_url, stems, waveform_peaks, duration, key, bpm, genres, moods, regions, instruments, builds, vocals, instrumental, ai_generated, license_type, edit_points, download_count, size_bytes, created_at";

type SourceKind =
  | "playlist"
  | "community"
  | "curated"
  | "favorites"
  | "artist"
  | "album";

type SourceDescriptor = {
  songIds: string[];
  context: PlaylistProfileContext;
};

type ProfileSongRow = PlaylistProfileSong & {
  id: string;
};

function parseSourceKind(value: string | null): SourceKind | null {
  if (
    value === "playlist" ||
    value === "community" ||
    value === "curated" ||
    value === "favorites" ||
    value === "artist" ||
    value === "album"
  ) {
    return value;
  }
  return null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function uniqueSongIds(rows: Array<{ song_id?: unknown }>) {
  return [
    ...new Set(
      rows
        .map((row) =>
          typeof row.song_id === "string" ? row.song_id.trim() : "",
        )
        .filter(Boolean),
    ),
  ];
}

function sourceContext(
  tags: unknown,
  subcategories: unknown,
): PlaylistProfileContext {
  return {
    tags: stringArray(tags),
    subcategories: stringArray(subcategories),
  };
}

async function loadPlaylistSongIds(table: string, foreignKey: string, id: string) {
  const { data, error } = await supabaseServer
    .from(table)
    .select("song_id")
    .eq(foreignKey, id);

  if (error) throw error;
  return uniqueSongIds((data ?? []) as Array<{ song_id?: unknown }>);
}

async function loadSource(
  kind: SourceKind,
  id: string | null,
  userId: string | null,
): Promise<SourceDescriptor | null> {
  if (kind === "favorites") {
    if (!userId) return null;

    const { data, error } = await supabaseServer
      .from("favorites")
      .select("song_id")
      .eq("clerk_user_id", userId);

    if (error) throw error;
    return {
      songIds: uniqueSongIds((data ?? []) as Array<{ song_id?: unknown }>),
      context: {},
    };
  }

  if (!id) return null;

  if (kind === "curated") {
    const { data: playlist, error } = await supabaseServer
      .from("curated_playlists")
      .select("id, browse_tags, browse_subcategories")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!playlist) return null;

    return {
      songIds: await loadPlaylistSongIds(
        "curated_playlist_songs",
        "curated_playlist_id",
        id,
      ),
      context: sourceContext(
        playlist.browse_tags,
        playlist.browse_subcategories,
      ),
    };
  }

  if (kind === "artist") {
    const { data: playlist, error } = await supabaseServer
      .from("artist_playlists")
      .select("id")
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle();

    if (error) throw error;
    if (!playlist) return null;

    return {
      songIds: await loadPlaylistSongIds(
        "artist_playlist_songs",
        "playlist_id",
        id,
      ),
      context: {},
    };
  }

  if (kind === "album") {
    const { data: release, error } = await supabaseServer
      .from("artist_releases")
      .select("id")
      .eq("id", id)
      .eq("status", "published")
      .eq("release_type", "album")
      .maybeSingle();

    if (error) throw error;
    if (!release) return null;

    return {
      songIds: await loadPlaylistSongIds(
        "artist_release_songs",
        "release_id",
        id,
      ),
      context: {},
    };
  }

  let playlistQuery = supabaseServer
    .from("playlists")
    .select("id, primary_category, secondary_categories")
    .eq("id", id);

  if (kind === "community") {
    playlistQuery = playlistQuery.eq("is_public", true);
  } else {
    if (!userId) return null;
    playlistQuery = playlistQuery.eq("clerk_user_id", userId);
  }

  const { data: playlist, error } = await playlistQuery.maybeSingle();
  if (error) throw error;
  if (!playlist) return null;

  return {
    songIds: await loadPlaylistSongIds("playlist_songs", "playlist_id", id),
    context: sourceContext(
      playlist.primary_category ? [playlist.primary_category] : [],
      playlist.secondary_categories,
    ),
  };
}

async function loadProfileSongs(songIds: string[]) {
  if (!songIds.length) return [] as ProfileSongRow[];

  const { data, error } = await supabaseServer
    .from("songs")
    .select(PROFILE_SONG_SELECT)
    .in("id", songIds);

  if (error) throw error;
  return (data ?? []) as ProfileSongRow[];
}

export async function GET(request: Request) {
  const { userId } = await auth();
  const url = new URL(request.url);
  const kind = parseSourceKind(url.searchParams.get("kind"));
  const id = url.searchParams.get("id")?.trim() || null;

  if (!kind || (kind !== "favorites" && !id)) {
    return NextResponse.json(
      { error: "Invalid playlist recommendation source" },
      { status: 400 },
    );
  }

  try {
    const source = await loadSource(kind, id, userId);
    if (!source) {
      return NextResponse.json(
        { error: "Playlist source not found" },
        { status: kind === "playlist" || kind === "favorites" ? 401 : 404 },
      );
    }

    const [sourceSongs, candidatesResult] = await Promise.all([
      loadProfileSongs(source.songIds),
      supabaseServer
        .from("songs")
        .select(PROFILE_SONG_SELECT)
        .eq("status", "published"),
    ]);

    if (candidatesResult.error) throw candidatesResult.error;

    const sourceProfile = buildPlaylistProfile(sourceSongs, source.context);
    const sourceSongIds = new Set(source.songIds);
    const scoredCandidates = ((candidatesResult.data ?? []) as ProfileSongRow[])
      .filter((song) => !sourceSongIds.has(String(song.id)))
      .map((song) => ({
        id: String(song.id),
        score: scorePlaylistSimilarity(
          sourceProfile,
          buildPlaylistProfile([song]),
        ),
      }))
      .filter((song) => song.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, MAX_RECOMMENDATIONS);

    if (scoredCandidates.length === 0) {
      return NextResponse.json({
        profile: summarizePlaylistProfile(sourceProfile),
        recommendations: [],
      });
    }

    const recommendationIds = scoredCandidates.map((song) => song.id);
    const { data: recommendationRows, error: recommendationError } =
      await supabaseServer
        .from("songs")
        .select(SONG_SELECT)
        .in("id", recommendationIds)
        .eq("status", "published");

    if (recommendationError) throw recommendationError;

    const normalizedSongs = await attachPrimaryArtistProfiles(
      (recommendationRows ?? []).map((row) => normalizeSongRow(row)),
    );
    const songById = new Map(normalizedSongs.map((song) => [song.id, song]));
    const recommendations = scoredCandidates.flatMap(({ id: songId, score }) => {
      const song = songById.get(songId);
      if (!song) return [];

      return [
        {
          ...song,
          score: Number(score.toFixed(4)),
        },
      ];
    });

    return NextResponse.json({
      profile: summarizePlaylistProfile(sourceProfile),
      recommendations,
    });
  } catch (error) {
    console.error("Playlist recommendations failed:", error);
    return NextResponse.json(
      { error: "Failed to load playlist recommendations" },
      { status: 500 },
    );
  }
}
