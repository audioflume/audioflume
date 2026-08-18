import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import {
  getPublicArtistPageData,
  type PublicArtistPageData,
  type PublicArtistProfile,
} from "@/lib/publicArtist";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const ARTIST_SELECT =
  "id, name, slug, bio, location, website_url, instagram_url, spotify_url, youtube_url, profile_image_url, hero_image_url";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:view");

    const { data: artist, error: artistError } = await supabaseServer
      .from("artists")
      .select(ARTIST_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (artistError) throw artistError;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const publicLookup = await getPublicArtistPageData(String(artist.slug));
    if (publicLookup.data) {
      return NextResponse.json({ data: publicLookup.data });
    }

    const previewData: PublicArtistPageData = {
      artist: artist as PublicArtistProfile,
      songs: [],
      releases: [],
      playlists: [],
    };

    return NextResponse.json({ data: previewData });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load artist page preview:", error);
    return NextResponse.json(
      { error: "Failed to load artist page preview" },
      { status: 500 },
    );
  }
}
