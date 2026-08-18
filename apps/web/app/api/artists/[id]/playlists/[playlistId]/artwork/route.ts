import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { r2Client } from "@/lib/r2";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params:
    | Promise<{ id: string; playlistId: string }>
    | { id: string; playlistId: string };
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
    const { id, playlistId } = await context.params;
    await requireArtistPermission(id, "playlist:manage");

    const { data: playlist, error: playlistError } = await supabaseServer
      .from("artist_playlists")
      .select("id")
      .eq("id", playlistId)
      .eq("artist_id", id)
      .maybeSingle();

    if (playlistError) throw playlistError;
    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
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
        { error: "Artist profile must be approved before managing playlists" },
        { status: 403 },
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

    const key = `images/artists/${id}/playlists/${playlistId}/${Date.now()}-${randomUUID()}.webp`;
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
    const { data: updatedPlaylist, error: updateError } = await supabaseServer
      .from("artist_playlists")
      .update({ cover_image_url: imageUrl })
      .eq("id", playlistId)
      .eq("artist_id", id)
      .select("id, cover_image_url, updated_at")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedPlaylist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    return NextResponse.json({ playlist: updatedPlaylist });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist playlist artwork upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload playlist artwork",
      },
      { status: 500 },
    );
  }
}
