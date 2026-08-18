import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { ArtistAccessError, requireArtistPermission } from "@/lib/artistPermissions";
import { r2Client } from "@/lib/r2";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type ArtistImageKind = "profile" | "hero";

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

function normalizeImageKind(
  value: FormDataEntryValue | null,
): ArtistImageKind | null {
  if (value === "profile" || value === "hero") return value;
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:edit_profile");

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = normalizeImageKind(formData.get("kind"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!kind) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
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

    const { data: existingArtist, error: artistError } = await supabaseServer
      .from("artists")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (artistError) throw artistError;
    if (!existingArtist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const key = `images/artists/${id}/${kind}-${Date.now()}-${randomUUID()}.webp`;
    const sharp = (await import("sharp")).default;
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: kind === "hero" ? 2400 : 1600,
        withoutEnlargement: true,
      })
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
    const updates =
      kind === "profile"
        ? { profile_image_url: imageUrl }
        : { hero_image_url: imageUrl };

    const { data: artist, error: updateError } = await supabaseServer
      .from("artists")
      .update(updates)
      .eq("id", id)
      .select("id, profile_image_url, hero_image_url, updated_at")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({ artist });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist image upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload artist image",
      },
      { status: 500 },
    );
  }
}
