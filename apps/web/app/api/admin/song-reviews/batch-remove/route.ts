import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

// Removing songs from Music Review never deletes their records or audio.
// Rejected songs must remain available for artists to edit and resubmit.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const ids = [...new Set(
      (Array.isArray(body.songIds) ? body.songIds : [])
        .filter((value: unknown): value is string => typeof value === "string" && value.length > 0),
    )];
    if (!ids.length) return NextResponse.json({ error: "Select songs first" }, { status: 400 });

    const { data, error } = await supabaseServer
      .from("songs")
      .select("id, status")
      .in("id", ids);
    if (error) throw error;
    if ((data ?? []).length !== ids.length) {
      return NextResponse.json({ error: "Some songs no longer exist. Refresh the queue." }, { status: 409 });
    }
    if ((data ?? []).some(song => song.status !== "published" && song.status !== "rejected")) {
      return NextResponse.json({ error: "Only published and rejected songs can be removed from the review queue." }, { status: 400 });
    }

    const { error: exclusionError } = await supabaseServer
      .from("music_review_queue_exclusions")
      .upsert(ids.map(song_id => ({ song_id })), { onConflict: "song_id" });
    if (exclusionError) throw exclusionError;

    return NextResponse.json({ removedSongIds: ids, hiddenCount: ids.length, deletedCount: 0 });
  } catch (error) {
    console.error("Review queue removal failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove songs" }, { status: 500 });
  }
}
