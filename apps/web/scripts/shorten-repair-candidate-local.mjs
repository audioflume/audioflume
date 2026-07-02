#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const args = parseArgs(process.argv.slice(2));
const source = args.source || args.input;
const targetSeconds = Number(args.length || args.seconds || 30);
const outputDir = path.resolve(args.output || "shorten-ai-repair-output");

if (!source) {
  fail('Missing --source. Example: node scripts/shorten-repair-candidate-local.mjs --source "$HOME/Desktop/song.wav" --length 30');
}

if (!Number.isFinite(targetSeconds) || ![15, 30, 60].includes(Math.round(targetSeconds))) {
  fail("Unsupported --length. Use 15, 30, or 60.");
}

await main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  await mkdir(outputDir, { recursive: true });

  const sourcePath = path.resolve(source.replace(/^~(?=\/)/, process.env.HOME || "~"));

  try {
    await stat(sourcePath);
  } catch {
    fail([
      `Could not find source file: ${sourcePath}`,
      "If the filename has spaces, wrap the path in quotes.",
      'Example: --source "$HOME/Desktop/Rain Dance - Amber Caravan.wav"',
    ].join("\n"));
  }

  const roundedTarget = Math.round(targetSeconds);
  const smartEditPath = path.join(outputDir, `smart-edit-${roundedTarget}s.wav`);
  const planPath = path.join(outputDir, `shorten-plan-${roundedTarget}s.json`);
  const oldRepairCandidatePath = path.join(outputDir, `repair-candidate-${roundedTarget}s.wav`);
  const duration = await getDurationSeconds(sourcePath);
  const plan = buildSmartEditPlan({ duration, targetSeconds: roundedTarget });

  await unlink(oldRepairCandidatePath).catch(() => undefined);

  console.log("Creating two-section smart edit...");
  await renderSmartEdit({ sourcePath, outputPath: smartEditPath, plan });

  await writeFile(
    planPath,
    JSON.stringify(
      {
        source: sourcePath,
        duration,
        targetSeconds: roundedTarget,
        plan,
        outputPath: smartEditPath,
        createdAt: new Date().toISOString(),
        note: "This is a deterministic two-section smart edit. It does not apply EQ, normalization, limiting, or AI repair.",
      },
      null,
      2,
    ),
  );

  console.log("Done.");
  console.log(`Smart edit: ${smartEditPath}`);
  console.log(`Plan:       ${planPath}`);
  console.log("Note: this is the smarter edit baseline. True AI repair comes after this sounds musically close enough.");
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const value = rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--") ? rawArgs[++index] : "true";
    parsed[key] = value;
  }

  return parsed;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildSmartEditPlan({ duration, targetSeconds }) {
  const safeTarget = Math.min(targetSeconds, duration);
  const useTwoSections = duration > safeTarget + 18 && safeTarget >= 15;

  if (!useTwoSections) {
    return {
      mode: "continuous",
      targetSeconds: safeTarget,
      crossfadeSeconds: 0,
      segments: [
        {
          role: "main",
          start: clamp(duration * 0.18, 0, Math.max(0, duration - safeTarget)),
          length: safeTarget,
        },
      ],
    };
  }

  const crossfadeSeconds = clamp(safeTarget * 0.075, 0.9, 2.2);
  const endingLength = clamp(safeTarget * 0.28, safeTarget <= 20 ? 4 : 7, safeTarget <= 20 ? 5.5 : 15);
  const firstLength = safeTarget + crossfadeSeconds - endingLength;
  const minimumGap = Math.max(5, crossfadeSeconds * 3);
  const latestFirstStart = Math.max(0, duration - firstLength - endingLength - minimumGap);
  const firstStart = clamp(duration * 0.12, 0, latestFirstStart);
  const endingSearchStart = Math.max(duration * 0.52, firstStart + firstLength + minimumGap);
  const endingStart = clamp(duration - endingLength - duration * 0.06, endingSearchStart, Math.max(endingSearchStart, duration - endingLength));

  return {
    mode: "two_section_ending_blend",
    targetSeconds: safeTarget,
    crossfadeSeconds,
    segments: [
      {
        role: "main_body",
        start: firstStart,
        length: firstLength,
      },
      {
        role: "natural_ending",
        start: endingStart,
        length: endingLength,
      },
    ],
  };
}

async function renderSmartEdit({ sourcePath, outputPath, plan }) {
  if (plan.mode === "continuous") {
    const segment = plan.segments[0];

    await runFfmpeg([
      "-y",
      "-ss",
      String(segment.start),
      "-t",
      String(segment.length),
      "-i",
      sourcePath,
      "-af",
      `afade=t=in:st=0:d=0.04,afade=t=out:st=${Math.max(0, segment.length - 1.45)}:d=1.45`,
      "-ar",
      "44100",
      "-acodec",
      "pcm_s16le",
      outputPath,
    ]);
    return;
  }

  const [first, second] = plan.segments;
  const crossfade = plan.crossfadeSeconds;
  const firstEndFadeStart = Math.max(0, first.length - crossfade);
  const secondEndFadeStart = Math.max(0, second.length - 1.45);
  const outputDuration = first.length + second.length - crossfade;

  await runFfmpeg([
    "-y",
    "-ss",
    String(first.start),
    "-t",
    String(first.length),
    "-i",
    sourcePath,
    "-ss",
    String(second.start),
    "-t",
    String(second.length),
    "-i",
    sourcePath,
    "-filter_complex",
    [
      `[0:a]afade=t=in:st=0:d=0.04,afade=t=out:st=${firstEndFadeStart}:d=${crossfade}[main]`,
      `[1:a]afade=t=in:st=0:d=${crossfade},afade=t=out:st=${secondEndFadeStart}:d=1.45[ending]`,
      `[main][ending]acrossfade=d=${crossfade}:c1=tri:c2=tri[out]`,
    ].join(";"),
    "-map",
    "[out]",
    "-t",
    String(outputDuration),
    "-ar",
    "44100",
    "-acodec",
    "pcm_s16le",
    outputPath,
  ]);
}

async function resolveFfmpegPath() {
  const candidates = [
    process.env.FFMPEG_PATH,
    ffmpegPath || undefined,
    path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
    path.join(process.cwd(), "..", "..", "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
    "ffmpeg",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "ffmpeg") return candidate;

    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return "ffmpeg";
}

async function runFfmpeg(args) {
  const ffmpeg = await resolveFfmpegPath();

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function getDurationSeconds(sourcePath) {
  const ffmpeg = await resolveFfmpegPath();

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ["-hide_banner", "-i", sourcePath], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);

      if (!match) {
        reject(new Error("Could not read source duration from ffmpeg."));
        return;
      }

      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      const duration = hours * 3600 + minutes * 60 + seconds;

      if (!Number.isFinite(duration) || duration <= 0) reject(new Error("Could not read source duration."));
      else resolve(duration);
    });
  });
}
