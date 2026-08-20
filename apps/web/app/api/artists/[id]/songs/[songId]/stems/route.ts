import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { deleteFilesFromR2, uploadFileToR2 } from "@/lib/r2";
import {
  songStatusUsesPendingRevision,
  upsertSongFileMetadataRevision,
} from "@/lib/songPendingRevisions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params:
    | Promise<{ id: string; songId: string }>
    | { id: string; songId: string };
};

function safeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-") || "stem.wav";
}

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

export async function POST(request: Request, context: RouteContext) {
  let uploadedKeys: string[] = [];

  try {
    const { id, songId } = await context.params;
    const access = await requireArtistPermission(id, "catalog:edit");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from("songs")
      .select("id, status")
      .eq("id", songId)
      .maybeSingle();

    if (songError) throw songError;
    if (!song) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const usesPendingRevision = songStatusUsesPendingRevision(song.status);
    if (
      song.status !== "draft" &&
      song.status !== "changes_requested" &&
      !usesPendingRevision
    ) {
      return NextResponse.json(
        { error: "This track cannot be edited from its current status" },
        { status: 409 },
      );
    }

    const formData = await request.formData();
    const files = formData
      .getAll("stems")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Choose at least one stem file" },
        { status: 400 },
      );
    }

    if (files.some((file) => !file.type.startsWith("audio/"))) {
      return NextResponse.json(
        { error: "Stem files must be audio files" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const urls: string[] = [];

    for (const [index, file] of files.entries()) {
      const key = `artists/${id}/songs/${songId}/${timestamp}/stems/${index + 1}-${safeFileName(file.name)}`;
      const url = await uploadFileToR2({ file, key });
      uploadedKeys.push(key);
      urls.push(url);
    }

    const stemsValue = urls.join("\n");

    if (usesPendingRevision) {
      await upsertSongFileMetadataRevision({
        songId,
        userId: access.userId,
        metadataPatch: { stems: stemsValue },
      });

      uploadedKeys = [];
      return NextResponse.json({
        stems: urls,
        revision_pending: true,
      });
    }

    const { error: updateError } = await supabaseServer
      .from("songs")
      .update({ stems: stemsValue })
      .eq("id", songId);

    if (updateError) throw updateError;

    uploadedKeys = [];
    return NextResponse.json({ stems: urls, revision_pending: false });
  } catch (error) {
    if (uploadedKeys.length > 0) {
      try {
        await deleteFilesFromR2(uploadedKeys);
      } catch (cleanupError) {
        console.error("Failed to clean up artist stem files:", cleanupError);
      }
    }

    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Artist song stem upload failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload stems",
      },
      { status: 500 },
    );
  }
}