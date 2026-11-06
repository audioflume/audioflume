import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { attachEditPoints, normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SONG_FIELDS = "id, title, artist, audio_url, playback_url, hls_url, cover_url, stems, waveform_peaks, duration, key, bpm, genres, moods, regions, instruments, builds, vocals, instrumental, ai_generated, license_type, edit_points, download_count, size_bytes, created_at";
const MAX_FEATURED_SONGS = 6;

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string")
    .map((id) => id.trim()).filter((id) => UUID_PATTERN.test(id)))];
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("discover_featured_songs")) {
    return "Featured songs require the Discover featured songs database migration.";
  }
  return message;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    if (new URL(request.url).searchParams.has("picker")) {
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabaseServer.from("songs")
          .select(SONG_FIELDS).eq("status", "published")
          .order("created_at", { ascending: false }).range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return NextResponse.json({ songs: await attachEditPoints(rows.map(normalizeSongRow)) });
    }

    const { data: rows, error } = await supabaseServer.from("discover_featured_songs")
      .select("song_id, position").order("position", { ascending: true });
    if (error) throw error;
    const ids = (rows ?? []).map((row) => String(row.song_id));
    if (!ids.length) return NextResponse.json({ items: [] });

    const { data: songs, error: songsError } = await supabaseServer.from("songs")
      .select(SONG_FIELDS).in("id", ids).eq("status", "published");
    if (songsError) throw songsError;
    const normalized = await attachEditPoints((songs ?? []).map(normalizeSongRow));
    const byId = new Map(normalized.map((song) => [song.id, song]));
    return NextResponse.json({ items: ids.flatMap((id, position) => {
      const song = byId.get(id);
      return song ? [{ song_id: id, position, song }] : [];
    }) });
  } catch (error) {
    console.error("Admin Discover featured songs fetch failed:", error);
    return NextResponse.json({ error: failure(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const ids = cleanIds((await request.json()).song_ids);
    if (!ids.length) return NextResponse.json({ error: "Select at least one song" }, { status: 400 });
    const { data: existing, error } = await supabaseServer.from("discover_featured_songs")
      .select("song_id, position").order("position", { ascending: true });
    if (error) throw error;
    const existingIds = new Set((existing ?? []).map((row) => String(row.song_id)));
    const newIds = ids.filter((id) => !existingIds.has(id));
    if (existingIds.size + newIds.length > MAX_FEATURED_SONGS) {
      return NextResponse.json({ error: "Featured Songs supports a maximum of six songs." }, { status: 400 });
    }
    if (!newIds.length) return NextResponse.json({ success: true });
    const { data: published, error: songsError } = await supabaseServer.from("songs")
      .select("id").in("id", newIds).eq("status", "published");
    if (songsError) throw songsError;
    if ((published ?? []).length !== newIds.length) {
      return NextResponse.json({ error: "Only published songs can be featured." }, { status: 400 });
    }
    const position = Math.max(-1, ...(existing ?? []).map((row) => Number(row.position)));
    const { error: insertError } = await supabaseServer.from("discover_featured_songs")
      .insert(newIds.map((songId, index) => ({ song_id: songId, position: position + index + 1 })));
    if (insertError) throw insertError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Discover featured songs add failed:", error);
    return NextResponse.json({ error: failure(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await request.json();
    const ids = cleanIds(body.song_ids);
    const { data: existing, error } = await supabaseServer.from("discover_featured_songs").select("song_id");
    if (error) throw error;
    const currentIds = (existing ?? []).map((row) => String(row.song_id));
    if (ids.length !== currentIds.length || ids.some((id) => !currentIds.includes(id))) {
      return NextResponse.json({ error: "Song order must include all featured songs." }, { status: 400 });
    }
    const updates = await Promise.all(ids.map((id, position) =>
      supabaseServer.from("discover_featured_songs").update({ position }).eq("song_id", id)));
    const failed = updates.find((result) => result.error);
    if (failed?.error) throw failed.error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Discover featured songs reorder failed:", error);
    return NextResponse.json({ error: failure(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const { song_id: id } = await request.json();
    if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: "Invalid song ID" }, { status: 400 });
    }
    const { error } = await supabaseServer.from("discover_featured_songs").delete().eq("song_id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Discover featured songs remove failed:", error);
    return NextResponse.json({ error: failure(error) }, { status: 500 });
  }
}
