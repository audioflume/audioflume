import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Playlist } from "@/lib/types";

function normalizePlaylist(value: unknown): Playlist {
  const playlist = value as Partial<Playlist>;

  return {
    id: Number(playlist.id),
    clerk_user_id: String(playlist.clerk_user_id || ""),
    name: String(playlist.name || "").trim(),
    cover_image_url:
      typeof playlist.cover_image_url === "string" &&
      playlist.cover_image_url.trim()
        ? playlist.cover_image_url
        : null,
    position:
      typeof playlist.position === "number" &&
      Number.isFinite(playlist.position)
        ? playlist.position
        : 0,
  };
}

function getErrorResponse(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}) {
  return {
    error: error.message || "Request failed",
    details: error.details,
    hint: error.hint,
    code: error.code,
  };
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("playlists")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("position", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(normalizePlaylist));
  } catch (err) {
    console.error("Supabase playlists fetch error:", err);

    return NextResponse.json(
      getErrorResponse(
        err instanceof Error
          ? { message: err.message }
          : { message: "Failed to load playlists" },
      ),
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Missing playlist name" },
        { status: 400 },
      );
    }

    const cleanName = body.name.trim();

    if (!cleanName) {
      return NextResponse.json(
        { error: "Missing playlist name" },
        { status: 400 },
      );
    }

    const { data: existingPlaylists, error: positionError } =
      await supabaseServer
        .from("playlists")
        .select("position")
        .eq("clerk_user_id", userId)
        .order("position", { ascending: false })
        .limit(1);

    if (positionError) {
      throw positionError;
    }

    const nextPosition =
      existingPlaylists?.[0]?.position != null
        ? existingPlaylists[0].position + 1
        : 0;

    const { data, error } = await supabaseServer
      .from("playlists")
      .insert({
        clerk_user_id: userId,
        name: cleanName,
        cover_image_url: body.cover_image_url || null,
        position:
          typeof body.position === "number" && Number.isFinite(body.position)
            ? body.position
            : nextPosition,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(normalizePlaylist(data));
  } catch (err) {
    console.error("Supabase playlist create error:", err);

    return NextResponse.json(
      getErrorResponse(
        err instanceof Error
          ? { message: err.message }
          : { message: "Failed to create playlist" },
      ),
      { status: 500 },
    );
  }
}
