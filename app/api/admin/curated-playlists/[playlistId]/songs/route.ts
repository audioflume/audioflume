import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

export async function GET(_req: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { GET } = await import("@/app/api/curated-playlists/[playlistId]/songs/route");
    return GET(_req, context);
  } catch {
    return NextResponse.json({ error: "Failed to load songs" }, { status: 500 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { playlistId } = await context.params;
    const body = await req.json();
    const songId = typeof body.song_id === "string" ? body.song_id.trim() : "";

    if (!songId) {
      return NextResponse.json({ error: "Missing song_id" }, { status: 400 });
    }

    const { data: existingSong, error: existingError } = await supabaseServer
      .from("curated_playlist_songs")
      .select("*")
      .eq("curated_playlist_id", playlistId)
      .eq("song_id", songId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingSong) return NextResponse.json(existingSong);

    const { data: lastSong, error: positionError } = await supabaseServer
      .from("curated_playlist_songs")
      .select("position")
      .eq("curated_playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition = lastSong?.[0]?.position != null ? lastSong[0].position + 1 : 0;

    const { data, error } = await supabaseServer
      .from("curated_playlist_songs")
      .insert({
        curated_playlist_id: Number(playlistId),
        song_id: songId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("Admin curated playlist song add failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add song" },
      { status: 500 },
    );
  }
}
