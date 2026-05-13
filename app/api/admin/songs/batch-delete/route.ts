import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import base from "@/lib/airtable";
import { deleteFilesFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

function getR2KeyFromUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function getStemUrls(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((url) => String(url).trim()).filter(Boolean);
  }

  if (typeof value !== "string") return [];

  return value
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean);
}

function getRecordR2Keys(record: { get: (fieldName: string) => unknown }) {
  const audioKey = getR2KeyFromUrl(
    record.get("Audio URL") || record.get("R2 Audio URL"),
  );
  const coverKey = getR2KeyFromUrl(record.get("Cover URL"));
  const stemKeys = getStemUrls(record.get("Stems"))
    .map(getR2KeyFromUrl)
    .filter((key): key is string => Boolean(key));

  return [audioKey, coverKey, ...stemKeys].filter((key): key is string =>
    Boolean(key),
  );
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const tableId = process.env.AIRTABLE_SONGS_TABLE_ID;

    if (!tableId) {
      return NextResponse.json(
        { error: "Missing AIRTABLE_SONGS_TABLE_ID" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const songIds = Array.isArray(body.songIds)
      ? body.songIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    if (songIds.length === 0) {
      return NextResponse.json({ error: "No songs selected" }, { status: 400 });
    }

    const records = await Promise.all(
      songIds.map((id: string) => base(tableId).find(id)),
    );

    const keysToDelete = records.flatMap(getRecordR2Keys);
    const uniqueKeysToDelete = Array.from(new Set(keysToDelete));

    if (uniqueKeysToDelete.length > 0) {
      await deleteFilesFromR2(uniqueKeysToDelete);
    }

    await Promise.all(songIds.map((id: string) => base(tableId).destroy(id)));

    return NextResponse.json({
      deleted: true,
      deletedSongIds: songIds,
      deletedCount: songIds.length,
      deletedR2Keys: uniqueKeysToDelete,
    });
  } catch (err) {
    console.error("Batch song delete failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete selected songs",
      },
      { status: 500 },
    );
  }
}
