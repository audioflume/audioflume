import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ songId: string }> | { songId: string };
};

const REPAIR_ENDPOINT = process.env.FILMWAVE_AUDIO_REPAIR_ENDPOINT?.trim() || "";
const REPAIR_TOKEN = process.env.FILMWAVE_AUDIO_REPAIR_TOKEN?.trim() || "";
const MAX_REPAIR_UPLOAD_BYTES = 1024 * 1024 * 80;

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildRepairPrompt({
  songTitle,
  artist,
  targetSeconds,
}: {
  songTitle: string;
  artist: string;
  targetSeconds: number | null;
}) {
  const targetLabel = targetSeconds ? `${targetSeconds} seconds` : "the requested length";
  const trackLabel = [songTitle, artist].filter(Boolean).join(" by ") || "this track";

  return [
    `Repair the musical edit in ${trackLabel}.`,
    `Keep the edit at approximately ${targetLabel}.`,
    "Do not regenerate a new song.",
    "Preserve the original instrumentation, tempo, key, groove, dynamics, and mix character.",
    "Only smooth awkward joins, transition clicks, rough fade points, and unnatural endings.",
    "Return only the repaired audio file.",
  ].join(" ");
}

async function readProviderError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
  } catch {
    // Keep fallback.
  }

  return `AI repair provider failed with status ${response.status}.`;
}

async function responseFromAudioUrl(audioUrl: string) {
  const audioResponse = await fetch(audioUrl, { cache: "no-store" });

  if (!audioResponse.ok) {
    return NextResponse.json(
      { error: "AI repair provider returned an audio URL that could not be loaded." },
      { status: 502 },
    );
  }

  const audioBuffer = await audioResponse.arrayBuffer();
  const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-Filmwave-Audio-Repair": "true",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { songId } = await context.params;

  if (!songId) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  if (!REPAIR_ENDPOINT) {
    return NextResponse.json(
      {
        error: "AI audio repair provider is not configured.",
        requiredEnv: "FILMWAVE_AUDIO_REPAIR_ENDPOINT",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Invalid AI repair request." }, { status: 400 });
  }

  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "AI repair request is missing audio." }, { status: 400 });
  }

  if (audio.size > MAX_REPAIR_UPLOAD_BYTES) {
    return NextResponse.json({ error: "AI repair audio upload is too large." }, { status: 413 });
  }

  const songTitle = getString(formData.get("songTitle"));
  const artist = getString(formData.get("artist"));
  const targetSeconds = getNumber(formData.get("targetSeconds"));
  const metadata = getString(formData.get("metadata"));
  const prompt = buildRepairPrompt({ songTitle, artist, targetSeconds });
  const providerFormData = new FormData();

  providerFormData.set("audio", audio, audio.name || `${songId}-short.wav`);
  providerFormData.set("prompt", prompt);
  providerFormData.set("songId", songId);
  providerFormData.set("targetSeconds", targetSeconds ? String(targetSeconds) : "");
  providerFormData.set("metadata", metadata);

  const headers: HeadersInit = {};

  if (REPAIR_TOKEN) {
    headers.Authorization = `Bearer ${REPAIR_TOKEN}`;
  }

  let providerResponse: Response;

  try {
    providerResponse = await fetch(REPAIR_ENDPOINT, {
      method: "POST",
      headers,
      cache: "no-store",
      body: providerFormData,
    });
  } catch (error) {
    console.error("Failed to call AI audio repair provider", error);

    return NextResponse.json(
      { error: "Could not reach AI audio repair provider." },
      { status: 502 },
    );
  }

  if (!providerResponse.ok) {
    return NextResponse.json(
      { error: await readProviderError(providerResponse) },
      { status: providerResponse.status || 502 },
    );
  }

  const contentType = providerResponse.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await providerResponse.json().catch(() => null);
    const audioUrl = getString(data?.audioUrl || data?.url || data?.outputUrl);

    if (audioUrl) {
      return responseFromAudioUrl(audioUrl);
    }

    const audioBase64 = getString(data?.audioBase64 || data?.audio);

    if (audioBase64) {
      const buffer = Buffer.from(audioBase64, "base64");
      const outputContentType = getString(data?.contentType) || "audio/wav";

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": outputContentType,
          "Cache-Control": "no-store",
          "X-Filmwave-Audio-Repair": "true",
        },
      });
    }

    return NextResponse.json(
      { error: "AI repair provider did not return repaired audio." },
      { status: 502 },
    );
  }

  const repairedAudio = await providerResponse.arrayBuffer();

  return new Response(repairedAudio, {
    status: 200,
    headers: {
      "Content-Type": contentType || "audio/wav",
      "Cache-Control": "no-store",
      "X-Filmwave-Audio-Repair": "true",
    },
  });
}
