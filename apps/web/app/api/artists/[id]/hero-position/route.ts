import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function cleanPosition(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(Math.max(0, Math.min(100, number)));
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:view");

    const { data: artist, error } = await supabaseServer
      .from("artists")
      .select("hero_image_position_x, hero_image_position_y")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({
      position: {
        x: Number(artist.hero_image_position_x ?? 50),
        y: Number(artist.hero_image_position_y ?? 50),
      },
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to load artist hero position:", error);
    return NextResponse.json(
      { error: "Failed to load hero image position" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const x = cleanPosition(payload.x);
  const y = cleanPosition(payload.y);

  if (x == null || y == null) {
    return NextResponse.json(
      { error: "Hero image position must be between 0 and 100" },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:edit_profile");

    const { data: artist, error } = await supabaseServer
      .from("artists")
      .update({
        hero_image_position_x: x,
        hero_image_position_y: y,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("hero_image_position_x, hero_image_position_y")
      .maybeSingle();

    if (error) throw error;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({
      position: {
        x: Number(artist.hero_image_position_x),
        y: Number(artist.hero_image_position_y),
      },
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to update artist hero position:", error);
    return NextResponse.json(
      { error: "Failed to update hero image position" },
      { status: 500 },
    );
  }
}
