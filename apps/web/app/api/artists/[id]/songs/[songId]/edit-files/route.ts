import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import {
  getSongPendingRevision,
  mergeSongPendingRevision,
} from "@/lib/songPendingRevisions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params:
    | Promise<{ id: string; songId: string }>
    | { id: string; songId: string };
};

async function requirePrimarySong(artistId: string, songId: string) {
  const { data, error } = await supabaseServer
    .from("song_artists")
    .select("song_id")
    .eq("artist_id", artistId)
    .eq("song_id", songId)
    .eq("role", "primary")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    await requireArtistPermission(id, "catalog:view");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const [songResult, pendingRevision, releaseLinkResult] = await Promise.all([
      supabaseServer
        .from("songs")
        .select(
          "id, title, status, audio_url, playback_url, hls_url, waveform_peaks, duration, size_bytes, cover_url, stems",
        )
        .eq("id", songId)
        .maybeSingle(),
      getSongPendingRevision(songId),
      supabaseServer
        .from("artist_release_songs")
        .select("release_id")
        .eq("song_id", songId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (songResult.error) throw songResult.error;
    if (releaseLinkResult.error) throw releaseLinkResult.error;
    if (!songResult.data) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    let currentRelease: {
      id: string;
      title: string;
      cover_image_url: string | null;
      release_type: string;
      status: string;
    } | null = null;

    if (releaseLinkResult.data?.release_id) {
      const { data: release, error: releaseError } = await supabaseServer
        .from("artist_releases")
        .select("id, title, cover_image_url, release_type, status")
        .eq("id", releaseLinkResult.data.release_id)
        .maybeSingle();

      if (releaseError) throw releaseError;
      currentRelease = release ?? null;
    }

    return NextResponse.json({
      song: mergeSongPendingRevision(songResult.data, pendingRevision),
      current_release: currentRelease,
      revision_status: pendingRevision?.status ?? null,
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load artist song edit files:", error);
    return NextResponse.json(
      { error: "Failed to load track files" },
      { status: 500 },
    );
  }
}