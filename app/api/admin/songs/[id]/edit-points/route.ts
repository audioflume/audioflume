import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type EditPointPayload = {
  id?: string;
  type: string;
  time: number;
  label?: string;
  confidence?: number;
  source?: string;
};

type SaveEditPointsPayload = {
  editPoints: EditPointPayload[];
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

function clampConfidence(value: unknown) {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric)) return null;

  return Math.max(0, Math.min(1, numeric));
}

function cleanSource(source: unknown) {
  const value = String(source || "").trim();

  if (value === "manual") return "manual";
  if (value === "auto") return "auto";

  return "corrected";
}

function cleanEditPoint(point: EditPointPayload) {
  const time = Number(point.time);

  if (!point.type || !Number.isFinite(time) || time < 0) return null;

  return {
    type: String(point.type).trim(),
    time_seconds: Number(time.toFixed(2)),
    label: point.label?.trim() || point.type,
    confidence: clampConfidence(point.confidence),
    source: cleanSource(point.source),
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

    const payload = (await req.json()) as SaveEditPointsPayload;
    const cleaned = (payload.editPoints || [])
      .map(cleanEditPoint)
      .filter((point): point is NonNullable<typeof point> => Boolean(point));

    const { data: existingSong, error: songError } = await supabaseServer
      .from("songs")
      .select("id")
      .eq("id", id)
      .single();

    if (songError || !existingSong) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    await supabaseServer.from("song_edit_points").delete().eq("song_id", id);

    if (cleaned.length === 0) {
      const { error: clearError } = await supabaseServer
        .from("songs")
        .update({ edit_points: EMPTY_EDIT_POINTS_JSON })
        .eq("id", id);

      if (clearError) throw clearError;

      return NextResponse.json({ saved: 0, editPoints: [] });
    }

    const rows = cleaned.map((point) => ({
      song_id: id,
      type: point.type,
      time_seconds: point.time_seconds,
      label: point.label,
      confidence: point.confidence,
      source: point.source,
    }));

    const { data, error } = await supabaseServer
      .from("song_edit_points")
      .insert(rows)
      .select("id, song_id, type, time_seconds, label, confidence, source, created_at")
      .order("time_seconds", { ascending: true });

    if (error) throw error;

    const savedRows = (data ?? []) as SavedEditPointRow[];
    const editPointsJson = editPointRowsToJson(savedRows);

    const { error: syncError } = await supabaseServer
      .from("songs")
      .update({ edit_points: editPointsJson })
      .eq("id", id);

    if (syncError) throw syncError;

    return NextResponse.json({
      saved: savedRows.length,
      editPoints: savedRows,
    });
  } catch (err) {
    console.error("Edit point save failed:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save edit points" },
      { status: 500 },
    );
  }
}
