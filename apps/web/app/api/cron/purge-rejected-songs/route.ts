import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { deleteFilesFromR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

const RETENTION_DAYS = 30;
const MAX_PER_RUN = 25;
const MAX_CANDIDATES = 500;

function fileKey(url: unknown): string | null {
  if (typeof url !== "string" || !url.trim()) return null;
  try {
    const value = new URL(url);
    if (value.protocol !== "https:") return null;
    return decodeURIComponent(value.pathname.replace(/^\/+/, ""));
  } catch { return null; }
}

function stems(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? value.split("\n").map(item => item.trim()).filter(Boolean) : [];
}

// This endpoint is scheduled daily by Vercel. Do not permit unauthenticated deletion.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data: rejected, error } = await supabaseServer.from("songs")
      .select("id,title,status,audio_url,playback_url,hls_url,cover_url,stems")
      .eq("status", "rejected")
      .order("created_at", { ascending: true })
      .limit(MAX_CANDIDATES);
    if (error) throw error;

    const removed: string[] = [];
    const skipped: string[] = [];
    for (const song of rejected ?? []) {
      if (removed.length >= MAX_PER_RUN) break;
      // Never use song creation time; eligibility starts at the latest rejection event.
      const { data: latest, error: eventError } = await supabaseServer
        .from("song_review_events")
        .select("action,created_at")
        .eq("song_id", song.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (eventError) throw eventError;
      if (!latest || latest.action !== "rejected" || latest.created_at > cutoff) {
        skipped.push(song.id);
        continue;
      }

      // Verify the row is still rejected immediately before destructive work.
      const { data: current, error: currentError } = await supabaseServer.from("songs")
        .select("status").eq("id", song.id).single();
      if (currentError) throw currentError;
      if (current.status !== "rejected") { skipped.push(song.id); continue; }

      // DB first: never delete assets for a song that is still retained in the library.
      for (const table of ["playlist_songs", "favorites"]) {
        const result = await supabaseServer.from(table).delete().eq("song_id", song.id);
        if (result.error) throw result.error;
      }
      const assets = await supabaseServer.from("project_assets").delete()
        .eq("asset_type", "song").eq("asset_id", song.id);
      if (assets.error) throw assets.error;
      const deleted = await supabaseServer.from("songs")
        .delete().eq("id", song.id).eq("status", "rejected").select("id");
      if (deleted.error) throw deleted.error;
      if (!deleted.data?.length) { skipped.push(song.id); continue; }

      const keys = [...new Set([
        song.audio_url, song.playback_url, song.hls_url, song.cover_url, ...stems(song.stems),
      ].map(fileKey).filter((value): value is string => Boolean(value)))];
      if (keys.length) await deleteFilesFromR2(keys);
      removed.push(song.id);
    }
    return NextResponse.json({ retentionDays: RETENTION_DAYS, removedCount: removed.length, removed, skippedCount: skipped.length });
  } catch (error) {
    console.error("Rejected song retention cleanup failed:", error);
    return NextResponse.json({ error: "Rejected song cleanup failed" }, { status: 500 });
  }
}
