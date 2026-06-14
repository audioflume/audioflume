import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import { deleteFilesFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
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
  regions: string[];
  instruments: string[];
  builds: string[];
  vocals: string[];
  instrumental: boolean;
  editPoints: string;
};

type SongEditPointRow = {
  id: string;
  type: string;
  time_seconds: number | string;
  label: string | null;
  confidence: number | string | null;
  source: string | null;
};

type ParsedEditPointRow = {
  type: string;
  time_seconds: number;
  label: string;
  confidence: number | null;
  source: "auto" | "manual" | "corrected";
};

type EditPointJsonMarker = {
  id?: string;
  type?: string;
  time?: number | string;
  label?: string;
  confidence?: number | string;
  source?: string;
};

function durationToSeconds(duration: string) {
  const trimmed = duration.trim();

  if (!trimmed) return 0;

  if (!trimmed.includes(":")) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const parts = trimmed.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) return 0;

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

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
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

function getStemUrls(value: string | null): string[] {
  if (!value) return [];

  return value
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean);
}

function emptyEditPointsJson() {
  return '{"markers":[],"ranges":[]}';
}

function generatedEditPointsToJson(rows: SongEditPointRow[] = []) {
  if (rows.length === 0) return null;

  const markers = rows.flatMap((row) => {
    const time = Number(row.time_seconds);

    if (!Number.isFinite(time)) return [];

    return [
      {
        id: row.id,
        label: row.label || row.type,
        time,
        type: row.type,
        confidence:
          row.confidence == null ? undefined : Number(row.confidence),
        source: row.source || undefined,
      },
    ];
  });

  if (markers.length === 0) return null;

  return JSON.stringify({
    markers,
    ranges: [],
  });
}

function clampConfidence(value: unknown) {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric)) return null;

  return Math.max(0, Math.min(1, numeric));
}

function cleanSource(value: unknown): ParsedEditPointRow["source"] {
  const source = String(value || "").trim();

  if (source === "auto") return "auto";
  if (source === "manual") return "manual";
  if (source === "corrected") return "corrected";

  return "manual";
}

function parseEditPointRowsFromJson(value: string): ParsedEditPointRow[] {
  const trimmed = value.trim();

  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    const markers = Array.isArray(parsed?.markers) ? parsed.markers : [];

    return markers.flatMap((marker: EditPointJsonMarker) => {
      const time = Number(marker.time);
      const type = String(marker.type || "").trim();

      if (!type || !Number.isFinite(time) || time < 0) return [];

      return [
        {
          type,
          time_seconds: Number(time.toFixed(2)),
          label: String(marker.label || type).trim(),
          confidence: clampConfidence(marker.confidence),
          source: cleanSource(marker.source),
        },
      ];
    });
  } catch {
    return [];
  }
}

async function syncEditPointRows(songId: string, editPointsJson: string) {
  const rows = parseEditPointRowsFromJson(editPointsJson);

  await supabaseServer.from("song_edit_points").delete().eq("song_id", songId);

  if (rows.length === 0) return;

  const insertRows = rows.map((row) => ({
    song_id: songId,
    ...row,
  }));

  const { error } = await supabaseServer
    .from("song_edit_points")
    .insert(insertRows);

  if (error) throw error;
}

export async function GET(_req: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing song ID" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("songs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const { data: generatedEditPoints } = await supabaseServer
      .from("song_edit_points")
      .select("id, type, time_seconds, label, confidence, source")
      .eq("song_id", id)
      .order("time_seconds", { ascending: true });

    const generatedEditPointsJson = generatedEditPointsToJson(
      (generatedEditPoints ?? []) as SongEditPointRow[],
    );

    return NextResponse.json({
      id: data.id,
      title: data.title,
      artist: data.artist,
      bpm: data.bpm ? String(data.bpm) : "",
      key: data.key || "",
      duration: formatDuration(Number(data.duration)),
      audioUrl: data.audio_url,
      coverUrl: data.cover_url || "",
      stemUrls: getStemUrls(data.stems),
      waveformPeaks: data.waveform_peaks || "[]",
      genres: data.genres || [],
      moods: data.moods || [],
      regions: data.regions || [],
      instruments: data.instruments || [],
      builds: data.builds || [],
      vocals: data.vocals || [],
      instrumental: Boolean(data.instrumental),
      editPoints:
        generatedEditPointsJson || data.edit_points || emptyEditPointsJson(),
      generatedEditPointCount: generatedEditPoints?.length ?? 0,
      status: data.status,
    });
  } catch (err) {
    console.error("Song load failed:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load song" },
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
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing song ID" }, { status: 400 });
    }

    const payload = (await req.json()) as SaveSongPayload;
    const nextEditPointsJson = payload.editPoints?.trim() || emptyEditPointsJson();

    const { data: current, error: fetchError } = await supabaseServer
      .from("songs")
      .select("audio_url, cover_url, stems")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const previousAudioKey = getR2KeyFromUrl(current.audio_url);
    const previousCoverKey = getR2KeyFromUrl(current.cover_url);
    const previousStemKeys = getStemUrls(current.stems)
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

    const { data, error } = await supabaseServer
      .from("songs")
      .update({
        title: payload.title.trim(),
        artist: payload.artist.trim(),
        audio_url: payload.audioUrl.trim(),
        cover_url: payload.coverUrl || null,
        stems: payload.stemUrls?.length ? payload.stemUrls.join("\n") : null,
        waveform_peaks: payload.waveformPeaks || "[]",
        duration: durationToSeconds(payload.duration),
        bpm: payload.bpm ? Number(payload.bpm) : null,
        key: payload.key || null,
        genres: cleanStringArray(payload.genres),
        moods: cleanStringArray(payload.moods),
        regions: cleanStringArray(payload.regions),
        instruments: cleanStringArray(payload.instruments),
        builds: cleanStringArray(payload.builds),
        vocals: cleanStringArray(payload.vocals),
        instrumental: Boolean(payload.instrumental),
        edit_points: nextEditPointsJson,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await syncEditPointRows(id, nextEditPointsJson);

    if (keysToDelete.length > 0) {
      await deleteFilesFromR2(keysToDelete);
    }

    return NextResponse.json({
      id: data.id,
      fields: data,
      deletedR2Keys: keysToDelete,
    });
  } catch (err) {
    console.error("Song update failed:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update song" },
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
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing song ID" }, { status: 400 });
    }

    const { data: current, error: fetchError } = await supabaseServer
      .from("songs")
      .select("audio_url, cover_url, stems")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const audioKey = getR2KeyFromUrl(current.audio_url);
    const coverKey = getR2KeyFromUrl(current.cover_url);
    const stemKeys = getStemUrls(current.stems)
      .map(getR2KeyFromUrl)
      .filter((key): key is string => Boolean(key));

    const keysToDelete = [audioKey, coverKey, ...stemKeys].filter(
      (key): key is string => Boolean(key),
    );

    const { error } = await supabaseServer.from("songs").delete().eq("id", id);

    if (error) throw error;

    if (keysToDelete.length > 0) {
      await deleteFilesFromR2(keysToDelete);
    }

    return NextResponse.json({
      id,
      deleted: true,
      deletedR2Keys: keysToDelete,
    });
  } catch (err) {
    console.error("Song delete failed:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete song" },
      { status: 500 },
    );
  }
}
