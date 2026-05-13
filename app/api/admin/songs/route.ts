import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import base from "@/lib/airtable";

export const runtime = "nodejs";

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

function requiredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function durationToSeconds(duration: string) {
  const trimmed = duration.trim();

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

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
}

async function getNextOrder(tableId: string) {
  const records = await base(tableId)
    .select({
      maxRecords: 1,
      fields: ["Order"],
      sort: [
        {
          field: "Order",
          direction: "desc",
        },
      ],
    })
    .firstPage();

  const highestOrder = records[0]?.get("Order");

  if (typeof highestOrder === "number" && Number.isFinite(highestOrder)) {
    return highestOrder + 1;
  }

  return 1;
}

function buildAirtableFields(body: SaveSongPayload, order: number) {
  return {
    Order: order,
    "Song Title": body.title.trim(),
    Artist: body.artist.trim(),
    BPM: body.bpm ? Number(body.bpm) : undefined,
    Key: body.key || undefined,
    Duration: durationToSeconds(body.duration),
    "Audio URL": body.audioUrl.trim(),
    "Cover URL": body.coverUrl || "",
    Stems: body.stemUrls?.length ? body.stemUrls.join("\n") : "",
    "Waveform Peaks": body.waveformPeaks || "[]",
    Genre: cleanStringArray(body.genres),
    Mood: cleanStringArray(body.moods),
    Instrument: cleanStringArray(body.instruments),
    Build: cleanStringArray(body.builds),
    Vocals: cleanStringArray(body.vocals),
    Instrumental: Boolean(body.instrumental),
    "Edit Points": body.editPoints || '{"markers":[],"ranges":[]}',
  };
}

export async function POST(req: Request) {
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

    const body = (await req.json()) as SaveSongPayload;

    if (!requiredString(body.title)) {
      return NextResponse.json(
        { error: "Missing song title" },
        { status: 400 },
      );
    }

    if (!requiredString(body.artist)) {
      return NextResponse.json({ error: "Missing artist" }, { status: 400 });
    }

    if (!requiredString(body.audioUrl)) {
      return NextResponse.json({ error: "Missing audio URL" }, { status: 400 });
    }

    if (!requiredString(body.waveformPeaks)) {
      return NextResponse.json(
        { error: "Missing waveform peaks" },
        { status: 400 },
      );
    }

    const nextOrder = await getNextOrder(tableId);
    const fields = buildAirtableFields(body, nextOrder);

    const record = await base(tableId).create(fields, {
      typecast: true,
    });

    return NextResponse.json({
      id: record.id,
      fields: record.fields,
    });
  } catch (err) {
    console.error("Airtable save failed:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to save song",
      },
      { status: 500 },
    );
  }
}
