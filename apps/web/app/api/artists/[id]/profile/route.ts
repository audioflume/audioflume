import { NextResponse } from "next/server";

import { cleanOptionalString } from "@/lib/account";
import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function cleanOptionalHttpUrl(value: unknown) {
  const cleaned = cleanOptionalString(value, 500);
  if (!cleaned) return { value: null, error: null };

  try {
    const url = new URL(cleaned);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { value: null, error: "Only http and https URLs are supported" };
    }

    return { value: url.toString(), error: null };
  } catch {
    return { value: null, error: "Enter a valid URL including https://" };
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = cleanOptionalString(payload.name, 160);
  const bio = cleanOptionalString(payload.bio, 1200);
  const location = cleanOptionalString(payload.location, 160);
  const website = cleanOptionalHttpUrl(payload.website_url);
  const instagram = cleanOptionalHttpUrl(payload.instagram_url);
  const spotify = cleanOptionalHttpUrl(payload.spotify_url);
  const youtube = cleanOptionalHttpUrl(payload.youtube_url);

  if (!name) {
    return NextResponse.json({ error: "Artist name is required" }, { status: 400 });
  }

  const urls = [
    ["Website", website],
    ["Instagram", instagram],
    ["Spotify", spotify],
    ["YouTube", youtube],
  ] as const;

  for (const [label, result] of urls) {
    if (result.error) {
      return NextResponse.json(
        { error: `${label}: ${result.error}` },
        { status: 400 },
      );
    }
  }

  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:edit_profile");

    const { data: artist, error } = await supabaseServer
      .from("artists")
      .update({
        name,
        bio,
        location,
        website_url: website.value,
        instagram_url: instagram.value,
        spotify_url: spotify.value,
        youtube_url: youtube.value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, name, slug, status, bio, location, website_url, instagram_url, spotify_url, youtube_url, profile_image_url, hero_image_url, updated_at",
      )
      .maybeSingle();

    if (error) throw error;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({ artist });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to update artist profile:", error);
    return NextResponse.json(
      { error: "Failed to update artist profile" },
      { status: 500 },
    );
  }
}
