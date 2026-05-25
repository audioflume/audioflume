import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type SaveSongPayload = {
  title: string;
  artist: string;
  bpm: string;
  key: string;
  duration: string;
  audioUrl: string;
  playbackUrl?: string;
  hlsUrl?: string;
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

  if (!trimmed) return 0;

  if (!trimmed.includes(":")) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const parts = trimmed.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) {
    return 0;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function buildSupabaseSongRow(body: SaveSongPayload) {
  return {
    title: body.title.trim(),
    artist: body.artist.trim(),
    bpm: body.bpm ? Number(body.bpm) : null,
    key: body.key || null,
    duration: durationToSeconds(body.duration),
    audio_url: body.audioUrl.trim(),
    playback_url: body.playbackUrl?.trim() || null,
    hls_url: body.hlsUrl?.trim() || null,
    cover_url: body.coverUrl || null,
    stems: body.stemUrls?.length ? body.stemUrls.join("\n") : null,
    waveform_peaks: body.waveformPeaks || "[]",
    genres: cleanStringArray(body.genres),
    moods: cleanStringArray(body.moods),
    instruments: cleanStringArray(body.instruments),
    builds: cleanStringArray(body.builds),
    vocals: cleanStringArray(body.vocals),
    instrumental: Boolean(body.instrumental),
    edit_points: body.editPoints || '{"markers":[],"ranges":[]}',
    status: "published",
  };
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
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

    const songRow = buildSupabaseSongRow(body);

    const { data, error } = await supabaseServer
      .from("songs")
      .insert(songRow)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      id: String(data.id),
      fields: data,
    });
  } catch (err) {
    console.error("Supabase song save failed:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to save song",
      },
      { status: 500 },
    );
  }
}
