#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

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

  const smartTrimPath = path.join(outputDir, `smart-trim-${Math.round(targetSeconds)}s.wav`);
  const repairCandidatePath = path.join(outputDir, `repair-candidate-${Math.round(targetSeconds)}s.wav`);
  const duration = await getDurationSeconds(sourcePath);
  const start = Math.max(0, Math.min(duration - targetSeconds, duration * 0.18));

  console.log("Creating smart-trim file...");
  await runFfmpeg([
    "-y",
    "-ss",
    String(start),
    "-t",
    String(targetSeconds),
    "-i",
    sourcePath,
    "-af",
    `afade=t=in:st=0:d=0.04,afade=t=out:st=${Math.max(0, targetSeconds - 1.45)}:d=1.45`,
    "-ar",
    "44100",
    "-acodec",
    "pcm_s16le",
    smartTrimPath,
  ]);

  console.log("Creating local repair candidate file...");
  await runFfmpeg([
    "-y",
    "-i",
    smartTrimPath,
    "-af",
    "highpass=f=24,lowpass=f=19000,dynaudnorm=f=250:g=5:p=0.86:m=8,alimiter=limit=0.97",
    "-ar",
    "44100",
    "-acodec",
    "pcm_s16le",
    repairCandidatePath,
  ]);

  console.log("Done.");
  console.log(`Smart trim: ${smartTrimPath}`);
  console.log(`Repair candidate: ${repairCandidatePath}`);
  console.log("Note: repair-candidate is local DSP cleanup, not true AI. True AI needs a local model endpoint.");
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

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || "ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
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

function getDurationSeconds(sourcePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFPROBE_PATH || "ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      sourcePath,
    ]);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `ffprobe exited with code ${code}`));
        return;
      }

      const duration = Number(stdout.trim());
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error("Could not read source duration."));
      else resolve(duration);
    });
  });
}
