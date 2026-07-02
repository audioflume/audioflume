import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { constants, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { NextResponse } from "next/server";
import { getSongById } from "@/lib/songs";
import type { Song } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ songId: string }> | { songId: string };
};

type ArrangementSegment = {
  start: number;
  end: number;
  role?: string;
};

type ArrangementPlan = {
  targetSeconds: number;
  crossfadeSeconds: number;
  segments: ArrangementSegment[];
  source: "external_arranger" | "server_structure";
};

type ExternalArrangerResponse = {
  audioUrl?: string;
  mimeType?: string;
  actualDurationSeconds?: number;
  segments?: ArrangementSegment[];
  crossfadeSeconds?: number;
};

type LocalEditPointMarker = {
  label?: string;
  time?: number | string;
  type?: string;
};

const execFileAsync = promisify(execFile);
const SUPPORTED_TARGETS = new Set([15, 30, 60]);
const FFMPEG_BINARY_NAME = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

async function canExecute(filePath: string | null | undefined) {
  if (!filePath) return false;

  try {
    await fs.access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveFfmpegPath() {
  const appRoot = process.cwd();
  const workspaceRoot = path.resolve(appRoot, "../..");
  const candidatePaths = [
    process.env.FFMPEG_PATH,
    ffmpegPath || undefined,
    path.join(appRoot, "node_modules", "ffmpeg-static", FFMPEG_BINARY_NAME),
    path.join(workspaceRoot, "node_modules", "ffmpeg-static", FFMPEG_BINARY_NAME),
  ];

  for (const candidatePath of candidatePaths) {
    if (await canExecute(candidatePath)) return candidatePath;
  }

  try {
    await execFileAsync("ffmpeg", ["-version"], { maxBuffer: 1024 * 1024 });
    return "ffmpeg";
  } catch {
    throw new Error(
      "FFmpeg binary was not found. Run npm install from the repo root or set FFMPEG_PATH to a valid ffmpeg binary.",
    );
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toEditPointKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("/", " ")
    .replaceAll("-", " ")
    .replaceAll(".", "")
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_");
}

function normalizeEditPointType(value: string) {
  const key = toEditPointKey(value);

  if (key === "first_hit" || key === "firsthit" || key.includes("first_hit")) return "first_hit";
  if ((key.includes("first") && key.includes("hit")) || key.includes("intro_hit")) return "first_hit";
  if (key === "main_drop" || key === "drop" || key.includes("main_drop")) return "drop";
  if (key.includes("drop") || key.includes("impact") || key.includes("peak")) return "drop";
  if (key.includes("break") || key.includes("breakdown") || key.includes("bridge")) return "break";
  if (key.includes("button") || key.includes("ending") || key.includes("outro") || key === "end") return "button_ending";

  return key;
}

function parseEditPointMarkers(value: Song["editPoints"]) {
  if (!value) return [] as LocalEditPointMarker[];

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed?.markers) ? parsed.markers as LocalEditPointMarker[] : [];
  } catch {
    return [] as LocalEditPointMarker[];
  }
}

function getMarkerType(marker: LocalEditPointMarker) {
  return normalizeEditPointType(String(marker.type || marker.label || ""));
}

function getMarkerTime(song: Song, type: string) {
  const normalizedType = normalizeEditPointType(type);
  const marker = parseEditPointMarkers(song.editPoints).find((item) => getMarkerType(item) === normalizedType);
  const time = Number(marker?.time);

  return Number.isFinite(time) ? time : null;
}

function getBarSeconds(song: Song) {
  const bpm = Number(song.bpm);

  if (!Number.isFinite(bpm) || bpm < 45 || bpm > 220) return 2;

  return (60 / bpm) * 4;
}

function snapToBar(song: Song, time: number, anchor: number) {
  const bar = getBarSeconds(song);
  const snapped = anchor + Math.round((time - anchor) / bar) * bar;
  const snapLimit = Math.min(1.25, bar * 0.45);

  if (Math.abs(snapped - time) > snapLimit) return time;

  return snapped;
}

function getTargetSeconds(value: unknown) {
  const targetSeconds = Number(value);

  if (!Number.isFinite(targetSeconds)) return null;

  const rounded = Math.round(targetSeconds);

  if (!SUPPORTED_TARGETS.has(rounded)) return null;

  return rounded;
}

function makeSegment(start: number, length: number, duration: number, role: string): ArrangementSegment {
  const safeLength = clamp(length, 0.5, duration);
  const safeStart = clamp(start, 0, Math.max(0, duration - safeLength));

  return {
    start: Number(safeStart.toFixed(3)),
    end: Number((safeStart + safeLength).toFixed(3)),
    role,
  };
}

function createContinuousFallback(song: Song, targetSeconds: number): ArrangementPlan {
  const duration = Math.max(0, Number(song.duration || 0));
  const firstHit = getMarkerTime(song, "first_hit");
  const drop = getMarkerTime(song, "drop");
  const hook = drop ?? firstHit;
  const leadIn = Math.min(4, targetSeconds * 0.15);
  const rawStart = hook !== null ? hook - leadIn : duration * 0.18;
  const start = clamp(rawStart, 0, Math.max(0, duration - targetSeconds));

  return {
    targetSeconds,
    crossfadeSeconds: 0,
    source: "server_structure",
    segments: [makeSegment(start, Math.min(targetSeconds, duration), duration, "continuous_hook")],
  };
}

function createLocalArrangementPlan(song: Song, targetSeconds: number): ArrangementPlan {
  const duration = Math.max(0, Number(song.duration || 0));

  if (!Number.isFinite(duration) || duration <= 0) {
    return {
      targetSeconds,
      crossfadeSeconds: 0,
      source: "server_structure",
      segments: [{ start: 0, end: targetSeconds, role: "fallback" }],
    };
  }

  if (duration <= targetSeconds + 1) {
    return createContinuousFallback(song, targetSeconds);
  }

  const firstHit = getMarkerTime(song, "first_hit");
  const drop = getMarkerTime(song, "drop");
  const breakPoint = getMarkerTime(song, "break");
  const buttonEnding = getMarkerTime(song, "button_ending");
  const hook = drop ?? firstHit ?? breakPoint;

  if (hook === null) {
    return createContinuousFallback(song, targetSeconds);
  }

  const crossfadeSeconds = clamp(targetSeconds * 0.035, 0.45, 1.1);
  const gridAnchor = firstHit ?? drop ?? hook;
  const endingLength = targetSeconds <= 15 ? 4.75 : targetSeconds <= 30 ? 8 : 13;
  const hookLeadIn = Math.min(getBarSeconds(song), targetSeconds <= 15 ? 1.5 : 3.5);
  const endingTailLead = Math.min(2.5, endingLength * 0.25);
  const endingStart = buttonEnding !== null
    ? snapToBar(song, buttonEnding - (endingLength - endingTailLead), gridAnchor)
    : null;

  if (endingStart === null || endingStart <= hook + 4 || endingStart >= duration - 0.25) {
    return createContinuousFallback(song, targetSeconds);
  }

  if (targetSeconds < 45) {
    const hookLength = targetSeconds + crossfadeSeconds - endingLength;
    const hookStart = snapToBar(song, hook - hookLeadIn, gridAnchor);
    const hookSegment = makeSegment(hookStart, hookLength, duration, "hook");
    const endingSegment = makeSegment(endingStart, endingLength, duration, "ending");

    if (endingSegment.start <= hookSegment.end + 0.5) {
      return createContinuousFallback(song, targetSeconds);
    }

    return {
      targetSeconds,
      crossfadeSeconds,
      source: "server_structure",
      segments: [hookSegment, endingSegment],
    };
  }

  const setupLength = 7.5;
  const hookLength = targetSeconds + crossfadeSeconds * 2 - setupLength - endingLength;
  const setupAnchor = firstHit !== null && firstHit > setupLength + 1 ? firstHit - setupLength * 0.55 : 0;
  const setupStart = snapToBar(song, setupAnchor, gridAnchor);
  const hookStart = snapToBar(song, hook - Math.min(4, hookLength * 0.12), gridAnchor);
  const setupSegment = makeSegment(setupStart, setupLength, duration, "setup");
  const hookSegment = makeSegment(hookStart, hookLength, duration, "hook");
  const endingSegment = makeSegment(endingStart, endingLength, duration, "ending");

  if (hookSegment.start <= setupSegment.end + 0.5 || endingSegment.start <= hookSegment.end + 0.5) {
    return createContinuousFallback(song, targetSeconds);
  }

  return {
    targetSeconds,
    crossfadeSeconds,
    source: "server_structure",
    segments: [setupSegment, hookSegment, endingSegment],
  };
}

function normalizeExternalSegments(segments: unknown, duration: number): ArrangementSegment[] {
  if (!Array.isArray(segments)) return [];

  return segments.flatMap((segment, index) => {
    const record = segment && typeof segment === "object" ? segment as Record<string, unknown> : null;
    if (!record) return [];

    const start = Number(record.start);
    const end = Number(record.end);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

    return [
      {
        start: Number(clamp(start, 0, duration).toFixed(3)),
        end: Number(clamp(end, 0, duration).toFixed(3)),
        role: typeof record.role === "string" ? record.role : `segment_${index + 1}`,
      },
    ];
  });
}

async function fetchExternalArrangement(song: Song, targetSeconds: number) {
  const arrangerUrl = process.env.AUDIO_ARRANGER_URL;
  const arrangerSecret = process.env.AUDIO_ARRANGER_SECRET;

  if (!arrangerUrl || !arrangerSecret) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${arrangerUrl.replace(/\/$/, "")}/shorten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-arranger-secret": arrangerSecret,
      },
      body: JSON.stringify({
        targetSeconds,
        song: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          audioUrl: song.audioUrl || song.playbackUrl,
          duration: song.duration,
          bpm: song.bpm,
          key: song.key,
          editPoints: song.editPoints,
          waveformPeaks: song.waveformPeaks,
        },
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null) as ExternalArrangerResponse | null;

    if (!response.ok || !data) return null;

    return data;
  } catch (error) {
    console.error("Audio arranger request failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAudioBuffer(url: string) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load source audio. Status ${response.status}.`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function getFilterComplex(plan: ArrangementPlan) {
  const fade = plan.crossfadeSeconds;
  const segmentFilters = plan.segments.map((segment, index) => {
    return `[0:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}]`;
  });

  if (plan.segments.length === 1 || fade <= 0) {
    return `${segmentFilters.join(";")};[a0]atrim=0:${plan.targetSeconds},afade=t=in:st=0:d=0.03,afade=t=out:st=${Math.max(0, plan.targetSeconds - 1.25)}:d=1.25[out]`;
  }

  const crossfades: string[] = [];
  let previousLabel = "a0";

  for (let index = 1; index < plan.segments.length; index += 1) {
    const outputLabel = index === plan.segments.length - 1 ? "xfinal" : `x${index}`;
    crossfades.push(`[${previousLabel}][a${index}]acrossfade=d=${fade}:c1=tri:c2=tri[${outputLabel}]`);
    previousLabel = outputLabel;
  }

  return `${segmentFilters.join(";")};${crossfades.join(";")};[${previousLabel}]atrim=0:${plan.targetSeconds},afade=t=in:st=0:d=0.03,afade=t=out:st=${Math.max(0, plan.targetSeconds - 1.25)}:d=1.25[out]`;
}

async function renderArrangement({
  sourceAudio,
  plan,
}: {
  sourceAudio: Buffer;
  plan: ArrangementPlan;
}) {
  const executableFfmpegPath = await resolveFfmpegPath();
  const id = randomUUID();
  const inputPath = path.join(os.tmpdir(), `${id}-source.audio`);
  const outputPath = path.join(os.tmpdir(), `${id}-short.wav`);

  try {
    await fs.writeFile(inputPath, sourceAudio);

    await execFileAsync(executableFfmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-filter_complex",
      getFilterComplex(plan),
      "-map",
      "[out]",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-f",
      "wav",
      outputPath,
    ], { maxBuffer: 1024 * 1024 * 20 });

    return await fs.readFile(outputPath);
  } finally {
    await Promise.allSettled([fs.unlink(inputPath), fs.unlink(outputPath)]);
  }
}

