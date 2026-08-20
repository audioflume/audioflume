import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { r2Client } from "@/lib/r2";
import {
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

function getBucket() {
  const bucket =
    process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!bucket) throw new Error("Missing Cloudflare R2 image bucket");
  return bucket;
}

function getPublicUrl() {
  const publicUrl =
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!publicUrl) throw new Error("Missing Cloudflare R2 image public URL");
  return publicUrl.replace(/\/$/, "");
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    const access = await requireArtistPermission(id, "catalog:edit");

    const { data: songLink, error: linkError } = await supabaseServer
      .from("song_artists")
      .select("song_id")
      .eq("artist_id", id)
      .eq("song_id", songId)
      .eq("role", "primary")
      .maybeSingle();

    if (linkError) throw linkError;
    if (!songLink) {
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
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 20 MB)" },
        { status: 400 },
      );
    }

    const key = `images/artists/${id}/songs/${songId}/${Date.now()}-${randomUUID()}.webp`;
    const sharp = (await import("sharp")).default;
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();

    await r2Client.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: outputBuffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    const imageUrl = `${getPublicUrl()}/${key}`;

    if (usesPendingRevision) {
      await upsertSongFileMetadataRevision({
        songId,
        userId: access.userId,
        metadataPatch: { cover_url: imageUrl },
      });

      return NextResponse.json({
        song: { id: songId, cover_url: imageUrl },
        revision_pending: true,
      });
    }

    const { data: updatedSong, error: updateError } = await supabaseServer
      .from("songs")
      .update({ cover_url: imageUrl })
      .eq("id", songId)
      .select("id, cover_url")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedSong) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ song: updatedSong, revision_pending: false });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist song artwork upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload song artwork",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id, songId } = await context.params;
    const access = await requireArtistPermission(id, "catalog:edit");

    const { data: songLink, error: linkError } = await supabaseServer
      .from("song_artists")
      .select("song_id")
      .eq("artist_id", id)
      .eq("song_id", songId)
      .eq("role", "primary")
      .maybeSingle();

    if (linkError) throw linkError;
    if (!songLink) {
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

    if (usesPendingRevision) {
      await upsertSongFileMetadataRevision({
        songId,
        userId: access.userId,
        metadataPatch: { cover_url: null },
      });

      return NextResponse.json({
        song: { id: songId, cover_url: null },
        revision_pending: true,
      });
    }

    const { data: updatedSong, error: updateError } = await supabaseServer
      .from("songs")
      .update({ cover_url: null })
      .eq("id", songId)
      .select("id, cover_url")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedSong) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ song: updatedSong, revision_pending: false });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist song artwork removal failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove song artwork",
      },
      { status: 500 },
    );
  }
}