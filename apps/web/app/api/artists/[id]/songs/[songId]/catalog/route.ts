import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params:
    | Promise<{ id: string; songId: string }>
    | { id: string; songId: string };
};

type CatalogueAction = "archive" | "restore";

const RESTORABLE_STATUSES = new Set([
  "draft",
  "processing",
  "submitted",
  "changes_requested",
  "rejected",
  "approved",
  "published",
]);

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

async function isInPublishedRelease(songId: string) {
  const { data: releaseLinks, error: releaseLinksError } = await supabaseServer
    .from("artist_release_songs")
    .select("release_id")
    .eq("song_id", songId);

  if (releaseLinksError) throw releaseLinksError;

  const releaseIds = (releaseLinks ?? [])
    .map((link) => link.release_id)
    .filter((releaseId): releaseId is string => typeof releaseId === "string");

  if (releaseIds.length === 0) return false;

  const { data: publishedRelease, error: releaseError } = await supabaseServer
    .from("artist_releases")
    .select("id")
    .in("id", releaseIds)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  if (releaseError) throw releaseError;
  return Boolean(publishedRelease);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    await requireArtistPermission(id, "catalog:edit");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
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
        { error: "Artist profile must be approved before managing catalogue tracks" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const action = body?.action;

    if (action !== "archive" && action !== "restore") {
      return NextResponse.json({ error: "Invalid catalogue action" }, { status: 400 });
    }

    const { data: currentSong, error: songError } = await supabaseServer
      .from("songs")
      .select(
        "id, title, status, duration, bpm, key, created_at, archived_at, archived_from_status",
      )
      .eq("id", songId)
      .maybeSingle();

    if (songError) throw songError;
    if (!currentSong) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    if (action === "archive") {
      if (currentSong.status === "archived") {
        return NextResponse.json({ song: currentSong });
      }
      if (currentSong.status === "processing") {
        return NextResponse.json(
          { error: "A processing track cannot be archived" },
          { status: 409 },
        );
      }
      if (await isInPublishedRelease(songId)) {
        return NextResponse.json(
          { error: "Unpublish releases containing this track before archiving it" },
          { status: 409 },
        );
      }

      const { data: archivedSong, error: archiveError } = await supabaseServer
        .from("songs")
        .update({
          status: "archived",
          archived_at: new Date().toISOString(),
          archived_from_status: currentSong.status,
        })
        .eq("id", songId)
        .select("id, title, status, duration, bpm, key, created_at")
        .single();

      if (archiveError) throw archiveError;
      return NextResponse.json({ song: archivedSong });
    }

    if (currentSong.status !== "archived") {
      return NextResponse.json(
        { error: "Only archived tracks can be restored" },
        { status: 409 },
      );
    }

    const restoreStatus = RESTORABLE_STATUSES.has(
      String(currentSong.archived_from_status || ""),
    )
      ? String(currentSong.archived_from_status)
      : "draft";

    const { data: restoredSong, error: restoreError } = await supabaseServer
      .from("songs")
      .update({
        status: restoreStatus,
        archived_at: null,
        archived_from_status: null,
      })
      .eq("id", songId)
      .select("id, title, status, duration, bpm, key, created_at")
      .single();

    if (restoreError) throw restoreError;
    return NextResponse.json({ song: restoredSong });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to update artist catalogue track:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update catalogue track",
      },
      { status: 500 },
    );
  }
}
