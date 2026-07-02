#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const source = args.source || args.input;
const targetSeconds = Number(args.length || args.seconds || 30);
const outputDir = path.resolve(args.output || "shorten-ai-interpretation-output");
const endpoint = process.env.FILMWAVE_AUDIO_INTERPRETATION_ENDPOINT || args.endpoint || "http://localhost:8000/interpret";
const token = process.env.FILMWAVE_AUDIO_INTERPRETATION_TOKEN || args.token || "";
const title = args.title || "";
const artist = args.artist || "";
const extraDescription = args.description || "";

if (!source) {
  fail([
    "Missing --source.",
    "Example:",
    '  npm run shorten:interpret-local -- --source "$HOME/Desktop/Rain Dance - Amber Caravan.wav" --length 30',
  ].join("\n"));
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

  const roundedTarget = Math.round(targetSeconds);
  const sourcePath = path.resolve(source.replace(/^~(?=\/)/, process.env.HOME || "~"));
  const outputPath = path.join(outputDir, `ai-interpretation-${roundedTarget}s.wav`);
  const requestPath = path.join(outputDir, `ai-interpretation-request-${roundedTarget}s.json`);

  try {
    await stat(sourcePath);
  } catch {
    fail([
      `Could not find source file: ${sourcePath}`,
      "If the filename has spaces, wrap the path in quotes.",
      'Example: --source "$HOME/Desktop/Rain Dance - Amber Caravan.wav"',
    ].join("\n"));
  }

  const prompt = buildInterpretationPrompt({ targetSeconds: roundedTarget, title, artist, extraDescription });
  const requestMetadata = {
    source: sourcePath,
    targetSeconds: roundedTarget,
    title: title || null,
    artist: artist || null,
    endpoint,
    prompt,
    createdAt: new Date().toISOString(),
  };

  await writeFile(requestPath, JSON.stringify(requestMetadata, null, 2));

  console.log("Filmwave AI Interpretation prototype");
  console.log(`Source:   ${sourcePath}`);
  console.log(`Length:   ${roundedTarget}s`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Request:  ${requestPath}`);
  console.log("\nSending original song to AI interpretation endpoint...");

  const audioBuffer = await readFile(sourcePath);
  const formData = new FormData();
  const file = new File([audioBuffer], path.basename(sourcePath), { type: getMimeType(sourcePath) });

  formData.set("audio", file);
  formData.set("targetSeconds", String(roundedTarget));
  formData.set("mode", "ai_interpretation");
  formData.set("prompt", prompt);
  formData.set("metadata", JSON.stringify(requestMetadata));

  if (title) formData.set("title", title);
  if (artist) formData.set("artist", artist);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch (error) {
    throw new Error([
      `Could not reach AI interpretation endpoint: ${endpoint}`,
      "Start a local AI music model server first, then run this command again.",
      "Expected endpoint behavior: accept multipart form data with fields audio, targetSeconds, prompt, metadata and return raw audio, JSON with audioBase64, or JSON with audioUrl/url/outputUrl.",
      `Original error: ${error.message || error}`,
    ].join("\n"));
  }

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  await writeInterpretationResponse({ response, outputPath });

  console.log("\nAI interpretation complete.");
  console.log(`Output: ${outputPath}`);
}

function buildInterpretationPrompt({ targetSeconds, title, artist, extraDescription }) {
  const subject = [title, artist].filter(Boolean).join(" by ");

  return [
    "Create a new short musical interpretation of the provided source song.",
    subject ? `Reference track: ${subject}.` : "Use the provided source audio as the reference track.",
    `The output must be exactly about ${targetSeconds} seconds long.`,
    "Do not simply cut, loop, crossfade, remix, master, or clean up the original audio.",
    "Generate a newly arranged short version that preserves the source song's tempo feel, key center, instrumentation, groove, emotional tone, production style, and overall identity.",
    "The result should feel like an intentional short version of the same cue, with a clear beginning, musical development, and natural ending/resolution.",
    "Avoid abrupt edits, forced crossfades, generic stock music, unrelated melodies, unrelated chord progressions, and sudden instrumentation changes.",
    "Return only the generated audio file.",
    extraDescription ? `Additional direction: ${extraDescription}` : "",
  ].filter(Boolean).join(" ");
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

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".m4a") return "audio/mp4";
  if (extension === ".flac") return "audio/flac";
  if (extension === ".ogg") return "audio/ogg";
  return "audio/wav";
}

async function readErrorResponse(response) {
  let message = `AI interpretation endpoint failed with status ${response.status}`;

  try {
    const data = await response.json();
    if (typeof data?.error === "string") message = data.error;
    if (typeof data?.message === "string") message = data.message;
  } catch {
    try {
      const text = await response.text();
      if (text.trim()) message = text.trim();
    } catch {
      // Keep fallback.
    }
  }

  return message;
}

async function writeInterpretationResponse({ response, outputPath }) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();

    if (typeof data.audioBase64 === "string") {
      await writeFile(outputPath, Buffer.from(data.audioBase64, "base64"));
      return;
    }

    const audioUrl = data.audioUrl || data.url || data.outputUrl;

    if (typeof audioUrl === "string") {
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) throw new Error(`Could not download generated audio: ${audioResponse.status}`);
      await writeFile(outputPath, Buffer.from(await audioResponse.arrayBuffer()));
      return;
    }

    throw new Error("AI interpretation endpoint returned JSON, but no audioBase64, audioUrl, url, or outputUrl was found.");
  }

  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
}
