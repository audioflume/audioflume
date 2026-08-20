import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import {
  getSongPendingRevision,
  songStatusUsesPendingRevision,
  upsertSongFileMetadataRevision,
} from "@/lib/songPendingRevisions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params:
    | Promise<{ id: string; songId: string }>
    | { id: string; songId: string };
};

type LicenseType = "standard" | "premium";

function isLicenseType(value: unknown): value is LicenseType {
  return value === "standard" || value === "premium";
}

async function requirePrimarySong(artistId: string, songId: string) {
  const { data: link, error: linkError } = await supabaseServer
    .from("song_artists")
    .select("song_id")
    .eq("artist_id", artistId)
    .eq("song_id", songId)
    .eq("role", "primary")
    .maybeSingle();

  if (linkError) throw linkError;
  return Boolean(link);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    await requireArtistPermission(id, "catalog:view");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const [{ data: song, error: songError }, pendingRevision] =
      await Promise.all([
        supabaseServer
          .from("songs")
          .select("id, status, license_type")
          .eq("id", songId)
          .maybeSingle(),
        getSongPendingRevision(songId),
      ]);

    if (songError) throw songError;
    if (!song) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const pendingLicenseType = pendingRevision?.metadata?.license_type;
    const licenseType = isLicenseType(pendingLicenseType)
      ? pendingLicenseType
      : isLicenseType(song.license_type)
        ? song.license_type
        : "standard";

    return NextResponse.json({
      license_type: licenseType,
      revision_pending: isLicenseType(pendingLicenseType),
      live_status: song.status,
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load artist song license:", error);
    return NextResponse.json(
      { error: "Failed to load track license" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    const access = await requireArtistPermission(id, "catalog:edit");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const licenseType =
      body && typeof body === "object"
        ? (body as Record<string, unknown>).license_type
        : null;

    if (!isLicenseType(licenseType)) {
      return NextResponse.json(
        { error: "License must be standard or premium" },
        { status: 400 },
      );
    }

    const { data: song, error: songError } = await supabaseServer
      .from("songs")
      .select("id, status, license_type")
      .eq("id", songId)
      .maybeSingle();

    if (songError) throw songError;
    if (!song) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    if (songStatusUsesPendingRevision(song.status)) {
      const revision = await upsertSongFileMetadataRevision({
        songId,
        userId: access.userId,
        metadataPatch: { license_type: licenseType },
      });

      return NextResponse.json({
        license_type: licenseType,
        revision_pending: true,
        revision_status: revision.status,
        live_status: song.status,
      });
    }

    if (song.status !== "draft" && song.status !== "changes_requested") {
      return NextResponse.json(
        { error: "This track cannot be edited from its current status" },
        { status: 409 },
      );
    }

    const { data: updatedSong, error: updateError } = await supabaseServer
      .from("songs")
      .update({ license_type: licenseType })
      .eq("id", songId)
      .select("id, status, license_type")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      license_type: updatedSong.license_type,
      revision_pending: false,
      live_status: updatedSong.status,
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to update artist song license:", error);
    return NextResponse.json(
      { error: "Failed to update track license" },
      { status: 500 },
    );
  }
}