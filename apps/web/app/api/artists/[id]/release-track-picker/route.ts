import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { attachEditPoints, normalizeSongRow } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "release:manage");

    const { data: links, error: linksError } = await supabaseServer
      .from("song_artists")
      .select("song_id")
      .eq("artist_id", id)
      .eq("role", "primary");

    if (linksError) throw linksError;

    const songIds = (links ?? [])
      .map((link) => link.song_id)
      .filter((songId): songId is string => typeof songId === "string");

    if (songIds.length === 0) {
      return NextResponse.json({ songs: [] });
    }

    const { data: rows, error: songsError } = await supabaseServer
      .from("songs")
      .select(
        "id, title, artist, status, audio_url, playback_url, hls_url, cover_url, stems, waveform_peaks, duration, key, bpm, genres, moods, regions, instruments, builds, vocals, instrumental, ai_generated, edit_points, download_count, size_bytes, created_at",
      )
      .in("id", songIds)
      .neq("status", "rejected")
      .order("created_at", { ascending: false });

    if (songsError) throw songsError;

    const statusById = new Map(
      (rows ?? []).map((row) => [String(row.id), String(row.status || "draft")]),
    );
    const songs = await attachEditPoints((rows ?? []).map(normalizeSongRow));

    return NextResponse.json({
      songs: songs.map((song) => ({
        ...song,
        status: statusById.get(song.id) ?? "draft",
      })),
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to load release track picker:", error);
    return NextResponse.json(
      { error: "Failed to load tracks" },
      { status: 500 },
    );
  }
}
