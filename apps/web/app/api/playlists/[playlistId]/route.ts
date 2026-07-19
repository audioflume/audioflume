import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizePlaylist } from "@/lib/playlists";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

type PlaylistUpdate = {
  name: string;
  cover_image_url?: string | null;
};

function getErrorResponse(error: unknown, stage: string) {
  if (error instanceof Error) {
    return { error: error.message, stage };
  }

  if (error && typeof error === "object") {
    const value = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    return {
      error:
        typeof value.message === "string"
          ? value.message
          : "Failed to update playlist",
      details: typeof value.details === "string" ? value.details : undefined,
      hint: typeof value.hint === "string" ? value.hint : undefined,
      code: typeof value.code === "string" ? value.code : undefined,
      stage,
    };
  }

  return { error: "Failed to update playlist", stage };
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let stage = "parse-request";

  try {
    const { playlistId } = await context.params;
    const body = await req.json();
    const cleanName = typeof body.name === "string" ? body.name.trim() : "";

    if (!cleanName) {
      return NextResponse.json(
        { error: "Missing playlist name" },
        { status: 400 },
      );
    }

    const updates: PlaylistUpdate = {
      name: cleanName,
    };

    if (Object.prototype.hasOwnProperty.call(body, "cover_image_url")) {
      updates.cover_image_url =
        typeof body.cover_image_url === "string" && body.cover_image_url.trim()
          ? body.cover_image_url
          : null;
    }

    stage = "update-playlist";

    const { data, error } = await supabaseServer
      .from("playlists")
      .update(updates)
      .eq("id", playlistId)
      .eq("clerk_user_id", userId)
      .select("id, clerk_user_id, name, cover_image_url, position")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Playlist not found", stage },
        { status: 404 },
      );
    }

    return NextResponse.json(normalizePlaylist(data));
  } catch (err) {
    console.error(`Playlist update failed during ${stage}:`, err);

    return NextResponse.json(getErrorResponse(err, stage), { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistId } = await context.params;

    const { error } = await supabaseServer
      .from("playlists")
      .delete()
      .eq("id", playlistId)
      .eq("clerk_user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      id: Number(playlistId),
    });
  } catch (err) {
    console.error("Playlist delete failed:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete playlist",
      },
      { status: 500 },
    );
  }
}
