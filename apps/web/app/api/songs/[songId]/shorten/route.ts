import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ songId: string }> | { songId: string };
};

const SUPPORTED_TARGETS = new Set([15, 30, 60]);

function getTargetSeconds(value: unknown) {
  const targetSeconds = Number(value);

  if (!Number.isFinite(targetSeconds)) return null;

  const rounded = Math.round(targetSeconds);

  if (!SUPPORTED_TARGETS.has(rounded)) return null;

  return rounded;
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

  return NextResponse.json(
    {
      error: "Shorten Track is temporarily disabled while the server-side arranger is being isolated.",
    },
    { status: 503 },
  );
}
