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

function parseWaveformPeaks(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => Math.abs(Number(item)))
      .filter((item) => Number.isFinite(item));
  } catch {
    return [];
  }
}

function getPeakIndex(peaks: number[], startRatio: number, endRatio: number) {
  const start = Math.max(0, Math.floor(peaks.length * startRatio));
  const end = Math.min(peaks.length, Math.max(start + 1, Math.floor(peaks.length * endRatio)));

  let bestIndex = start;
  let bestValue = -Infinity;

  for (let index = start; index < end; index += 1) {
    const value = peaks[index] ?? 0;

    if (value > bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function getLowEnergyIndex(peaks: number[], startRatio: number, endRatio: number) {
  const start = Math.max(0, Math.floor(peaks.length * startRatio));
  const end = Math.min(peaks.length, Math.max(start + 1, Math.floor(peaks.length * endRatio)));

  let bestIndex = start;
  let bestValue = Infinity;

  for (let index = start; index < end; index += 1) {
    const value = peaks[index] ?? 0;

    if (value < bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function createWaveformFallbackPoints(waveformPeaks: string, duration: number) {
  const peaks = parseWaveformPeaks(waveformPeaks);

  if (peaks.length === 0 || !Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  const toTime = (index: number) => Number(((index / Math.max(1, peaks.length - 1)) * duration).toFixed(2));
  const maxPeak = Math.max(...peaks, 1);
  const toConfidence = (index: number, fallback = 0.65) => {
    const value = peaks[index] ?? 0;
    return Number(Math.max(0.35, Math.min(0.9, value / maxPeak || fallback)).toFixed(2));
  };

  const dropIndex = getPeakIndex(peaks, 0.18, 0.72);
  const breakIndex = getLowEnergyIndex(peaks, 0.52, 0.86);
  const endingIndex = getPeakIndex(peaks, 0.82, 1);

  return [
    {
      type: "drop",
      time_seconds: toTime(dropIndex),
      label: "Main Drop",
      confidence: toConfidence(dropIndex),
      source: "auto",
    },
    {
      type: "break",
      time_seconds: toTime(breakIndex),
      label: "Break",
      confidence: 0.55,
      source: "auto",
    },
    {
      type: "button_ending",
      time_seconds: toTime(endingIndex),
      label: "Button Ending",
      confidence: toConfidence(endingIndex, 0.6),
      source: "auto",
    },
  ].filter((point, index, points) => {
    return points.findIndex((item) => Math.abs(item.time_seconds - point.time_seconds) < 1) === index;
  });
}

async function fetchAnalyzerPoints({
  analyzerUrl,
  analyzerSecret,
  songId,
  audioUrl,
}: {
  analyzerUrl: string;
  analyzerSecret: string;
  songId: string;
  audioUrl: string;
}) {
  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${analyzerUrl.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-analyzer-secret": analyzerSecret,
      },
      body: JSON.stringify({
        songId,
        audioUrl,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false as const,
        data,
        error:
          data?.error ||
          data?.detail ||
          `Analyzer failed with status ${response.status}.`,
      };
    }

    return {
      ok: true as const,
      data,
      points: getAnalyzerPoints(data),
    };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "Analyzer request timed out."
        : error instanceof Error
          ? error.message
          : "Analyzer request failed.";

    return {
      ok: false as const,
      data: null,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessSetTimeout(callback: () => void, delay: number) {
  return setTimeout(callback, delay);
}

async function persistCuePoints(id: string, cleaned: NonNullable<ReturnType<typeof cleanAnalyzerPoint>>[]) {
  await supabaseServer.from("song_edit_points").delete().eq("song_id", id);

  if (cleaned.length === 0) {
    const { error: clearError } = await supabaseServer
      .from("songs")
      .update({ edit_points: EMPTY_EDIT_POINTS_JSON })
      .eq("id", id);

    if (clearError) throw clearError;

    return {
      savedRows: [] as SavedEditPointRow[],
      editPointsJson: EMPTY_EDIT_POINTS_JSON,
    };
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

  return { savedRows, editPointsJson };
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

    let rawPoints: AnalyzerPoint[] = [];
    let analyzerMeta: unknown = null;
    let source = "analyzer";

    if (analyzerUrl && analyzerSecret) {
      const analyzerResult = await fetchAnalyzerPoints({
        analyzerUrl,
        analyzerSecret,
        songId: song.id,
        audioUrl: song.audioUrl,
      });

      analyzerMeta = analyzerResult.data;

      if (analyzerResult.ok) {
        rawPoints = analyzerResult.points;
      } else {
        source = "waveform_fallback";
        rawPoints = createWaveformFallbackPoints(song.waveformPeaks, song.duration);
        analyzerMeta = {
          error: analyzerResult.error,
          fallback: "Used waveform peak fallback because the analyzer service was unreachable.",
        };
      }
    } else {
      source = "waveform_fallback";
      rawPoints = createWaveformFallbackPoints(song.waveformPeaks, song.duration);
      analyzerMeta = {
        error: "Missing AUDIO_ANALYZER_URL or AUDIO_ANALYZER_SECRET.",
        fallback: "Used waveform peak fallback because the analyzer service is not configured.",
      };
    }

    const cleaned = rawPoints
      .map(cleanAnalyzerPoint)
      .filter((point): point is NonNullable<typeof point> => Boolean(point));

    const { savedRows, editPointsJson } = await persistCuePoints(id, cleaned);

    return NextResponse.json({
      saved: savedRows.length,
      editPoints: savedRows,
      editPointsJson,
      source,
      analyzer: analyzerMeta,
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