async function streamExternalAudio(data: ExternalArrangerResponse) {
  if (!data.audioUrl) return null;

  const response = await fetch(data.audioUrl, { cache: "no-store" });

  if (!response.ok || !response.body) return null;

  return new Response(response.body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": data.mimeType || response.headers.get("content-type") || "audio/wav",
      "X-Filmwave-Shorten-Source": "external_arranger",
      "X-Filmwave-Shorten-Duration": String(data.actualDurationSeconds || ""),
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { songId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const targetSeconds = getTargetSeconds((body as Record<string, unknown>).targetSeconds);

    if (!targetSeconds) {
      return NextResponse.json({ error: "Unsupported shortened track length." }, { status: 400 });
    }

    const song = await getSongById(songId);

    if (!song) {
      return NextResponse.json({ error: "Song not found." }, { status: 404 });
    }

    const sourceUrl = String(song.audioUrl || song.playbackUrl || "").trim();

    if (!sourceUrl) {
      return NextResponse.json({ error: "Song audio not found." }, { status: 404 });
    }

    const externalArrangement = await fetchExternalArrangement(song, targetSeconds);
    const externalAudio = externalArrangement ? await streamExternalAudio(externalArrangement) : null;

    if (externalAudio) return externalAudio;

    const sourceAudio = await fetchAudioBuffer(sourceUrl);
    const externalSegments = externalArrangement?.segments
      ? normalizeExternalSegments(externalArrangement.segments, song.duration)
      : [];
    const plan: ArrangementPlan = externalSegments.length > 0
      ? {
          targetSeconds,
          crossfadeSeconds: clamp(Number(externalArrangement?.crossfadeSeconds ?? targetSeconds * 0.035), 0.35, 1.2),
          segments: externalSegments,
          source: "external_arranger",
        }
      : createLocalArrangementPlan(song, targetSeconds);
    const output = await renderArrangement({ sourceAudio, plan });

    return new Response(output, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "audio/wav",
        "Content-Length": String(output.byteLength),
        "X-Filmwave-Shorten-Source": plan.source,
        "X-Filmwave-Shorten-Plan": encodeURIComponent(JSON.stringify(plan)),
      },
    });
  } catch (error) {
    console.error("Failed to create shortened track", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create shortened track.",
      },
      { status: 500 },
    );
  }
}
