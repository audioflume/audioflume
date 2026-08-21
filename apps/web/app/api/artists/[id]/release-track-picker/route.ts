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
      return NextResponse.json({ songs: [], unavailable_song_ids: [] });
    }

    const [songsResult, releaseLinksResult] = await Promise.all([
      supabaseServer
        .from("songs")
        .select(
          "id, title, artist, audio_url, playback_url, hls_url, cover_url, stems, waveform_peaks, duration, key, bpm, genres, moods, regions, instruments, builds, vocals, instrumental, ai_generated, license_type, edit_points, download_count, size_bytes, created_at",
        )
        .in("id", songIds)
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      supabaseServer
        .from("artist_release_songs")
        .select("song_id")
        .in("song_id", songIds),
    ]);

    if (songsResult.error) throw songsResult.error;
    if (releaseLinksResult.error) throw releaseLinksResult.error;

    const songs = await attachEditPoints(
      (songsResult.data ?? []).map(normalizeSongRow),
    );
    const unavailableSongIds = [
      ...new Set(
        (releaseLinksResult.data ?? [])
          .map((link) => link.song_id)
          .filter((songId): songId is string => typeof songId === "string"),
      ),
    ];

    return NextResponse.json({
      songs,
      unavailable_song_ids: unavailableSongIds,
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