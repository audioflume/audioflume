import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { deleteFilesFromR2, uploadFileToR2 } from "@/lib/r2";

export const runtime = "nodejs";

function getUserKey(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "");
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
    .replace(/^-|-$/g, "") || "sample";

  return extension
    ? `${cleanBaseName}.${extension.toLowerCase()}`
    : cleanBaseName;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "File must be an audio file" },
        { status: 400 },
      );
    }

    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 100 MB)" },
        { status: 400 },
      );
    }

    const prefix = `artist-applications/${getUserKey(user.id)}/samples`;
    const key = `${prefix}/${Date.now()}-${randomUUID()}-${safeFileName(file.name)}`;
    const url = await uploadFileToR2({ file, key });

    return NextResponse.json({
      upload: {
        key,
        url,
        file_name: file.name.slice(0, 255),
        size_bytes: file.size,
      },
    });
  } catch (error) {
    console.error("Artist application sample upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload artist application sample",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | { keys?: unknown }
      | null;
    const prefix = `artist-applications/${getUserKey(user.id)}/samples/`;
    const keys = Array.isArray(body?.keys)
      ? body.keys.filter(
          (key): key is string =>
            typeof key === "string" && key.startsWith(prefix),
        )
      : [];

    if (keys.length > 0) {
      await deleteFilesFromR2(keys);
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Artist application sample cleanup failed:", error);
    return NextResponse.json(
      { error: "Failed to clean up artist application samples" },
      { status: 500 },
    );
  }
}
