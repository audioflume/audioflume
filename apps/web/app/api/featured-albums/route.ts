import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const { data: releases, error: releasesError } = await supabaseServer
      .from("artist_releases")
      .select("id, title, cover_image_url, release_date, created_at")
      .eq("status", "published")
      .eq("release_type", "album")
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(12);

    if (releasesError) throw releasesError;

    const releaseIds = (releases ?? [])
      .map((release) => String(release.id || ""))
      .filter(Boolean);

    if (releaseIds.length === 0) {
      return NextResponse.json({ albums: [] });
    }

    const { data: links, error: linksError } = await supabaseServer
      .from("artist_release_artists")
      .select("release_id, artist_id, position")
      .in("release_id", releaseIds)
      .eq("role", "primary")
      .order("position", { ascending: true });

    if (linksError) throw linksError;

    const artistIds = [
      ...new Set(
        (links ?? [])
          .map((link) => String(link.artist_id || ""))
          .filter(Boolean),
      ),
    ];

    const { data: artists, error: artistsError } =
      artistIds.length > 0
        ? await supabaseServer
            .from("artists")
            .select("id, name, slug")
            .in("id", artistIds)
            .eq("status", "approved")
        : { data: [], error: null };

    if (artistsError) throw artistsError;

    const artistById = new Map(
      (artists ?? []).map((artist) => [String(artist.id), artist] as const),
    );

    const primaryArtistIdByRelease = new Map<string, string>();
    for (const link of links ?? []) {
      const releaseId = String(link.release_id || "");
      const artistId = String(link.artist_id || "");
      if (!releaseId || !artistId || primaryArtistIdByRelease.has(releaseId)) {
        continue;
      }
      primaryArtistIdByRelease.set(releaseId, artistId);
    }

    return NextResponse.json({
      albums: (releases ?? []).flatMap((release) => {
        const releaseId = String(release.id || "");
        const artistId = primaryArtistIdByRelease.get(releaseId);
        const artist = artistId ? artistById.get(artistId) : null;
        if (!artist) return [];

        return [{
          id: releaseId,
          title: String(release.title || ""),
          cover_image_url: release.cover_image_url
            ? String(release.cover_image_url)
            : null,
          artist_name: String(artist.name || ""),
          artist_slug: String(artist.slug || ""),
        }];
      }).slice(0, 4),
    });
  } catch (error) {
    console.error("Featured albums fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to load featured albums" },
      { status: 500 },
    );
  }
}
