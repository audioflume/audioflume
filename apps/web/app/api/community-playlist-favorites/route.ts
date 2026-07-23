import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function parsePlaylistId(value: unknown) {
  const playlistId = Number(value);
  return Number.isInteger(playlistId) && playlistId > 0 ? playlistId : null;
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("community_playlist_favorites")
      .select("playlist_id")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      {
        favorite_playlist_ids: (data ?? [])
          .map((item) => Number(item.playlist_id))
          .filter((playlistId) => Number.isInteger(playlistId)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Community playlist favorites fetch error:", error);
    return NextResponse.json(
      { error: "Could not load favorite playlists" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const playlistId = parsePlaylistId(body?.playlist_id);

    if (!playlistId) {
      return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
    }

    const { data: playlist, error: playlistError } = await supabaseServer
      .from("playlists")
      .select("id")
      .eq("id", playlistId)
      .eq("is_public", true)
      .maybeSingle();

    if (playlistError) throw playlistError;
    if (!playlist) {
      return NextResponse.json(
        { error: "Public playlist not found" },
        { status: 404 },
      );
    }

    const { error } = await supabaseServer
      .from("community_playlist_favorites")
      .upsert(
        { clerk_user_id: userId, playlist_id: playlistId },
        { onConflict: "clerk_user_id,playlist_id", ignoreDuplicates: true },
      );

    if (error) throw error;

    return NextResponse.json({ playlist_id: playlistId, is_favorite: true });
  } catch (error) {
    console.error("Community playlist favorite create error:", error);
    return NextResponse.json(
      { error: "Could not favorite playlist" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const playlistId = parsePlaylistId(body?.playlist_id);

    if (!playlistId) {
      return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("community_playlist_favorites")
      .delete()
      .eq("clerk_user_id", userId)
      .eq("playlist_id", playlistId);

    if (error) throw error;

    return NextResponse.json({ playlist_id: playlistId, is_favorite: false });
  } catch (error) {
    console.error("Community playlist favorite delete error:", error);
    return NextResponse.json(
      { error: "Could not remove favorite playlist" },
      { status: 500 },
    );
  }
}
