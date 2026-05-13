import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params:
    | Promise<{
        songId: string;
      }>
    | {
        songId: string;
      };
};

async function getOwnedPlaylistIds(userId: string) {
  const { data, error } = await supabaseServer
    .from("playlists")
    .select("id")
    .eq("clerk_user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((playlist) => playlist.id);
}

async function verifyPlaylistOwner(playlistId: number, userId: string) {
  const { data, error } = await supabaseServer
    .from("playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("clerk_user_id", userId)
    .single();

  if (error || !data) return false;

  return true;
}

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { songId } = await context.params;
    const decodedSongId = decodeURIComponent(songId);
    const playlistIds = await getOwnedPlaylistIds(userId);

    if (playlistIds.length === 0) {
      return NextResponse.json({
        selected_playlist_ids: [],
      });
    }

    const { data: playlistSongs, error } = await supabaseServer
      .from("playlist_songs")
      .select("playlist_id")
      .eq("song_id", decodedSongId)
      .in("playlist_id", playlistIds);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      selected_playlist_ids: (playlistSongs ?? []).map(
        (item) => item.playlist_id,
      ),
    });
  } catch (err) {
    console.error("Playlist selection fetch failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load playlist selections",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { songId } = await context.params;
    const decodedSongId = decodeURIComponent(songId);
    const body = await req.json();

    const playlistId = Number(body.playlist_id);
    const selected = body.selected;

    if (!Number.isFinite(playlistId)) {
      return NextResponse.json(
        { error: "Invalid playlist_id" },
        { status: 400 },
      );
    }

    if (typeof selected !== "boolean") {
      return NextResponse.json(
        { error: "Invalid selected value" },
        { status: 400 },
      );
    }

    const isOwner = await verifyPlaylistOwner(playlistId, userId);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 },
      );
    }

    if (selected) {
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

      const { error: insertError } = await supabaseServer
        .from("playlist_songs")
        .upsert(
          {
            playlist_id: playlistId,
            song_id: decodedSongId,
            position: nextPosition,
            added_at: new Date().toISOString(),
          },
          {
            onConflict: "playlist_id,song_id",
          },
        );

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json({
        playlist_id: playlistId,
        song_id: decodedSongId,
        selected: true,
      });
    }

    const { error: deleteError } = await supabaseServer
      .from("playlist_songs")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("song_id", decodedSongId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      playlist_id: playlistId,
      song_id: decodedSongId,
      selected: false,
    });
  } catch (err) {
    console.error("Playlist selection update failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to update playlist selection",
      },
      { status: 500 },
    );
  }
}
