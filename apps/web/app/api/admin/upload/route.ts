import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { processAudioForStreaming } from "@/lib/audioProcessing";
import { uploadFileToR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 300;

function slugify(value: string) {
  const cleanValue = value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleanValue || "untitled";
}

function safeFileName(name: string) {
  const extension = name.includes(".") ? name.split(".").pop() : "";
  const baseName = name.replace(/\.[^/.]+$/, "");

  const cleanBaseName = baseName
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!extension) return cleanBaseName || "file";

  return `${cleanBaseName || "file"}.${extension.toLowerCase()}`;
}

function getFolderForType(type: string) {
  if (type === "audio") return "audio";
  if (type === "cover") return "cover";
  if (type === "stem") return "stems";

  return "uploads";
}

function isAllowedType(file: File, type: string) {
  if (type === "audio" || type === "stem") {
    return file.type.startsWith("audio/");
  }

  if (type === "cover") {
    return file.type.startsWith("image/");
  }

  return false;
}

function getFileNameForType(file: File, type: string) {
  return safeFileName(file.name);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const type = String(formData.get("type") || "upload");
    const artist = String(formData.get("artist") || "");
    const title = String(formData.get("title") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!["audio", "cover", "stem"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid upload type" },
        { status: 400 },
      );
    }

    if (!artist.trim()) {
      return NextResponse.json({ error: "Missing artist" }, { status: 400 });
    }

    if (!title.trim()) {
      return NextResponse.json(
        { error: "Missing song title" },
        { status: 400 },
      );
    }

    if (!isAllowedType(file, type)) {
      return NextResponse.json(
        { error: `Invalid file type for ${type}` },
        { status: 400 },
      );
    }

    const artistSlug = slugify(artist);
    const titleSlug = slugify(title);
    const folder = getFolderForType(type);
    const timestamp = Date.now();
    const fileName = getFileNameForType(file, type);

    const key = `${artistSlug}/${titleSlug}/${folder}/${timestamp}-${fileName}`;

    const url = await uploadFileToR2({
      file,
      key,
    });

    const streamingAssets =
      type === "audio"
        ? await processAudioForStreaming({
            file,
            baseKey: `${artistSlug}/${titleSlug}`,
          })
        : null;

    return NextResponse.json({
      url,
      key,
      playbackUrl: streamingAssets?.playbackUrl || "",
      playbackKey: streamingAssets?.playbackKey || "",
      hlsUrl: streamingAssets?.hlsUrl || "",
      hlsKey: streamingAssets?.hlsKey || "",
      hlsAssetKeys: streamingAssets?.hlsAssetKeys || [],
      fileName: file.name,
      storedFileName: fileName,
      contentType: file.type,
      size: file.size,
      type,
      artist,
      title,
      artistSlug,
      titleSlug,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
