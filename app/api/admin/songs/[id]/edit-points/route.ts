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

function clampConfidence(value: unknown) {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric)) return null;

  return Math.max(0, Math.min(1, numeric));
}

function cleanEditPoint(point: EditPointPayload) {
  const time = Number(point.time);

  if (!point.type || !Number.isFinite(time) || time < 0) return null;

  return {
    type: String(point.type).trim(),
    time_seconds: Number(time.toFixed(2)),
    label: point.label?.trim() || point.type,
    confidence: clampConfidence(point.confidence),
    source: "corrected",
  };
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

    return NextResponse.json({
      saved: data?.length ?? 0,
      editPoints: data ?? [],
    });
  } catch (err) {
    console.error("Edit point save failed:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save edit points" },
      { status: 500 },
    );
  }
}
