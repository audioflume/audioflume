import { NextResponse } from "next/server";

import { cleanOptionalString } from "@/lib/account";
import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params:
    | Promise<{ id: string; playlistId: string }>
    | { id: string; playlistId: string };
};

function normalizeSongIds(value: unknown) {
  if (!Array.isArray(value)) return null;

  const songIds = value.filter(
    (songId): songId is string => typeof songId === "string" && songId.length > 0,
  );
  const uniqueSongIds = [...new Set(songIds)];

  if (uniqueSongIds.length !== value.length || uniqueSongIds.length > 200) {
    return null;
  }

  return uniqueSongIds;
}

async function requirePlaylistOwnership(artistId: string, playlistId: string) {
  const { data, error } = await supabaseServer
    .from("artist_playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, playlistId } = await context.params;
    await requireArtistPermission(id, "playlist:manage");

    const ownsPlaylist = await requirePlaylistOwnership(id, playlistId);
    if (!ownsPlaylist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const { data: artist, error: artistError } = await supabaseServer
      .from("artists")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (artistError) throw artistError;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    if (artist.status !== "approved") {
      return NextResponse.json(
        { error: "Artist profile must be approved before managing playlists" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = cleanOptionalString(body.name, 180);
    const description = cleanOptionalString(body.description, 1000);
    const songIds = normalizeSongIds(body.song_ids);

    if (!name) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
    }
    if (typeof body.is_public !== "boolean") {
      return NextResponse.json(
        { error: "Playlist visibility is invalid" },
        { status: 400 },
      );
    }
    if (!songIds) {
      return NextResponse.json(
        { error: "Invalid playlist track list" },
        { status: 400 },
      );
    }

    if (songIds.length > 0) {
      const { data: songLinks, error: songLinksError } = await supabaseServer
        .from("song_artists")
        .select("song_id")
        .eq("artist_id", id)
        .in("song_id", songIds);

      if (songLinksError) throw songLinksError;

      const ownedSongIds = new Set(
        (songLinks ?? [])
          .map((link) => link.song_id)
          .filter((songId): songId is string => typeof songId === "string"),
      );

      if (songIds.some((songId) => !ownedSongIds.has(songId))) {
        return NextResponse.json(
          { error: "A playlist can only contain tracks from this artist catalogue" },
          { status: 403 },
        );
      }

      const { data: songs, error: songsError } = await supabaseServer
        .from("songs")
        .select("id, status")
        .in("id", songIds);

      if (songsError) throw songsError;
      if ((songs ?? []).some((song) => song.status === "rejected")) {
        return NextResponse.json(
          { error: "Rejected tracks cannot be added to a playlist" },
          { status: 400 },
        );
      }
    }

    const { data: playlist, error: updateError } = await supabaseServer
      .from("artist_playlists")
      .update({
        name,
        description,
        is_public: body.is_public,
      })
      .eq("id", playlistId)
      .eq("artist_id", id)
      .select(
        "id, artist_id, name, description, cover_image_url, is_public, position, created_at, updated_at",
      )
      .maybeSingle();

    if (updateError) throw updateError;
    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseServer
      .from("artist_playlist_songs")
      .delete()
      .eq("playlist_id", playlistId);

    if (deleteError) throw deleteError;

    if (songIds.length > 0) {
      const { error: insertError } = await supabaseServer
        .from("artist_playlist_songs")
        .insert(
          songIds.map((songId, position) => ({
            playlist_id: playlistId,
            song_id: songId,
            position,
          })),
        );

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      playlist: {
        ...playlist,
        song_ids: songIds,
      },
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to update artist playlist:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update artist playlist",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id, playlistId } = await context.params;
    await requireArtistPermission(id, "playlist:manage");

    const ownsPlaylist = await requirePlaylistOwnership(id, playlistId);
    if (!ownsPlaylist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const { data: artist, error: artistError } = await supabaseServer
      .from("artists")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (artistError) throw artistError;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    if (artist.status !== "approved") {
      return NextResponse.json(
        { error: "Artist profile must be approved before managing playlists" },
        { status: 403 },
      );
    }

    const { data: deletedPlaylist, error: deleteError } = await supabaseServer
      .from("artist_playlists")
      .delete()
      .eq("id", playlistId)
      .eq("artist_id", id)
      .select("id")
      .maybeSingle();

    if (deleteError) throw deleteError;
    if (!deletedPlaylist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted_playlist_id: playlistId });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to delete artist playlist:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete artist playlist",
      },
      { status: 500 },
    );
  }
}
