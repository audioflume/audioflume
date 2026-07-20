import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

 type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string };
};

type PlaylistUpdate = {
  name?: string;
  cover_image_url?: string | null;
  is_public?: boolean;
  published_at?: string | null;
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

function parseCoverImageUrl(value: unknown): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const cleanValue = value.trim();
  if (!cleanValue) return null;
  if (cleanValue.startsWith("data:") || cleanValue.startsWith("blob:")) {
    return undefined;
  }

  try {
    const url = new URL(cleanValue);
    return url.protocol === "https:" || url.protocol === "http:"
      ? cleanValue
      : undefined;
  } catch {
    return undefined;
  }
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
    const updates: PlaylistUpdate = {};

    const nameWasIncluded = Object.prototype.hasOwnProperty.call(body, "name");
    if (nameWasIncluded) {
      const cleanName = typeof body.name === "string" ? body.name.trim() : "";
      if (!cleanName) {
        return NextResponse.json(
          { error: "Missing playlist name" },
          { status: 400 },
        );
      }
      updates.name = cleanName;
    }

    const coverWasIncluded = Object.prototype.hasOwnProperty.call(
      body,
      "cover_image_url",
    );
    if (coverWasIncluded) {
      const coverImageUrl = parseCoverImageUrl(body.cover_image_url);
      if (coverImageUrl === undefined) {
        return NextResponse.json(
          {
            error: "Playlist cover must be an uploaded image URL",
            stage,
          },
          { status: 400 },
        );
      }
      updates.cover_image_url = coverImageUrl;
    }

    const publicWasIncluded = Object.prototype.hasOwnProperty.call(
      body,
      "is_public",
    );
    if (publicWasIncluded) {
      if (typeof body.is_public !== "boolean") {
        return NextResponse.json(
          { error: "Invalid playlist visibility" },
          { status: 400 },
        );
      }
      updates.is_public = body.is_public;
      updates.published_at = body.is_public ? new Date().toISOString() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No playlist changes supplied" },
        { status: 400 },
      );
    }

    stage = "update-playlist";

    const { data, error } = await supabaseServer
      .from("playlists")
      .update(updates)
      .eq("id", playlistId)
      .eq("clerk_user_id", userId)
      .select(
        "id, clerk_user_id, name, cover_image_url, position, is_public, published_at",
      )
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

    return NextResponse.json(data);
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
