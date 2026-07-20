import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizePlaylist, getPlaylistErrorResponse } from "@/lib/playlists";
import { toSmartTitleCase } from "@/lib/smartTitleCase";

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

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [playlistsResult, coversResult] = await Promise.all([
      supabaseServer
        .from("playlists")
        .select("id, clerk_user_id, name, position, is_public, published_at")
        .eq("clerk_user_id", userId)
        .order("position", { ascending: true }),
      supabaseServer
        .from("playlists")
        .select("id, cover_image_url")
        .eq("clerk_user_id", userId)
        .not("cover_image_url", "like", "data:%")
        .not("cover_image_url", "like", "blob:%"),
    ]);

    if (playlistsResult.error) {
      throw playlistsResult.error;
    }

    if (coversResult.error) {
      throw coversResult.error;
    }

    const coversByPlaylistId = new Map(
      (coversResult.data ?? []).map((playlist) => [
        Number(playlist.id),
        playlist.cover_image_url,
      ]),
    );

    return NextResponse.json(
      (playlistsResult.data ?? []).map((playlist) =>
        normalizePlaylist({
          ...playlist,
          cover_image_url:
            coversByPlaylistId.get(Number(playlist.id)) ?? null,
        }),
      ),
    );
  } catch (err) {
    console.error("Supabase playlists fetch error:", err);

    return NextResponse.json(
      getPlaylistErrorResponse(
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

    const cleanName = toSmartTitleCase(body.name);

    if (!cleanName) {
      return NextResponse.json(
        { error: "Missing playlist name" },
        { status: 400 },
      );
    }

    const coverImageUrl = parseCoverImageUrl(body.cover_image_url);

    if (coverImageUrl === undefined) {
      return NextResponse.json(
        { error: "Playlist cover must be an uploaded image URL" },
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
        cover_image_url: coverImageUrl,
        position:
          typeof body.position === "number" && Number.isFinite(body.position)
            ? body.position
            : nextPosition,
        is_public: false,
        published_at: null,
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
      getPlaylistErrorResponse(
        err instanceof Error
          ? { message: err.message }
          : { message: "Failed to create playlist" },
      ),
      { status: 500 },
    );
  }
}
