import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import { deleteFilesFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

function r2Key(url: unknown) {
  if (typeof url !== "string" || !url.trim()) return null;
  try { return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, "")); }
  catch { return null; }
}
function stemUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? value.split("\n").map(v => v.trim()).filter(Boolean) : [];
}
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await request.json();
    const ids = [...new Set((Array.isArray(body.songIds) ? body.songIds : []).filter((v: unknown): v is string => typeof v === "string" && v.length > 0))];
    if (!ids.length) return NextResponse.json({ error: "Select songs first" }, { status: 400 });
    const { data, error } = await supabaseServer.from("songs")
      .select("id,status,audio_url,cover_url,stems").in("id", ids);
    if (error) throw error;
    if ((data ?? []).length !== ids.length) return NextResponse.json({ error: "Some songs no longer exist. Refresh the queue." }, { status: 409 });
    const invalid = (data ?? []).find(song => song.status !== "published" && song.status !== "rejected");
    if (invalid) return NextResponse.json({ error: "Only published and rejected songs can be removed from the review queue." }, { status: 400 });

    const publishedIds = (data ?? []).filter(song => song.status === "published").map(song => song.id);
    const rejectedRows = (data ?? []).filter(song => song.status === "rejected");
    if (publishedIds.length) {
      const { error: insertError } = await supabaseServer.from("music_review_queue_exclusions")
        .upsert(publishedIds.map(song_id => ({ song_id })), { onConflict: "song_id" });
      if (insertError) throw insertError;
    }
    if (rejectedRows.length) {
      const rejectedIds = rejectedRows.map(song => song.id);
      const keys = [...new Set(rejectedRows.flatMap(song =>
        [song.audio_url, song.cover_url, ...stemUrls(song.stems)].map(r2Key).filter((v): v is string => Boolean(v))
      ))];
      if (keys.length) await deleteFilesFromR2(keys);
      for (const table of ["playlist_songs", "favorites"]) {
        const result = await supabaseServer.from(table).delete().in("song_id", rejectedIds);
        if (result.error) throw result.error;
      }
      const assets = await supabaseServer.from("project_assets").delete()
        .eq("asset_type", "song").in("asset_id", rejectedIds);
      if (assets.error) throw assets.error;
      const removed = await supabaseServer.from("songs").delete().in("id", rejectedIds);
      if (removed.error) throw removed.error;
    }
    return NextResponse.json({ removedSongIds: ids, hiddenCount: publishedIds.length, deletedCount: rejectedRows.length });
  } catch (error) {
    console.error("Review queue removal failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove songs" }, { status: 500 });
  }
}
