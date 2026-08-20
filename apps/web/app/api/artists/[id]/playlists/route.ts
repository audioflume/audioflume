import { NextResponse } from "next/server";

import { cleanOptionalString } from "@/lib/account";
import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function normalizePlaylistIds(value: unknown) {
  if (!Array.isArray(value)) return null;

  const playlistIds = value.filter(
    (playlistId): playlistId is string =>
      typeof playlistId === "string" && playlistId.length > 0,
  );
  const uniquePlaylistIds = [...new Set(playlistIds)];

  if (uniquePlaylistIds.length !== value.length || uniquePlaylistIds.length > 100) {
    return null;
  }

  return uniquePlaylistIds;
}

async function requireApprovedArtist(artistId: string) {
  const { data: artist, error } = await supabaseServer
    .from("artists")
    .select("id, status")
    .eq("id", artistId)
    .maybeSingle();

  if (error) throw error;
  if (!artist) {
    return { error: "Artist not found", status: 404 as const };
  }
  if (artist.status !== "approved") {
    return {
      error: "Artist profile must be approved before managing playlists",
      status: 403 as const,
    };
  }

  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:view");

    const [playlistsResult, songLinksResult] = await Promise.all([
      supabaseServer
        .from("artist_playlists")
        .select(
          "id, artist_id, name, description, cover_image_url, is_public, position, created_at, updated_at",
        )
        .eq("artist_id", id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabaseServer
        .from("song_artists")
        .select("song_id")
        .eq("artist_id", id),
    ]);

    if (playlistsResult.error) throw playlistsResult.error;
    if (songLinksResult.error) throw songLinksResult.error;

    const playlists = playlistsResult.data ?? [];
    const playlistIds = playlists
      .map((playlist) => playlist.id)
      .filter((playlistId): playlistId is string => typeof playlistId === "string");
    const songIds = (songLinksResult.data ?? [])
      .map((link) => link.song_id)
      .filter((songId): songId is string => typeof songId === "string");

    const [playlistSongsResult, songsResult] = await Promise.all([
      playlistIds.length > 0
        ? supabaseServer
            .from("artist_playlist_songs")
            .select("playlist_id, song_id, position")
            .in("playlist_id", playlistIds)
            .order("position", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      songIds.length > 0
        ? supabaseServer
            .from("songs")
            .select("*")
            .in("id", songIds)
            .neq("status", "rejected")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (playlistSongsResult.error) throw playlistSongsResult.error;
    if (songsResult.error) throw songsResult.error;

    const songsByPlaylist = new Map<string, string[]>();
    for (const item of playlistSongsResult.data ?? []) {
      if (typeof item.playlist_id !== "string" || typeof item.song_id !== "string") {
        continue;
      }
      const current = songsByPlaylist.get(item.playlist_id) ?? [];
      current.push(item.song_id);
      songsByPlaylist.set(item.playlist_id, current);
    }

    return NextResponse.json({
      playlists: playlists.map((playlist) => ({
        ...playlist,
        song_ids: songsByPlaylist.get(playlist.id) ?? [],
      })),
      songs: (songsResult.data ?? []).map((song) => ({
        ...song,
        player_song: normalizeSongRow(song),
      })),
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to load artist playlists:", error);
    return NextResponse.json(
      { error: "Failed to load artist playlists" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireArtistPermission(id, "playlist:manage");

    const artistError = await requireApprovedArtist(id);
    if (artistError) {
      return NextResponse.json(
        { error: artistError.error },
        { status: artistError.status },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = cleanOptionalString(body.name, 180);
    const description = cleanOptionalString(body.description, 1000);
    const isPublic = body.is_public === true;

    if (!name) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
    }

    const { data: lastPlaylist, error: positionError } = await supabaseServer
      .from("artist_playlists")
      .select("position")
      .eq("artist_id", id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (positionError) throw positionError;
    const position = Number(lastPlaylist?.position ?? -1) + 1;

    const { data: playlist, error: playlistError } = await supabaseServer
      .from("artist_playlists")
      .insert({
        artist_id: id,
        name,
        description,
        is_public: isPublic,
        position,
        created_by_clerk_user_id: access.userId,
      })
      .select(
        "id, artist_id, name, description, cover_image_url, is_public, position, created_at, updated_at",
      )
      .single();

    if (playlistError) throw playlistError;

    return NextResponse.json(
      { playlist: { ...playlist, song_ids: [] } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to create artist playlist:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create artist playlist",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "playlist:manage");

    const artistError = await requireApprovedArtist(id);
    if (artistError) {
      return NextResponse.json(
        { error: artistError.error },
        { status: artistError.status },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const playlistIds = normalizePlaylistIds(body.playlist_ids);

    if (!playlistIds) {
      return NextResponse.json(
        { error: "Invalid playlist order" },
        { status: 400 },
      );
    }

    const { data: ownedPlaylists, error: ownedError } = await supabaseServer
      .from("artist_playlists")
      .select("id")
      .eq("artist_id", id);

    if (ownedError) throw ownedError;

    const ownedIds = (ownedPlaylists ?? [])
      .map((playlist) => playlist.id)
      .filter((playlistId): playlistId is string => typeof playlistId === "string");

    if (
      ownedIds.length !== playlistIds.length ||
      ownedIds.some((playlistId) => !playlistIds.includes(playlistId))
    ) {
      return NextResponse.json(
        { error: "Playlist order must include every playlist for this artist" },
        { status: 400 },
      );
    }

    const updates = await Promise.all(
      playlistIds.map((playlistId, position) =>
        supabaseServer
          .from("artist_playlists")
          .update({ position })
          .eq("id", playlistId)
          .eq("artist_id", id),
      ),
    );

    const updateError = updates.find((result) => result.error)?.error;
    if (updateError) throw updateError;

    return NextResponse.json({ playlist_ids: playlistIds });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to reorder artist playlists:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reorder artist playlists",
      },
      { status: 500 },
    );
  }
}
