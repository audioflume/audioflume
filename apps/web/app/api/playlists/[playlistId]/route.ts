import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizePlaylist } from "@/lib/playlists";

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

type PlaylistUpdate = {
  name?: string;
  cover_image_url?: string | null;
};

function getErrorResponse(error: unknown) {
  if (error instanceof Error) {
    return { error: error.message };
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
    };
  }

  return { error: "Failed to update playlist" };
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    const { data: existingPlaylist, error: existingPlaylistError } =
      await supabaseServer
        .from("playlists")
        .select("id, clerk_user_id, name, cover_image_url, position")
        .eq("id", playlistId)
        .eq("clerk_user_id", userId)
        .maybeSingle();

    if (existingPlaylistError) {
      throw existingPlaylistError;
    }

    if (!existingPlaylist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 },
      );
    }

    const updates: PlaylistUpdate = {};

    if (cleanName !== existingPlaylist.name) {
      updates.name = cleanName;
    }

    if (Object.prototype.hasOwnProperty.call(body, "cover_image_url")) {
      const nextCover =
        typeof body.cover_image_url === "string" && body.cover_image_url.trim()
          ? body.cover_image_url
          : null;

      if (nextCover !== existingPlaylist.cover_image_url) {
        updates.cover_image_url = nextCover;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(normalizePlaylist(existingPlaylist));
    }

    const { data, error } = await supabaseServer
      .from("playlists")
      .update(updates)
      .eq("id", playlistId)
      .eq("clerk_user_id", userId)
      .select("id, clerk_user_id, name, cover_image_url, position")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(normalizePlaylist(data));
  } catch (err) {
    console.error("Playlist update failed:", err);

    return NextResponse.json(getErrorResponse(err), { status: 500 });
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
