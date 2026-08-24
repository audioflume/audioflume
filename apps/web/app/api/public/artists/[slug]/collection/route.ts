import { NextResponse } from "next/server";

import { getPublicArtistPageData } from "@/lib/publicArtist";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }> | { slug: string };
};

type CollectionKind = "release" | "playlist";

type TrackRow = {
  song_id: unknown;
};

function parseCollectionKind(value: string | null): CollectionKind | null {
  if (value === "release" || value === "playlist") return value;
  return null;
}

function parseCollectionIndex(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const index = Number(value);
  return Number.isSafeInteger(index) ? index : null;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const url = new URL(request.url);
    const kind = parseCollectionKind(url.searchParams.get("kind"));
    const index = parseCollectionIndex(url.searchParams.get("index"));

    if (!kind || index === null) {
      return NextResponse.json(
        { error: "Invalid collection request" },
        { status: 400 },
      );
    }

    const lookup = await getPublicArtistPageData(slug);
    if (!lookup.data) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const collection =
      kind === "release"
        ? lookup.data.releases[index]
        : lookup.data.playlists[index];

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 },
      );
    }

    let trackRows: TrackRow[] = [];

    if (kind === "release") {
      const { data, error } = await supabaseServer
        .from("artist_release_songs")
        .select("song_id, disc_number, track_number")
        .eq("release_id", collection.id)
        .order("disc_number", { ascending: true })
        .order("track_number", { ascending: true });

      if (error) throw error;
      trackRows = data ?? [];
    } else {
      const { data, error } = await supabaseServer
        .from("artist_playlist_songs")
        .select("song_id, position")
        .eq("playlist_id", collection.id)
        .order("position", { ascending: true });

      if (error) throw error;
      trackRows = data ?? [];
    }

    const songById = new Map(
      lookup.data.songs.map((song) => [song.id, song] as const),
    );
    const songs = trackRows.flatMap((track) => {
      if (typeof track.song_id !== "string") return [];
      const song = songById.get(track.song_id);
      return song ? [song] : [];
    });

    return NextResponse.json({
      collection,
      songs,
      all_songs: lookup.data.songs,
    });
  } catch (error) {
    console.error("Failed to load public artist collection:", error);
    return NextResponse.json(
      { error: "Failed to load collection" },
      { status: 500 },
    );
  }
}
