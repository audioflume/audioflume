import { auth } from "@clerk/nextjs/server";
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
  const { userId } = await auth();
  const body = await request.json().catch(() => ({}));
  const targetSeconds = getTargetSeconds((body as Record<string, unknown>).targetSeconds);

  if (!songId) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  if (!targetSeconds) {
    return NextResponse.json({ error: "Unsupported shortened track length." }, { status: 400 });
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

  const requestPayload = {
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
  };

  const { data: job, error: jobCreateError } = await supabaseServer
    .from("song_shorten_jobs")
    .insert({
      song_id: songId,
      clerk_user_id: userId,
      target_seconds: targetSeconds,
      status: WORKER_ENDPOINT ? "queued" : "failed",
      mode: "smart_trim_ai_repair",
      provider: WORKER_ENDPOINT ? "external_worker" : null,
      source_url: sourceUrl,
      error_message: WORKER_ENDPOINT ? null : "Shorten Track worker is not configured.",
      request_payload: requestPayload,
    })
    .select()
    .single();

  if (jobCreateError || !job) {
    console.error("Failed to create Shorten Track job", jobCreateError);

    return NextResponse.json(
      { error: "Could not create Shorten Track job." },
      { status: 500 },
    );
  }

  if (!WORKER_ENDPOINT) {
    return NextResponse.json(
      {
        jobId: job.id,
        error: "Shorten Track worker is not configured.",
        requiredEnv: "FILMWAVE_SHORTEN_WORKER_ENDPOINT",
      },
      { status: 503 },
    );
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (WORKER_TOKEN) {
    headers.Authorization = `Bearer ${WORKER_TOKEN}`;
  }

  const workerPayload = {
    ...requestPayload,
    filmwaveJobId: job.id,
  };

  await supabaseServer
    .from("song_shorten_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      request_payload: workerPayload,
    })
    .eq("id", job.id);

  let workerResponse: Response;

  try {
    workerResponse = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify(workerPayload),
    });
  } catch (error) {
    console.error("Failed to call Shorten Track worker", error);

    await supabaseServer
      .from("song_shorten_jobs")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: "Could not reach Shorten Track worker.",
      })
      .eq("id", job.id);

    return NextResponse.json(
      { jobId: job.id, error: "Could not reach Shorten Track worker." },
      { status: 502 },
    );
  }

  if (!workerResponse.ok) {
    const errorMessage = await readWorkerError(workerResponse);

    await supabaseServer
      .from("song_shorten_jobs")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", job.id);

    return NextResponse.json(
      { jobId: job.id, error: errorMessage },
      { status: workerResponse.status || 502 },
    );
  }

  const result = await workerResponse.json().catch(() => null);

  if (!result || typeof result !== "object") {
    const errorMessage = "Shorten worker returned an invalid response.";

    await supabaseServer
      .from("song_shorten_jobs")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", job.id);

    return NextResponse.json(
      { jobId: job.id, error: errorMessage },
      { status: 502 },
    );
  }

  const resultRecord = result as Record<string, unknown>;

  await supabaseServer
    .from("song_shorten_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      worker_job_id: getString(resultRecord.workerJobId || resultRecord.jobId) || null,
      output_url: getString(resultRecord.outputUrl || resultRecord.audioUrl || resultRecord.url) || null,
      output_key: getString(resultRecord.outputKey) || null,
      output_hls_url: getString(resultRecord.outputHlsUrl || resultRecord.hlsUrl) || null,
      output_hls_key: getString(resultRecord.outputHlsKey || resultRecord.hlsKey) || null,
      output_waveform_peaks: resultRecord.waveformPeaks || null,
      output_size_bytes: Number.isFinite(Number(resultRecord.sizeBytes)) ? Number(resultRecord.sizeBytes) : null,
      output_duration_seconds: Number.isFinite(Number(resultRecord.durationSeconds))
        ? Number(resultRecord.durationSeconds)
        : null,
      result_payload: resultRecord,
    })
    .eq("id", job.id);

  return NextResponse.json({
    ...resultRecord,
    jobId: job.id,
    mode: "shorten_track_ai_repair",
    targetSeconds,
  });
}
