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

function normalizeReleaseIds(value: unknown) {
  if (!Array.isArray(value)) return null;

  const releaseIds = value.filter(
    (releaseId): releaseId is string =>
      typeof releaseId === "string" && releaseId.length > 0,
  );
  const uniqueReleaseIds = [...new Set(releaseIds)];

  if (uniqueReleaseIds.length !== value.length || uniqueReleaseIds.length > 200) {
    return null;
  }

  return uniqueReleaseIds;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:view");

    const [releaseLinksResult, songLinksResult] = await Promise.all([
      supabaseServer
        .from("artist_release_artists")
        .select("release_id, position, created_at")
        .eq("artist_id", id)
        .eq("role", "primary")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false }),
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

    const releaseById = new Map(
      (releasesResult.data ?? []).map((release) => [release.id, release]),
    );

    return NextResponse.json({
      releases: releaseIds.flatMap((releaseId) => {
        const release = releaseById.get(releaseId);
        if (!release) return [];
        return [
          {
            ...release,
            track_ids: tracksByRelease.get(release.id) ?? [],
          },
        ];
      }),
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "release:manage");

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
        { error: "Artist profile must be approved before reordering releases" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const releaseIds = normalizeReleaseIds(body.release_ids);

    if (!releaseIds) {
      return NextResponse.json(
        { error: "Invalid release order" },
        { status: 400 },
      );
    }

    const { data: links, error: linksError } = await supabaseServer
      .from("artist_release_artists")
      .select("release_id")
      .eq("artist_id", id)
      .eq("role", "primary");

    if (linksError) throw linksError;

    const ownedReleaseIds = new Set(
      (links ?? [])
        .map((link) => link.release_id)
        .filter((releaseId): releaseId is string => typeof releaseId === "string"),
    );

    if (
      releaseIds.length !== ownedReleaseIds.size ||
      releaseIds.some((releaseId) => !ownedReleaseIds.has(releaseId))
    ) {
      return NextResponse.json(
        { error: "Release order must include every release exactly once" },
        { status: 400 },
      );
    }

    const updates = await Promise.all(
      releaseIds.map((releaseId, position) =>
        supabaseServer
          .from("artist_release_artists")
          .update({ position })
          .eq("artist_id", id)
          .eq("release_id", releaseId)
          .eq("role", "primary"),
      ),
    );

    const updateError = updates.find((result) => result.error)?.error;
    if (updateError) throw updateError;

    return NextResponse.json({ release_ids: releaseIds });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to reorder artist releases:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reorder artist releases",
      },
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

    const { data: existingLinks, error: existingLinksError } = await supabaseServer
      .from("artist_release_artists")
      .select("release_id, position, created_at")
      .eq("artist_id", id)
      .eq("role", "primary")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (existingLinksError) {
      await supabaseServer.from("artist_releases").delete().eq("id", release.id);
      throw existingLinksError;
    }

    const positionUpdates = await Promise.all(
      (existingLinks ?? []).map((link, index) =>
        supabaseServer
          .from("artist_release_artists")
          .update({ position: index + 1 })
          .eq("artist_id", id)
          .eq("release_id", link.release_id)
          .eq("role", "primary"),
      ),
    );

    const positionError = positionUpdates.find((result) => result.error)?.error;
    if (positionError) {
      await supabaseServer.from("artist_releases").delete().eq("id", release.id);
      throw positionError;
    }

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
