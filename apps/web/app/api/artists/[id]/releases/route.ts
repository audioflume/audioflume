import { NextResponse } from "next/server";

import { cleanOptionalString } from "@/lib/account";
import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const RELEASE_TYPES = ["single", "ep", "album"] as const;
type ReleaseType = (typeof RELEASE_TYPES)[number];

function normalizeReleaseType(value: unknown): ReleaseType | null {
  return RELEASE_TYPES.includes(value as ReleaseType)
    ? (value as ReleaseType)
    : null;
}

function normalizeReleaseDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  return value;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:view");

    const [releaseLinksResult, songLinksResult] = await Promise.all([
      supabaseServer
        .from("artist_release_artists")
        .select("release_id")
        .eq("artist_id", id)
        .eq("role", "primary")
        .order("position", { ascending: true }),
      supabaseServer
        .from("song_artists")
        .select("song_id")
        .eq("artist_id", id)
        .eq("role", "primary"),
    ]);

    if (releaseLinksResult.error) throw releaseLinksResult.error;
    if (songLinksResult.error) throw songLinksResult.error;

    const releaseIds = (releaseLinksResult.data ?? [])
      .map((link) => link.release_id)
      .filter((releaseId): releaseId is string => typeof releaseId === "string");
    const songIds = (songLinksResult.data ?? [])
      .map((link) => link.song_id)
      .filter((songId): songId is string => typeof songId === "string");

    const [releasesResult, releaseSongsResult, songsResult] = await Promise.all([
      releaseIds.length > 0
        ? supabaseServer
            .from("artist_releases")
            .select(
              "id, title, release_type, cover_image_url, release_date, status, created_at, updated_at",
            )
            .in("id", releaseIds)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      releaseIds.length > 0
        ? supabaseServer
            .from("artist_release_songs")
            .select("release_id, song_id, disc_number, track_number")
            .in("release_id", releaseIds)
            .order("disc_number", { ascending: true })
            .order("track_number", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      songIds.length > 0
        ? supabaseServer
            .from("songs")
            .select("id, title, status, duration, created_at")
            .in("id", songIds)
            .neq("status", "rejected")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (releasesResult.error) throw releasesResult.error;
    if (releaseSongsResult.error) throw releaseSongsResult.error;
    if (songsResult.error) throw songsResult.error;

    const tracksByRelease = new Map<string, string[]>();
    for (const track of releaseSongsResult.data ?? []) {
      if (typeof track.release_id !== "string" || typeof track.song_id !== "string") {
        continue;
      }
      const current = tracksByRelease.get(track.release_id) ?? [];
      current.push(track.song_id);
      tracksByRelease.set(track.release_id, current);
    }

    return NextResponse.json({
      releases: (releasesResult.data ?? []).map((release) => ({
        ...release,
        track_ids: tracksByRelease.get(release.id) ?? [],
      })),
      songs: songsResult.data ?? [],
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to load artist releases:", error);
    return NextResponse.json(
      { error: "Failed to load artist releases" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireArtistPermission(id, "release:manage");

    const { data: artist, error: artistError } = await supabaseServer
      .from("artists")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (artistError) throw artistError;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    if (artist.status !== "approved") {
      return NextResponse.json(
        { error: "Artist profile must be approved before creating releases" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = cleanOptionalString(body.title, 180);
    const releaseType = normalizeReleaseType(body.release_type);
    const releaseDate = normalizeReleaseDate(body.release_date);

    if (!title) {
      return NextResponse.json({ error: "Release title is required" }, { status: 400 });
    }
    if (!releaseType) {
      return NextResponse.json({ error: "Invalid release type" }, { status: 400 });
    }
    if (releaseDate === undefined) {
      return NextResponse.json({ error: "Invalid release date" }, { status: 400 });
    }

    const { data: release, error: releaseError } = await supabaseServer
      .from("artist_releases")
      .insert({
        title,
        release_type: releaseType,
        release_date: releaseDate,
        status: "draft",
        created_by_clerk_user_id: access.userId,
      })
      .select(
        "id, title, release_type, cover_image_url, release_date, status, created_at, updated_at",
      )
      .single();

    if (releaseError) throw releaseError;

    const { error: linkError } = await supabaseServer
      .from("artist_release_artists")
      .insert({
        release_id: release.id,
        artist_id: id,
        role: "primary",
        position: 0,
      });

    if (linkError) {
      await supabaseServer.from("artist_releases").delete().eq("id", release.id);
      throw linkError;
    }

    return NextResponse.json(
      { release: { ...release, track_ids: [] } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to create artist release:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create artist release",
      },
      { status: 500 },
    );
  }
}
