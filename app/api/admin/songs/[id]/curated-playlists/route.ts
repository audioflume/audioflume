import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_req: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const decodedSongId = decodeURIComponent(id);

    const { data, error } = await supabaseServer
      .from("curated_playlist_songs")
      .select("curated_playlist_id")
      .eq("song_id", decodedSongId);

    if (error) throw error;

    return NextResponse.json({
      selected_playlist_ids: (data ?? []).map((row) => row.curated_playlist_id),
    });
  } catch (err) {
    console.error("Admin curated playlist selections fetch failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load selections" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const decodedSongId = decodeURIComponent(id);
    const body = await req.json();
    const playlistId = Number(body.playlist_id);
    const selected = Boolean(body.selected);

    if (!Number.isFinite(playlistId)) {
      return NextResponse.json({ error: "Missing playlist_id" }, { status: 400 });
    }

    if (!selected) {
      const { error } = await supabaseServer
        .from("curated_playlist_songs")
        .delete()
        .eq("curated_playlist_id", playlistId)
        .eq("song_id", decodedSongId);

      if (error) throw error;
      return NextResponse.json({ selected: false, playlist_id: playlistId });
    }

    const { data: existing, error: existingError } = await supabaseServer
      .from("curated_playlist_songs")
      .select("*")
      .eq("curated_playlist_id", playlistId)
      .eq("song_id", decodedSongId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ selected: true, playlist_id: playlistId });

    const { data: lastSong, error: positionError } = await supabaseServer
      .from("curated_playlist_songs")
      .select("position")
      .eq("curated_playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition = lastSong?.[0]?.position != null ? lastSong[0].position + 1 : 0;

    const { error } = await supabaseServer.from("curated_playlist_songs").insert({
      curated_playlist_id: playlistId,
      song_id: decodedSongId,
      position: nextPosition,
    });

    if (error) throw error;

    return NextResponse.json({ selected: true, playlist_id: playlistId });
  } catch (err) {
    console.error("Admin curated playlist selection update failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update selection" },
      { status: 500 },
    );
  }
}
