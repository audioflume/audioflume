import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import { deleteFilesFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

type SupabaseSongRow = {
  id: string | number;
  audio_url: string | null;
  cover_url: string | null;
  stems: string | null;
};

function getR2KeyFromUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function getStemUrls(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((url) => String(url).trim()).filter(Boolean);
  }

  if (typeof value !== "string") return [];

  return value
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean);
}

function getSongR2Keys(song: SupabaseSongRow) {
  const audioKey = getR2KeyFromUrl(song.audio_url);
  const coverKey = getR2KeyFromUrl(song.cover_url);
  const stemKeys = getStemUrls(song.stems)
    .map(getR2KeyFromUrl)
    .filter((key): key is string => Boolean(key));

  return [audioKey, coverKey, ...stemKeys].filter((key): key is string =>
    Boolean(key),
  );
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const songIds = Array.isArray(body.songIds)
      ? body.songIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    if (songIds.length === 0) {
      return NextResponse.json({ error: "No songs selected" }, { status: 400 });
    }

    const { data: songs, error: songsFetchError } = await supabaseServer
      .from("songs")
      .select("id,audio_url,cover_url,stems")
      .in("id", songIds);

    if (songsFetchError) {
      throw songsFetchError;
    }

    const rows = (songs ?? []) as SupabaseSongRow[];

    const keysToDelete = rows.flatMap(getSongR2Keys);
    const uniqueKeysToDelete = Array.from(new Set(keysToDelete));

    if (uniqueKeysToDelete.length > 0) {
      await deleteFilesFromR2(uniqueKeysToDelete);
    }

    const { error: playlistSongsError } = await supabaseServer
      .from("playlist_songs")
      .delete()
      .in("song_id", songIds);

    if (playlistSongsError) {
      throw playlistSongsError;
    }

    const { error: favoritesError } = await supabaseServer
      .from("favorites")
      .delete()
      .in("song_id", songIds);

    if (favoritesError) {
      throw favoritesError;
    }

    const { error: projectAssetsError } = await supabaseServer
      .from("project_assets")
      .delete()
      .eq("asset_type", "song")
      .in("asset_id", songIds);

    if (projectAssetsError) {
      throw projectAssetsError;
    }

    const { error: songsDeleteError } = await supabaseServer
      .from("songs")
      .delete()
      .in("id", songIds);

    if (songsDeleteError) {
      throw songsDeleteError;
    }

    return NextResponse.json({
      deleted: true,
      deletedSongIds: songIds,
      deletedCount: songIds.length,
      deletedR2Keys: uniqueKeysToDelete,
    });
  } catch (err) {
    console.error("Batch song delete failed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete selected songs",
      },
      { status: 500 },
    );
  }
}
