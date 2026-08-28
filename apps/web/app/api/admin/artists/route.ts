import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import {
  ArtistClaimError,
  createArtistClaimInvitation,
  expireArtistClaimInvitations,
  isValidArtistClaimEmail,
  normalizeArtistClaimEmail,
} from "@/lib/artistClaims";
import { supabaseServer } from "@/lib/supabaseServer";

type ArtistOwnerProfile = {
  clerk_user_id: string;
  display_name: string | null;
  company_name: string | null;
};

type ArtistOwnerMembership = {
  artist_id: string;
  clerk_user_id: string;
};

type ArtistClaimInvitationRow = {
  id: string;
  artist_id: string;
  email: string;
  status: "pending" | "claimed" | "revoked" | "expired";
  ownership_transfer: boolean;
  expires_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type ArtistApplicationSampleRow = {
  id: string;
  artist_id: string;
  file_name: string;
  audio_url: string;
  position: number;
  size_bytes: number | null;
  created_at: string;
};

function normalizeArtistName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 160);
}

function normalizeArtistSlug(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getArchivedRejectedArtistSlug(slug: string, artistId: string) {
  const suffix = `-rejected-${artistId.replace(/-/g, "").slice(0, 8)}`;
  const base = slug
    .slice(0, Math.max(1, 80 - suffix.length))
    .replace(/-+$/g, "");

  return `${base || "artist"}${suffix}`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await expireArtistClaimInvitations();

    const { data: artists, error: artistsError } = await supabaseServer
      .from("artists")
      .select(
        "id, name, slug, intro_text, bio, location, website_url, instagram_url, spotify_url, profile_image_url, hero_image_url, status, created_by_clerk_user_id, approved_at, approved_by_clerk_user_id, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (artistsError) throw artistsError;

    const artistIds = (artists ?? [])
      .map((artist) => artist.id)
      .filter((artistId): artistId is string => typeof artistId === "string");

    const ownerMemberships: ArtistOwnerMembership[] = [];
    const claimInvitations: ArtistClaimInvitationRow[] = [];
    const applicationSamples: ArtistApplicationSampleRow[] = [];

    if (artistIds.length > 0) {
      const [ownersResult, claimsResult, samplesResult] = await Promise.all([
        supabaseServer
          .from("artist_memberships")
          .select("artist_id, clerk_user_id")
          .eq("role", "owner")
          .in("artist_id", artistIds),
        supabaseServer
          .from("artist_claim_invitations")
          .select(
            "id, artist_id, email, status, ownership_transfer, expires_at, claimed_at, revoked_at, created_at",
          )
          .in("artist_id", artistIds)
          .order("created_at", { ascending: false }),
        supabaseServer
          .from("artist_application_samples")
          .select(
            "id, artist_id, file_name, audio_url, position, size_bytes, created_at",
          )
          .in("artist_id", artistIds)
          .order("position", { ascending: true }),
      ]);

      if (ownersResult.error) throw ownersResult.error;
      if (claimsResult.error) throw claimsResult.error;
      if (samplesResult.error) throw samplesResult.error;

      ownerMemberships.push(
        ...((ownersResult.data ?? []) as ArtistOwnerMembership[]),
      );
      claimInvitations.push(
        ...((claimsResult.data ?? []) as ArtistClaimInvitationRow[]),
      );
      applicationSamples.push(
        ...((samplesResult.data ?? []) as ArtistApplicationSampleRow[]),
      );
    }

    const ownerUserIds = Array.from(
      new Set(ownerMemberships.map((membership) => membership.clerk_user_id)),
    );

    const ownerProfiles = new Map<string, ArtistOwnerProfile>();
    if (ownerUserIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("user_profiles")
        .select("clerk_user_id, display_name, company_name")
        .in("clerk_user_id", ownerUserIds);

      if (error) throw error;

      for (const profile of (data ?? []) as ArtistOwnerProfile[]) {
        ownerProfiles.set(profile.clerk_user_id, profile);
      }
    }

    const ownerByArtist = new Map<string, ArtistOwnerMembership>();
    for (const membership of ownerMemberships) {
      if (!ownerByArtist.has(membership.artist_id)) {
        ownerByArtist.set(membership.artist_id, membership);
      }
    }

    const latestClaimByArtist = new Map<string, ArtistClaimInvitationRow>();
    for (const invitation of claimInvitations) {
      if (!latestClaimByArtist.has(invitation.artist_id)) {
        latestClaimByArtist.set(invitation.artist_id, invitation);
      }
    }

    const samplesByArtist = new Map<string, ArtistApplicationSampleRow[]>();
    for (const sample of applicationSamples) {
      const current = samplesByArtist.get(sample.artist_id) ?? [];
      current.push(sample);
      samplesByArtist.set(sample.artist_id, current);
    }

    return NextResponse.json({
      artists: (artists ?? []).map((artist) => {
        const ownerMembership = ownerByArtist.get(artist.id);
        const ownerProfile = ownerMembership
          ? ownerProfiles.get(ownerMembership.clerk_user_id)
          : null;

        return {
          ...artist,
          owner: ownerMembership
            ? {
                clerk_user_id: ownerMembership.clerk_user_id,
                display_name: ownerProfile?.display_name ?? null,
                company_name: ownerProfile?.company_name ?? null,
              }
            : null,
          claim_invitation: latestClaimByArtist.get(artist.id) ?? null,
          application_samples: samplesByArtist.get(artist.id) ?? [],
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load admin artists:", error);
    return NextResponse.json(
      { error: "Failed to load artists" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const name = normalizeArtistName(body?.name);
  const slug = normalizeArtistSlug(body?.slug || body?.name);
  const email = normalizeArtistClaimEmail(body?.email);

  if (!name) {
    return NextResponse.json({ error: "Artist name is required" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ error: "Artist URL is required" }, { status: 400 });
  }
  if (!email || !isValidArtistClaimEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  let createdArtistId: string | null = null;
  let archivedRejectedArtistId: string | null = null;

  try {
    const { data: existingSlugArtist, error: existingSlugError } =
      await supabaseServer
        .from("artists")
        .select("id, status")
        .eq("slug", slug)
        .maybeSingle();

    if (existingSlugError) throw existingSlugError;

    if (existingSlugArtist) {
      if (existingSlugArtist.status !== "rejected") {
        return NextResponse.json(
          { error: "That artist URL is already in use" },
          { status: 409 },
        );
      }

      const archivedSlug = getArchivedRejectedArtistSlug(
        slug,
        existingSlugArtist.id,
      );
      const { error: archiveError } = await supabaseServer
        .from("artists")
        .update({ slug: archivedSlug })
        .eq("id", existingSlugArtist.id)
        .eq("status", "rejected");

      if (archiveError) throw archiveError;
      archivedRejectedArtistId = existingSlugArtist.id;
    }

    const { data: artist, error: artistError } = await supabaseServer
      .from("artists")
      .insert({
        name,
        slug,
        status: "pending",
        created_by_clerk_user_id: admin.user?.id ?? null,
      })
      .select(
        "id, name, slug, intro_text, bio, location, website_url, instagram_url, spotify_url, profile_image_url, hero_image_url, status, created_by_clerk_user_id, approved_at, approved_by_clerk_user_id, created_at, updated_at",
      )
      .single();

    if (artistError) throw artistError;
    createdArtistId = artist.id;

    const invitation = await createArtistClaimInvitation({
      artistId: artist.id,
      email,
      invitedByClerkUserId: admin.user?.id ?? null,
      origin: new URL(request.url).origin,
    });

    return NextResponse.json(
      {
        artist: {
          ...artist,
          owner: null,
          claim_invitation: invitation,
          application_samples: [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (createdArtistId) {
      const { error: cleanupError } = await supabaseServer
        .from("artists")
        .delete()
        .eq("id", createdArtistId);

      if (cleanupError) {
        console.error("Failed to clean up uninvited artist profile:", cleanupError);
      }
    }

    if (archivedRejectedArtistId) {
      const { error: restoreError } = await supabaseServer
        .from("artists")
        .update({ slug })
        .eq("id", archivedRejectedArtistId)
        .eq("status", "rejected");

      if (restoreError) {
        console.error("Failed to restore rejected artist URL:", restoreError);
      }
    }

    if (error instanceof ArtistClaimError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const databaseError = error as { code?: string; message?: string };
    if (databaseError?.code === "23505") {
      return NextResponse.json(
        { error: "That artist URL is already in use" },
        { status: 409 },
      );
    }

    console.error("Failed to create artist invitation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create artist invitation",
      },
      { status: 500 },
    );
  }
}
