import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const REVIEW_STATUSES = [
  "submitted",
  "changes_requested",
  "rejected",
  "approved",
  "published",
] as const;

export async function GET() {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data: links, error: linksError } = await supabaseServer
      .from("song_artists")
      .select("song_id, artist_id, role, position")
      .eq("role", "primary")
      .order("position", { ascending: true });

    if (linksError) throw linksError;

    const primaryArtistBySong = new Map<string, string>();

    for (const link of links ?? []) {
      if (
        typeof link.song_id === "string" &&
        typeof link.artist_id === "string" &&
        !primaryArtistBySong.has(link.song_id)
      ) {
        primaryArtistBySong.set(link.song_id, link.artist_id);
      }
    }

    const songIds = [...primaryArtistBySong.keys()];

    if (songIds.length === 0) {
      return NextResponse.json({ songs: [] });
    }

    const [songsResult, revisionsResult] = await Promise.all([
      supabaseServer
        .from("songs")
        .select("id, title, artist, status, duration, key, bpm, created_at")
        .in("id", songIds)
        .in("status", [...REVIEW_STATUSES])
        .order("created_at", { ascending: false }),
      supabaseServer
        .from("song_pending_revisions")
        .select("song_id, status, metadata, duration, updated_at")
        .in("song_id", songIds),
    ]);

    if (songsResult.error) throw songsResult.error;
    if (revisionsResult.error) throw revisionsResult.error;

    const songs = songsResult.data ?? [];
    const revisionBySongId = new Map(
      (revisionsResult.data ?? []).map((revision) => [revision.song_id, revision]),
    );

    const artistIds = [
      ...new Set(
        songs
          .map((song) => primaryArtistBySong.get(song.id))
          .filter((artistId): artistId is string => Boolean(artistId)),
      ),
    ];

    const artistsById = new Map<
      string,
      { id: string; name: string; slug: string; status: string }
    >();

    if (artistIds.length > 0) {
      const { data: artists, error: artistsError } = await supabaseServer
        .from("artists")
        .select("id, name, slug, status")
        .in("id", artistIds);

      if (artistsError) throw artistsError;

      for (const artist of artists ?? []) {
        artistsById.set(artist.id, artist);
      }
    }

    return NextResponse.json({
      songs: songs.map((song) => {
        const artistId = primaryArtistBySong.get(song.id);
        const revision = revisionBySongId.get(song.id);
        const metadata =
          revision?.metadata && typeof revision.metadata === "object"
            ? (revision.metadata as Record<string, unknown>)
            : {};

        return {
          ...song,
          ...(revision
            ? {
                title:
                  typeof metadata.title === "string" ? metadata.title : song.title,
                duration: revision.duration ?? song.duration,
                key:
                  typeof metadata.key === "string" || metadata.key === null
                    ? metadata.key
                    : song.key,
                bpm:
                  typeof metadata.bpm === "number" || metadata.bpm === null
                    ? metadata.bpm
                    : song.bpm,
                status: revision.status,
                revision_pending: true,
                live_status: song.status,
                revision_updated_at: revision.updated_at,
              }
            : {
                revision_pending: false,
                live_status: song.status,
              }),
          artist_profile: artistId ? artistsById.get(artistId) ?? null : null,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load admin song review queue:", error);

    return NextResponse.json(
      { error: "Failed to load music review queue" },
      { status: 500 },
    );
  }
}
