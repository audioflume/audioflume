import { NextResponse } from "next/server";

import { cleanOptionalString } from "@/lib/account";
import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params:
    | Promise<{ id: string; releaseId: string }>
    | { id: string; releaseId: string };
};

const RELEASE_TYPES = ["single", "ep", "album"] as const;
type ReleaseType = (typeof RELEASE_TYPES)[number];
type ReleaseAction = "publish" | "unpublish";

function normalizeReleaseType(value: unknown): ReleaseType | null {
  return RELEASE_TYPES.includes(value as ReleaseType)
    ? (value as ReleaseType)
    : null;
}

function normalizeReleaseAction(value: unknown): ReleaseAction | null {
  return value === "publish" || value === "unpublish" ? value : null;
}

function normalizeReleaseDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  return value;
}

function normalizeSongIds(value: unknown) {
  if (!Array.isArray(value)) return null;

  const songIds = value.filter(
    (songId): songId is string => typeof songId === "string" && songId.length > 0,
  );
  const uniqueSongIds = [...new Set(songIds)];

  if (uniqueSongIds.length !== value.length || uniqueSongIds.length > 100) {
    return null;
  }

  return uniqueSongIds;
}

async function requireReleaseOwnership(artistId: string, releaseId: string) {
  const { data, error } = await supabaseServer
    .from("artist_release_artists")
    .select("release_id")
    .eq("release_id", releaseId)
    .eq("artist_id", artistId)
    .eq("role", "primary")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, releaseId } = await context.params;
    await requireArtistPermission(id, "release:manage");

    const ownsRelease = await requireReleaseOwnership(id, releaseId);
    if (!ownsRelease) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

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
        { error: "Artist profile must be approved before managing releases" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = cleanOptionalString(body.title, 180);
    const releaseType = normalizeReleaseType(body.release_type);
    const releaseDate = normalizeReleaseDate(body.release_date);
    const songIds = normalizeSongIds(body.song_ids);
    const action = normalizeReleaseAction(body.action);

    if (body.action !== undefined && !action) {
      return NextResponse.json({ error: "Invalid release action" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Release title is required" }, { status: 400 });
    }
    if (!releaseType) {
      return NextResponse.json({ error: "Invalid release type" }, { status: 400 });
    }
    if (releaseDate === undefined) {
      return NextResponse.json({ error: "Invalid release date" }, { status: 400 });
    }
    if (!songIds) {
      return NextResponse.json({ error: "Invalid release track list" }, { status: 400 });
    }
    if (releaseType === "single" && songIds.length > 1) {
      return NextResponse.json(
        { error: "A single can contain only one track" },
        { status: 400 },
      );
    }
    if (action === "publish" && songIds.length === 0) {
      return NextResponse.json(
        { error: "Add at least one published track before publishing this release" },
        { status: 400 },
      );
    }

    if (songIds.length > 0) {
      const { data: songLinks, error: songLinksError } = await supabaseServer
        .from("song_artists")
        .select("song_id")
        .eq("artist_id", id)
        .eq("role", "primary")
        .in("song_id", songIds);

      if (songLinksError) throw songLinksError;

      const ownedSongIds = new Set(
        (songLinks ?? [])
          .map((link) => link.song_id)
          .filter((songId): songId is string => typeof songId === "string"),
      );

      if (songIds.some((songId) => !ownedSongIds.has(songId))) {
        return NextResponse.json(
          { error: "A release can only contain tracks from this artist catalogue" },
          { status: 403 },
        );
      }

      const { data: conflictingReleaseLinks, error: conflictingReleaseLinksError } =
        await supabaseServer
          .from("artist_release_songs")
          .select("song_id, release_id")
          .in("song_id", songIds)
          .neq("release_id", releaseId);

      if (conflictingReleaseLinksError) throw conflictingReleaseLinksError;
      if ((conflictingReleaseLinks ?? []).length > 0) {
        return NextResponse.json(
          { error: "A track can only belong to one release" },
          { status: 409 },
        );
      }

      const { data: songs, error: songsError } = await supabaseServer
        .from("songs")
        .select("id, status")
        .in("id", songIds);

      if (songsError) throw songsError;
      if ((songs ?? []).some((song) => song.status === "rejected")) {
        return NextResponse.json(
          { error: "Rejected tracks cannot be added to a release" },
          { status: 400 },
        );
      }
      if (
        action === "publish" &&
        ((songs ?? []).length !== songIds.length ||
          (songs ?? []).some((song) => song.status !== "published"))
      ) {
        return NextResponse.json(
          { error: "Every track must be published before the release can be published" },
          { status: 400 },
        );
      }
    }

    const releaseUpdate: {
      title: string;
      release_type: ReleaseType;
      release_date: string | null;
      status?: "draft" | "published";
    } = {
      title,
      release_type: releaseType,
      release_date: releaseDate,
    };

    if (action === "publish") releaseUpdate.status = "published";
    if (action === "unpublish") releaseUpdate.status = "draft";

    const { data: release, error: updateError } = await supabaseServer
      .from("artist_releases")
      .update(releaseUpdate)
      .eq("id", releaseId)
      .select(
        "id, title, release_type, cover_image_url, release_date, status, created_at, updated_at",
      )
      .maybeSingle();

    if (updateError) throw updateError;
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseServer
      .from("artist_release_songs")
      .delete()
      .eq("release_id", releaseId);

    if (deleteError) throw deleteError;

    if (songIds.length > 0) {
      const { error: insertError } = await supabaseServer
        .from("artist_release_songs")
        .insert(
          songIds.map((songId, index) => ({
            release_id: releaseId,
            song_id: songId,
            disc_number: 1,
            track_number: index + 1,
          })),
        );

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      release: {
        ...release,
        track_ids: songIds,
      },
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to update artist release:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update artist release",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id, releaseId } = await context.params;
    await requireArtistPermission(id, "release:manage");

    const ownsRelease = await requireReleaseOwnership(id, releaseId);
    if (!ownsRelease) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

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
        { error: "Artist profile must be approved before managing releases" },
        { status: 403 },
      );
    }

    const { data: deletedRelease, error: deleteError } = await supabaseServer
      .from("artist_releases")
      .delete()
      .eq("id", releaseId)
      .select("id")
      .maybeSingle();

    if (deleteError) throw deleteError;
    if (!deletedRelease) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted_release_id: releaseId });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to delete artist release:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete artist release",
      },
      { status: 500 },
    );
  }
}
