import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSongById } from "@/lib/songs";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type AnalyzerPoint = {
  id?: string;
  type?: string;
  label?: string | null;
  time?: number | string;
  time_seconds?: number | string;
  confidence?: number | string | null;
  source?: string | null;
};

type SavedEditPointRow = {
  id: string;
  song_id: string;
  type: string;
  time_seconds: number | string;
  label: string | null;
  confidence: number | string | null;
  source: string | null;
};

const EMPTY_EDIT_POINTS_JSON = '{"markers":[],"ranges":[]}';

function getTypeLabel(type: string) {
  if (type === "drop") return "Main Drop";

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function clampConfidence(value: unknown) {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric)) return null;

  return Math.max(0, Math.min(1, numeric));
}

function getAnalyzerPoints(data: unknown) {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  if (Array.isArray(record.points)) return record.points as AnalyzerPoint[];
  if (Array.isArray(record.markers)) return record.markers as AnalyzerPoint[];
  if (Array.isArray(record.editPoints)) return record.editPoints as AnalyzerPoint[];

  if (typeof record.editPointsJson === "string") {
    try {
      const parsed = JSON.parse(record.editPointsJson);
      if (Array.isArray(parsed?.markers)) return parsed.markers as AnalyzerPoint[];
    } catch {
      return [];
    }
  }

  return [];
}

function cleanAnalyzerPoint(point: AnalyzerPoint) {
  const type = String(point.type || "").trim();
  const time = Number(point.time_seconds ?? point.time);

  if (!type || type === "intro_end" || !Number.isFinite(time) || time < 0) {
    return null;
  }

  return {
    type,
    time_seconds: Number(time.toFixed(2)),
    label: String(point.label || getTypeLabel(type)).trim(),
    confidence: clampConfidence(point.confidence),
    source: point.source ? String(point.source) : "auto",
  };
}

function editPointRowsToJson(rows: SavedEditPointRow[] = []) {
  return JSON.stringify({
    markers: rows.flatMap((row) => {
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
    }),
    ranges: [],
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const analyzerUrl = process.env.AUDIO_ANALYZER_URL;
    const analyzerSecret = process.env.AUDIO_ANALYZER_SECRET;

    if (!analyzerUrl || !analyzerSecret) {
      return NextResponse.json(
        { error: "Missing analyzer environment variables." },
        { status: 500 },
      );
    }

    const song = await getSongById(id);

    if (!song) {
      return NextResponse.json({ error: "Song not found." }, { status: 404 });
    }

    if (!song.audioUrl) {
      return NextResponse.json(
        { error: "Song is missing an audio URL." },
        { status: 400 },
      );
    }

    const response = await fetch(`${analyzerUrl.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-analyzer-secret": analyzerSecret,
      },
      body: JSON.stringify({
        songId: song.id,
        audioUrl: song.audioUrl,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            data?.detail ||
            `Analyzer failed with status ${response.status}.`,
          detail: data,
        },
        { status: response.status },
      );
    }

    const cleaned = getAnalyzerPoints(data)
      .map(cleanAnalyzerPoint)
      .filter((point): point is NonNullable<typeof point> => Boolean(point));

    await supabaseServer.from("song_edit_points").delete().eq("song_id", id);

    if (cleaned.length === 0) {
      const { error: clearError } = await supabaseServer
        .from("songs")
        .update({ edit_points: EMPTY_EDIT_POINTS_JSON })
        .eq("id", id);

      if (clearError) throw clearError;

      return NextResponse.json({
        saved: 0,
        editPoints: [],
        editPointsJson: EMPTY_EDIT_POINTS_JSON,
        analyzer: data,
      });
    }

    const rows = cleaned.map((point) => ({
      song_id: id,
      type: point.type,
      time_seconds: point.time_seconds,
      label: point.label,
      confidence: point.confidence,
      source: point.source,
    }));

    const { data: savedRowsData, error: saveError } = await supabaseServer
      .from("song_edit_points")
      .insert(rows)
      .select("id, song_id, type, time_seconds, label, confidence, source")
      .order("time_seconds", { ascending: true });

    if (saveError) throw saveError;

    const savedRows = (savedRowsData ?? []) as SavedEditPointRow[];
    const editPointsJson = editPointRowsToJson(savedRows);

    const { error: syncError } = await supabaseServer
      .from("songs")
      .update({ edit_points: editPointsJson })
      .eq("id", id);

    if (syncError) throw syncError;

    return NextResponse.json({
      saved: savedRows.length,
      editPoints: savedRows,
      editPointsJson,
      analyzer: data,
    });
  } catch (err) {
    console.error("Cue point re-analysis failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to re-analyze cue points.",
      },
      { status: 500 },
    );
  }
}
