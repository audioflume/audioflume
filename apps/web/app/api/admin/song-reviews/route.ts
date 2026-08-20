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

    const { data: songs, error: songsError } = await supabaseServer
      .from("songs")
      .select("id, title, artist, status, duration, key, bpm, created_at")
      .in("id", songIds)
      .in("status", [...REVIEW_STATUSES])
      .order("created_at", { ascending: false });

    if (songsError) throw songsError;

    const artistIds = [
      ...new Set(
        (songs ?? [])
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
      songs: (songs ?? []).map((song) => {
        const artistId = primaryArtistBySong.get(song.id);

        return {
          ...song,
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
