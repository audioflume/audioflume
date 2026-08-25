import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  buildPlaylistProfile,
  scorePlaylistSimilarity,
  summarizePlaylistProfile,
  type PlaylistProfileContext,
  type PlaylistProfileSong,
} from "@/lib/playlistProfiles";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const MAX_RECOMMENDATIONS = 14;
const PROFILE_SONG_SELECT =
  "id, artist, bpm, genres, moods, regions, instruments, builds, vocals, instrumental";

type SourceKind =
  | "playlist"
  | "community"
  | "curated"
  | "favorites"
  | "artist";

type SourceDescriptor = {
  songIds: string[];
  context: PlaylistProfileContext;
  excludeCuratedPlaylistId: number | null;
};

type CuratedPlaylistRow = {
  id: number;
  name: string;
  cover_image_url: string | null;
  browse_tags: string[] | null;
  browse_subcategories: string[] | null;
  position: number | null;
};

type CuratedPlaylistSongRow = {
  curated_playlist_id: number;
  song_id: string;
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
    value === "artist"
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
      excludeCuratedPlaylistId: null,
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
      excludeCuratedPlaylistId: Number(playlist.id),
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
      excludeCuratedPlaylistId: null,
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
    excludeCuratedPlaylistId: null,
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

    const [sourceSongs, playlistsResult, playlistSongsResult] =
      await Promise.all([
        loadProfileSongs(source.songIds),
        supabaseServer
          .from("curated_playlists")
          .select(
            "id, name, cover_image_url, browse_tags, browse_subcategories, position",
          )
          .order("position", { ascending: true }),
        supabaseServer
          .from("curated_playlist_songs")
          .select("curated_playlist_id, song_id"),
      ]);

    if (playlistsResult.error) throw playlistsResult.error;
    if (playlistSongsResult.error) throw playlistSongsResult.error;

    const curatedPlaylists = (playlistsResult.data ?? []) as CuratedPlaylistRow[];
    const curatedPlaylistSongs = (playlistSongsResult.data ?? []) as CuratedPlaylistSongRow[];
    const candidateSongIds = uniqueSongIds(curatedPlaylistSongs);
    const candidateSongs = await loadProfileSongs(candidateSongIds);
    const songById = new Map(candidateSongs.map((song) => [String(song.id), song]));
    const songIdsByPlaylist = new Map<number, string[]>();

    curatedPlaylistSongs.forEach((row) => {
      const playlistId = Number(row.curated_playlist_id);
      const current = songIdsByPlaylist.get(playlistId) ?? [];
      current.push(String(row.song_id));
      songIdsByPlaylist.set(playlistId, current);
    });

    const sourceProfile = buildPlaylistProfile(sourceSongs, source.context);
    const recommendations = curatedPlaylists
      .filter(
        (playlist) =>
          source.excludeCuratedPlaylistId === null ||
          Number(playlist.id) !== source.excludeCuratedPlaylistId,
      )
      .map((playlist) => {
        const songs = (songIdsByPlaylist.get(Number(playlist.id)) ?? [])
          .map((songId) => songById.get(songId))
          .filter((song): song is ProfileSongRow => Boolean(song));
        const profile = buildPlaylistProfile(
          songs,
          sourceContext(playlist.browse_tags, playlist.browse_subcategories),
        );

        return {
          id: Number(playlist.id),
          name: playlist.name,
          cover_image_url: playlist.cover_image_url,
          song_count: songs.length,
          position: Number(playlist.position ?? 0),
          score: scorePlaylistSimilarity(sourceProfile, profile),
        };
      })
      .filter((playlist) => playlist.song_count > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.song_count - a.song_count ||
          a.position - b.position ||
          a.name.localeCompare(b.name),
      )
      .slice(0, MAX_RECOMMENDATIONS)
      .map(({ position: _position, ...playlist }) => ({
        ...playlist,
        score: Number(playlist.score.toFixed(4)),
      }));

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
