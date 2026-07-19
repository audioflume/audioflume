import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storePlaylistCover } from "@/lib/playlistCoverStorage";
import { supabaseServer } from "@/lib/supabaseServer";

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
    const coverWasIncluded = Object.prototype.hasOwnProperty.call(
      body,
      "cover_image_url",
    );

    if (coverWasIncluded) {
      stage = "store-cover";
      updates.cover_image_url = await storePlaylistCover(
        body.cover_image_url,
        userId,
      );
    }

    stage = "update-playlist";

    const { data, error } = await supabaseServer
      .from("playlists")
      .update(updates)
      .eq("id", playlistId)
      .eq("clerk_user_id", userId)
      .select("id, position")
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

    return NextResponse.json({
      id: data.id,
      position: data.position,
      name: cleanName,
      ...(coverWasIncluded
        ? { cover_image_url: updates.cover_image_url ?? null }
        : {}),
    });
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
