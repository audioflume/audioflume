#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const args = parseArgs(process.argv.slice(2));
const targetSeconds = Number(args.length || args.seconds || 30);
const source = args.source || args.input;
const outputDir = path.resolve(args.output || "shorten-ai-repair-output");
const providerEndpoint = process.env.FILMWAVE_AUDIO_REPAIR_ENDPOINT || args.repairEndpoint || "";
const providerToken = process.env.FILMWAVE_AUDIO_REPAIR_TOKEN || args.repairToken || "";

if (!source) {
  fail(
    [
      "Missing --source.",
      "Example:",
      "  npm run shorten:ai-local -- --source ./song.mp3 --length 30",
      "  npm run shorten:ai-local -- --source https://example.com/song.mp3 --length 30",
    ].join("\n"),
  );
}

if (!Number.isFinite(targetSeconds) || ![15, 30, 60].includes(Math.round(targetSeconds))) {
  fail("Unsupported --length. Use 15, 30, or 60.");
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const tempDir = await mkdtemp(path.join(tmpdir(), "filmwave-shorten-local-"));

  try {
    const sourcePath = await prepareSource(source, tempDir);
    const roughPath = path.join(outputDir, `smart-trim-${Math.round(targetSeconds)}s.wav`);
    const repairedPath = path.join(outputDir, `ai-repair-${Math.round(targetSeconds)}s.wav`);
    const metadataPath = path.join(outputDir, `shorten-plan-${Math.round(targetSeconds)}s.json`);
    const duration = await getDurationSeconds(sourcePath);
    const plan = buildSmartTrimPlan({ duration, targetSeconds });

    await renderSmartTrim({ sourcePath, outputPath: roughPath, plan });

    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          source,
          sourcePath,
          duration,
          targetSeconds,
          plan,
          repaired: Boolean(providerEndpoint),
          providerEndpointConfigured: Boolean(providerEndpoint),
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    if (providerEndpoint) {
      await repairAudio({
        inputPath: roughPath,
        outputPath: repairedPath,
        endpoint: providerEndpoint,
        token: providerToken,
        targetSeconds,
      });
    }

    console.log("\nShorten Track local prototype complete.");
    console.log(`Smart trim: ${roughPath}`);
    console.log(`Plan:       ${metadataPath}`);

    if (providerEndpoint) {
      console.log(`AI repair:  ${repairedPath}`);
    } else {
      console.log("AI repair:  skipped — set FILMWAVE_AUDIO_REPAIR_ENDPOINT when a local/provider endpoint exists.");
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const value = rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--")
      ? rawArgs[++index]
      : "true";

    parsed[key] = value;
  }

  return parsed;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function prepareSource(input, tempDir) {
  if (!isUrl(input)) {
    const localPath = path.resolve(input);
    await stat(localPath);
    return localPath;
  }

  const response = await fetch(input);

  if (!response.ok || !response.body) {
    throw new Error(`Could not download source audio: ${response.status}`);
  }

  const extension = path.extname(new URL(input).pathname) || ".audio";
  const outputPath = path.join(tempDir, `source${extension}`);
  await pipeline(response.body, createWriteStream(outputPath));
  return outputPath;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || "ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function getDurationSeconds(sourcePath) {
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

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read source duration."));
        return;
      }

      resolve(duration);
    });
  });
}

function buildSmartTrimPlan({ duration, targetSeconds }) {
  const safeTarget = Math.min(targetSeconds, duration);
  const useTwoSegments = duration > safeTarget + 18 && safeTarget >= 15;

  if (!useTwoSegments) {
    return {
      mode: "continuous",
      targetSeconds: safeTarget,
      segments: [
        {
          start: Math.max(0, Math.min(duration - safeTarget, duration * 0.18)),
          length: safeTarget,
        },
      ],
      crossfadeSeconds: 0,
    };
  }

  const crossfadeSeconds = Math.min(2.2, Math.max(0.9, safeTarget * 0.075));
  const endingLength = Math.min(Math.max(safeTarget * 0.28, 5), 14);
  const firstLength = safeTarget + crossfadeSeconds - endingLength;
  const firstStart = Math.max(0, duration * 0.12);
  const secondStart = Math.max(firstStart + firstLength + 5, duration - endingLength - duration * 0.08);

  return {
    mode: "matched_blend_baseline",
    targetSeconds: safeTarget,
    crossfadeSeconds,
    segments: [
      {
        start: Math.min(firstStart, Math.max(0, duration - firstLength - endingLength - 5)),
        length: firstLength,
      },
      {
        start: Math.min(secondStart, Math.max(0, duration - endingLength)),
        length: endingLength,
      },
    ],
  };
}

async function renderSmartTrim({ sourcePath, outputPath, plan }) {
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
      "afade=t=in:st=0:d=0.04,afade=t=out:st=" + Math.max(0, segment.length - 1.45) + ":d=1.45",
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
      `[0:a]afade=t=in:st=0:d=0.04,afade=t=out:st=${firstEndFadeStart}:d=${crossfade}[a0]`,
      `[1:a]afade=t=in:st=0:d=${crossfade},afade=t=out:st=${Math.max(0, second.length - 1.45)}:d=1.45[a1]`,
      `[a0][a1]acrossfade=d=${crossfade}:c1=tri:c2=tri[out]`,
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

async function repairAudio({ inputPath, outputPath, endpoint, token, targetSeconds }) {
  const formData = new FormData();
  const fileBuffer = await readFile(inputPath);
  const file = new File([fileBuffer], path.basename(inputPath), { type: "audio/wav" });

  formData.set("audio", file);
  formData.set("targetSeconds", String(targetSeconds));
  formData.set(
    "prompt",
    [
      "Repair the musical edit in this shortened track.",
      "Do not regenerate a new song.",
      "Preserve instrumentation, tempo, key, groove, dynamics, and mix character.",
      "Only smooth awkward joins, transition clicks, rough fade points, and unnatural endings.",
      "Return repaired audio only.",
    ].join(" "),
  );

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let message = `AI repair endpoint failed with status ${response.status}`;

    try {
      const data = await response.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // Keep fallback.
    }

    throw new Error(message);
  }

  const repaired = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, repaired);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
