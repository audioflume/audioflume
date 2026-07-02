import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ songId: string }> | { songId: string };
};

const SUPPORTED_TARGETS = new Set([15, 30, 60]);
const WORKER_ENDPOINT = process.env.FILMWAVE_SHORTEN_WORKER_ENDPOINT?.trim() || "";
const WORKER_TOKEN = process.env.FILMWAVE_SHORTEN_WORKER_TOKEN?.trim() || "";

function getTargetSeconds(value: unknown) {
  const targetSeconds = Number(value);

  if (!Number.isFinite(targetSeconds)) return null;

  const rounded = Math.round(targetSeconds);

  if (!SUPPORTED_TARGETS.has(rounded)) return null;

  return rounded;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readWorkerError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
  } catch {
    // Keep the fallback below.
  }

  return `Shorten worker failed with status ${response.status}.`;
}

export async function POST(request: Request, context: RouteContext) {
  const { songId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const targetSeconds = getTargetSeconds((body as Record<string, unknown>).targetSeconds);

  if (!songId) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  if (!targetSeconds) {
    return NextResponse.json({ error: "Unsupported shortened track length." }, { status: 400 });
  }

  if (!WORKER_ENDPOINT) {
    return NextResponse.json(
      {
        error: "Shorten Track worker is not configured.",
        requiredEnv: "FILMWAVE_SHORTEN_WORKER_ENDPOINT",
      },
      { status: 503 },
    );
  }

  const { data: song, error: fetchError } = await supabaseServer
    .from("songs")
    .select("id, title, artist, bpm, key, duration, audio_url, playback_url, edit_points")
    .eq("id", songId)
    .single();

  if (fetchError || !song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  const sourceUrl = getString(song.audio_url) || getString(song.playback_url);

  if (!sourceUrl) {
    return NextResponse.json({ error: "Song audio not found." }, { status: 404 });
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (WORKER_TOKEN) {
    headers.Authorization = `Bearer ${WORKER_TOKEN}`;
  }

  let workerResponse: Response;

  try {
    workerResponse = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        jobType: "shorten_track_ai_repair",
        songId,
        targetSeconds,
        sourceUrl,
        song: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          bpm: song.bpm,
          key: song.key,
          duration: song.duration,
          editPoints: song.edit_points,
        },
        requestedOutput: {
          format: "mp3",
          includeWaveform: true,
          uploadToStorage: true,
        },
      }),
    });
  } catch (error) {
    console.error("Failed to call Shorten Track worker", error);

    return NextResponse.json(
      { error: "Could not reach Shorten Track worker." },
      { status: 502 },
    );
  }

  if (!workerResponse.ok) {
    return NextResponse.json(
      { error: await readWorkerError(workerResponse) },
      { status: workerResponse.status || 502 },
    );
  }

  const result = await workerResponse.json().catch(() => null);

  if (!result || typeof result !== "object") {
    return NextResponse.json(
      { error: "Shorten worker returned an invalid response." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ...result,
    mode: "shorten_track_ai_repair",
    targetSeconds,
  });
}
