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
  intro_text: string | null;
  bio: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  created_at: string;
};

type ArtistApplicationSamplePayload = {
  file_name: string;
  audio_url: string;
  size_bytes: number | null;
};

const INTRO_CHARACTER_LIMIT = 114;
const INTRO_WORD_LIMIT = 20;
const DESCRIPTION_CHARACTER_LIMIT = 383;
const DESCRIPTION_WORD_LIMIT = 70;
const MAX_SAMPLE_FILES = 4;

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

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function cleanRequiredProfileText(
  value: unknown,
  fieldLabel: string,
  characterLimit: number,
  wordLimit: number,
) {
  if (typeof value !== "string" || !value.trim()) {
    return { value: null, error: `${fieldLabel} is required` };
  }

  const cleaned = value.trim();
  if (cleaned.length > characterLimit) {
    return {
      value: null,
      error: `${fieldLabel} must be ${characterLimit} characters or fewer`,
    };
  }

  if (countWords(cleaned) > wordLimit) {
    return {
      value: null,
      error: `${fieldLabel} must be ${wordLimit} words or fewer`,
    };
  }

  return { value: cleaned, error: null };
}

function getUserKey(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "");
}

function getImagePublicBaseUrl() {
  const value =
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL;
  return value?.replace(/\/$/, "") ?? null;
}

function getAudioPublicBaseUrl() {
  return process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "") ?? null;
}

function cleanApplicationImageUrl(
  value: unknown,
  userId: string,
  fieldLabel: string,
) {
  if (typeof value !== "string" || !value.trim()) {
    return { value: null, error: `${fieldLabel} is required` };
  }

  const publicBaseUrl = getImagePublicBaseUrl();
  if (!publicBaseUrl) {
    return { value: null, error: "Artist application image storage is unavailable" };
  }

  const prefix = `${publicBaseUrl}/images/artist-applications/${getUserKey(userId)}/`;
  const cleaned = value.trim();
  if (!cleaned.startsWith(prefix)) {
    return { value: null, error: `Invalid ${fieldLabel.toLowerCase()} upload` };
  }

  return { value: cleaned, error: null };
}

function cleanApplicationSamples(value: unknown, userId: string) {
  if (!Array.isArray(value)) {
    return { value: [] as ArtistApplicationSamplePayload[], error: null };
  }

  if (value.length > MAX_SAMPLE_FILES) {
    return {
      value: [] as ArtistApplicationSamplePayload[],
      error: `Upload no more than ${MAX_SAMPLE_FILES} sample songs`,
    };
  }

  const publicBaseUrl = getAudioPublicBaseUrl();
  if (value.length > 0 && !publicBaseUrl) {
    return {
      value: [] as ArtistApplicationSamplePayload[],
      error: "Artist application audio storage is unavailable",
    };
  }

  const prefix = `${publicBaseUrl ?? ""}/artist-applications/${getUserKey(userId)}/samples/`;
  const samples: ArtistApplicationSamplePayload[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return { value: [], error: "Invalid sample song upload" };
    }

    const sample = entry as Record<string, unknown>;
    const fileName = cleanOptionalString(sample.file_name, 255);
    const audioUrl =
      typeof sample.audio_url === "string" ? sample.audio_url.trim() : "";
    const sizeBytes = Number(sample.size_bytes);

    if (!fileName || !audioUrl.startsWith(prefix)) {
      return { value: [], error: "Invalid sample song upload" };
    }

    samples.push({
      file_name: fileName,
      audio_url: audioUrl,
      size_bytes:
        Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : null,
    });
  }

  return { value: samples, error: null };
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
      "id, name, slug, status, location, website_url, instagram_url, spotify_url, intro_text, bio, profile_image_url, hero_image_url, created_at",
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
  const introText = cleanRequiredProfileText(
    payload.intro_text,
    "Intro text",
    INTRO_CHARACTER_LIMIT,
    INTRO_WORD_LIMIT,
  );
  const description = cleanRequiredProfileText(
    payload.bio,
    "Description",
    DESCRIPTION_CHARACTER_LIMIT,
    DESCRIPTION_WORD_LIMIT,
  );
  const website = cleanOptionalHttpUrl(payload.website_url);
  const instagram = cleanOptionalHttpUrl(payload.instagram_url);
  const spotify = cleanOptionalHttpUrl(payload.spotify_url);
  const profileImage = cleanApplicationImageUrl(
    payload.profile_image_url,
    user.id,
    "Profile image",
  );
  const heroImage = cleanApplicationImageUrl(
    payload.hero_image_url,
    user.id,
    "Feature image",
  );
  const samples = cleanApplicationSamples(payload.samples, user.id);

  if (!name) {
    return NextResponse.json({ error: "Artist name is required" }, { status: 400 });
  }

  const validations = [
    introText,
    description,
    profileImage,
    heroImage,
    samples,
  ];
  for (const result of validations) {
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
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

  if (
    !website.value &&
    !instagram.value &&
    !spotify.value &&
    samples.value.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "Add a website, Spotify, or Instagram link, or upload at least one sample song",
      },
      { status: 400 },
    );
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
        intro_text: introText.value,
        bio: description.value,
        website_url: website.value,
        instagram_url: instagram.value,
        spotify_url: spotify.value,
        profile_image_url: profileImage.value,
        hero_image_url: heroImage.value,
        status: "pending",
        created_by_clerk_user_id: user.id,
      })
      .select(
        "id, name, slug, status, location, website_url, instagram_url, spotify_url, intro_text, bio, profile_image_url, hero_image_url, created_at",
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

    if (samples.value.length > 0) {
      const { error: samplesError } = await supabaseServer
        .from("artist_application_samples")
        .insert(
          samples.value.map((sample, position) => ({
            artist_id: artist.id,
            file_name: sample.file_name,
            audio_url: sample.audio_url,
            position,
            size_bytes: sample.size_bytes,
          })),
        );

      if (samplesError) {
        await supabaseServer.from("artists").delete().eq("id", artist.id);
        throw samplesError;
      }
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
