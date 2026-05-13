import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import base from "@/lib/airtable";
import { deleteFilesFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type SaveSongPayload = {
  title: string;
  artist: string;
  bpm: string;
  key: string;
  duration: string;
  audioUrl: string;
  coverUrl?: string | null;
  stemUrls?: string[];
  waveformPeaks: string;
  genres: string[];
  moods: string[];
  instruments: string[];
  builds: string[];
  vocals: string[];
  instrumental: boolean;
  editPoints: string;
};

type AirtableRecord = {
  id: string;
  fields?: Record<string, unknown>;
  get: (fieldName: string) => unknown;
};

function getString(value: unknown) {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function getBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return ["true", "yes", "1", "instrumental"].includes(
      value.trim().toLowerCase(),
    );
  }

  return false;
}

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

function normalizeArrayField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item: unknown) => normalizeArrayField(item))
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeStemUrls(value: unknown) {
  return getStemUrls(value);
}

function parseDurationForAirtable(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return undefined;

  if (!trimmed.includes(":")) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  const parts = trimmed.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return undefined;
}

function formatDurationForForm(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return getString(value);
}

function getRecordPayload(record: AirtableRecord) {
  return {
    id: record.id,
    title: getString(record.get("Song Title")),
    artist: getString(record.get("Artist")),
    bpm: getString(record.get("BPM")),
    key: getString(record.get("Key")),
    duration: formatDurationForForm(record.get("Duration")),
    audioUrl: getString(record.get("Audio URL") || record.get("R2 Audio URL")),
    coverUrl: getString(record.get("Cover URL")),
    stemUrls: normalizeStemUrls(record.get("Stems")),
    waveformPeaks: getString(record.get("Waveform Peaks")) || "[]",
    genres: normalizeArrayField(record.get("Genre")),
    moods: normalizeArrayField(record.get("Mood")),
    instruments: normalizeArrayField(record.get("Instrument")),
    builds: normalizeArrayField(record.get("Build")),
    vocals: normalizeArrayField(record.get("Vocals")),
    instrumental: getBoolean(record.get("Instrumental")),
    editPoints:
      getString(record.get("Edit Points")) ||
      `{
"markers": [],
"ranges": []
}`,
  };
}

function buildAirtableFields(payload: SaveSongPayload) {
  return {
    "Song Title": payload.title,
    Artist: payload.artist,
    BPM: payload.bpm ? Number(payload.bpm) : undefined,
    Key: payload.key,
    Duration: parseDurationForAirtable(payload.duration),
    "Audio URL": payload.audioUrl,
    "Cover URL": payload.coverUrl || "",
    Stems: payload.stemUrls?.length ? payload.stemUrls.join("\n") : "",
    "Waveform Peaks": payload.waveformPeaks || "[]",
    Genre: payload.genres,
    Mood: payload.moods,
    Instrument: payload.instruments,
    Build: payload.builds,
    Vocals: payload.vocals,
    Instrumental: payload.instrumental,
    "Edit Points": payload.editPoints || '{"markers":[],"ranges":[]}',
  };
}

export async function GET(_req: Request, context: RouteContext) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing song ID" }, { status: 400 });
    }

    const record = await base(tableId).find(id);

    return NextResponse.json(getRecordPayload(record));
  } catch (err) {
    console.error("Song load failed:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to load song",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing song ID" }, { status: 400 });
    }

    const payload = (await req.json()) as SaveSongPayload;
    const currentRecord = await base(tableId).find(id);

    const previousAudioKey = getR2KeyFromUrl(
      currentRecord.get("Audio URL") || currentRecord.get("R2 Audio URL"),
    );
    const previousCoverKey = getR2KeyFromUrl(currentRecord.get("Cover URL"));
    const previousStemKeys = getStemUrls(currentRecord.get("Stems"))
      .map(getR2KeyFromUrl)
      .filter((key): key is string => Boolean(key));

    const nextAudioKey = getR2KeyFromUrl(payload.audioUrl);
    const nextCoverKey = getR2KeyFromUrl(payload.coverUrl);
    const nextStemKeys = (payload.stemUrls || [])
      .map(getR2KeyFromUrl)
      .filter((key): key is string => Boolean(key));

    const keysToDelete = [
      previousAudioKey && previousAudioKey !== nextAudioKey
        ? previousAudioKey
        : null,
      previousCoverKey && previousCoverKey !== nextCoverKey
        ? previousCoverKey
        : null,
      ...previousStemKeys.filter((key) => !nextStemKeys.includes(key)),
    ].filter((key): key is string => Boolean(key));

    const updatedRecord = await base(tableId).update(
      id,
      buildAirtableFields(payload),
    );

    if (keysToDelete.length > 0) {
      await deleteFilesFromR2(keysToDelete);
    }

    return NextResponse.json({
      id: updatedRecord.id,
      fields: updatedRecord.fields,
      deletedR2Keys: keysToDelete,
    });
  } catch (err) {
    console.error("Song update failed:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update song",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing song ID" }, { status: 400 });
    }

    const record = await base(tableId).find(id);

    const audioKey = getR2KeyFromUrl(
      record.get("Audio URL") || record.get("R2 Audio URL"),
    );
    const coverKey = getR2KeyFromUrl(record.get("Cover URL"));
    const stemKeys = getStemUrls(record.get("Stems"))
      .map(getR2KeyFromUrl)
      .filter((key): key is string => Boolean(key));

    const keysToDelete = [audioKey, coverKey, ...stemKeys].filter(
      (key): key is string => Boolean(key),
    );

    if (keysToDelete.length > 0) {
      await deleteFilesFromR2(keysToDelete);
    }

    await base(tableId).destroy(id);

    return NextResponse.json({
      id,
      deleted: true,
      deletedR2Keys: keysToDelete,
    });
  } catch (err) {
    console.error("Song delete failed:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete song",
      },
      { status: 500 },
    );
  }
}
