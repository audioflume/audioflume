import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { cleanOptionalString, ensureUserProfile } from "@/lib/account";
import { supabaseServer } from "@/lib/supabaseServer";

type ArtistApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

type ArtistApplication = {
  id: string;
  name: string;
  slug: string;
  status: ArtistApplicationStatus;
  location: string | null;
  website_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  bio: string | null;
  created_at: string;
};

function slugifyArtistName(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "artist";
}

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

async function getOwnedArtistApplications(clerkUserId: string) {
  const { data: memberships, error: membershipsError } = await supabaseServer
    .from("artist_memberships")
    .select("artist_id")
    .eq("clerk_user_id", clerkUserId)
    .eq("role", "owner");

  if (membershipsError) throw membershipsError;

  const artistIds = (memberships ?? [])
    .map((membership) => membership.artist_id)
    .filter((artistId): artistId is string => typeof artistId === "string");

  if (artistIds.length === 0) return [];

  const { data: artists, error: artistsError } = await supabaseServer
    .from("artists")
    .select(
      "id, name, slug, status, location, website_url, instagram_url, spotify_url, bio, created_at",
    )
    .in("id", artistIds)
    .order("created_at", { ascending: false });

  if (artistsError) throw artistsError;

  return (artists ?? []) as ArtistApplication[];
}

async function createUniqueArtistSlug(name: string) {
  const baseSlug = slugifyArtistName(name);

  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const { data, error } = await supabaseServer
      .from("artists")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applications = await getOwnedArtistApplications(user.id);
    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Failed to load artist applications:", error);
    return NextResponse.json(
      { error: "Failed to load artist applications" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = cleanOptionalString(payload.name, 160);
  const location = cleanOptionalString(payload.location, 160);
  const bio = cleanOptionalString(payload.bio, 1200);
  const website = cleanOptionalHttpUrl(payload.website_url);
  const instagram = cleanOptionalHttpUrl(payload.instagram_url);
  const spotify = cleanOptionalHttpUrl(payload.spotify_url);

  if (!name) {
    return NextResponse.json({ error: "Artist name is required" }, { status: 400 });
  }

  const urls = [
    ["Website", website],
    ["Instagram", instagram],
    ["Spotify", spotify],
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
    await ensureUserProfile(user.id, user);

    const existingApplications = await getOwnedArtistApplications(user.id);
    const pendingApplication = existingApplications.find(
      (application) => application.status === "pending",
    );

    if (pendingApplication) {
      return NextResponse.json(
        {
          error: "You already have an artist application pending review",
          application: pendingApplication,
        },
        { status: 409 },
      );
    }

    const slug = await createUniqueArtistSlug(name);
    const { data: artist, error: artistError } = await supabaseServer
      .from("artists")
      .insert({
        name,
        slug,
        bio,
        location,
        website_url: website.value,
        instagram_url: instagram.value,
        spotify_url: spotify.value,
        status: "pending",
        created_by_clerk_user_id: user.id,
      })
      .select(
        "id, name, slug, status, location, website_url, instagram_url, spotify_url, bio, created_at",
      )
      .single();

    if (artistError) throw artistError;

    const { error: membershipError } = await supabaseServer
      .from("artist_memberships")
      .insert({
        artist_id: artist.id,
        clerk_user_id: user.id,
        role: "owner",
      });

    if (membershipError) {
      await supabaseServer.from("artists").delete().eq("id", artist.id);
      throw membershipError;
    }

    return NextResponse.json({ application: artist }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit artist application:", error);
    return NextResponse.json(
      { error: "Failed to submit artist application" },
      { status: 500 },
    );
  }
}
