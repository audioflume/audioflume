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

const ARTIST_INTRO_TEXT_MAX_LENGTH = 114;

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

function normalizeArtistSlug(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  if (
    typeof payload.intro_text === "string" &&
    payload.intro_text.length > ARTIST_INTRO_TEXT_MAX_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `Intro text must be ${ARTIST_INTRO_TEXT_MAX_LENGTH} characters or fewer`,
      },
      { status: 400 },
    );
  }

  const name = cleanOptionalString(payload.name, 160);
  const slug = normalizeArtistSlug(payload.slug);
  const designation = cleanOptionalString(payload.designation, 160);
  const introText = cleanOptionalString(
    payload.intro_text,
    ARTIST_INTRO_TEXT_MAX_LENGTH,
  );
  const bio = cleanOptionalString(payload.bio, 1200);
  const location = cleanOptionalString(payload.location, 160);
  const website = cleanOptionalHttpUrl(payload.website_url);
  const instagram = cleanOptionalHttpUrl(payload.instagram_url);
  const spotify = cleanOptionalHttpUrl(payload.spotify_url);
  const youtube = cleanOptionalHttpUrl(payload.youtube_url);

  if (!name) {
    return NextResponse.json({ error: "Artist name is required" }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ error: "Artist URL is required" }, { status: 400 });
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

    const { data: existingArtist, error: existingArtistError } = await supabaseServer
      .from("artists")
      .select("id, slug")
      .eq("id", id)
      .maybeSingle();

    if (existingArtistError) throw existingArtistError;
    if (!existingArtist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const slugChanged = existingArtist.slug !== slug;

    if (slugChanged) {
      const { data: currentSlugOwner, error: currentSlugOwnerError } = await supabaseServer
        .from("artists")
        .select("id")
        .eq("slug", slug)
        .neq("id", id)
        .maybeSingle();

      if (currentSlugOwnerError) throw currentSlugOwnerError;
      if (currentSlugOwner) {
        return NextResponse.json(
          { error: "That artist URL is already in use" },
          { status: 409 },
        );
      }

      const { data: historicalSlugOwner, error: historicalSlugOwnerError } =
        await supabaseServer
          .from("artist_slug_history")
          .select("artist_id")
          .eq("slug", slug)
          .maybeSingle();

      if (historicalSlugOwnerError) throw historicalSlugOwnerError;
      if (historicalSlugOwner && historicalSlugOwner.artist_id !== id) {
        return NextResponse.json(
          { error: "That artist URL is already in use" },
          { status: 409 },
        );
      }

      const { data: existingHistory, error: existingHistoryError } = await supabaseServer
        .from("artist_slug_history")
        .select("artist_id")
        .eq("slug", existingArtist.slug)
        .maybeSingle();

      if (existingHistoryError) throw existingHistoryError;

      if (existingHistory && existingHistory.artist_id !== id) {
        return NextResponse.json(
          { error: "The current artist URL could not be preserved" },
          { status: 409 },
        );
      }

      if (!existingHistory) {
        const { error: historyInsertError } = await supabaseServer
          .from("artist_slug_history")
          .insert({
            artist_id: id,
            slug: existingArtist.slug,
          });

        if (historyInsertError) throw historyInsertError;
      }
    }

    const { data: artist, error } = await supabaseServer
      .from("artists")
      .update({
        name,
        slug,
        designation,
        intro_text: introText,
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
        "id, name, slug, status, designation, intro_text, bio, location, website_url, instagram_url, spotify_url, youtube_url, profile_image_url, hero_image_url, updated_at",
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
