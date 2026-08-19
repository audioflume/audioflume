import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";

export const runtime = "nodejs";

const LOCAL_BEAT_ANALYZER_URL = "http://127.0.0.1:8001";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "catalog:upload");

    const incomingFormData = await request.formData();
    const file = incomingFormData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing audio file." },
        { status: 400 },
      );
    }

    const outgoingFormData = new FormData();
    outgoingFormData.append("file", file, file.name);

    try {
      const response = await fetch(`${LOCAL_BEAT_ANALYZER_URL}/analyze-beats`, {
        method: "POST",
        body: outgoingFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          {
            enabled: false,
            error: data?.error || "Beat analyzer failed.",
          },
          { status: response.status },
        );
      }

      return NextResponse.json({
        enabled: true,
        bpm: data.bpm ?? null,
        confidence: data.confidence ?? null,
        beats: Array.isArray(data.beats) ? data.beats : [],
        downbeats: Array.isArray(data.downbeats) ? data.downbeats : [],
        source: data.source || "beat_this",
      });
    } catch (error) {
      return NextResponse.json(
        {
          enabled: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to reach local Beat analyzer.",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist beat analysis failed:", error);
    return NextResponse.json(
      { error: "Failed to analyze beat" },
      { status: 500 },
    );
  }
}
