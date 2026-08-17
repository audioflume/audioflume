import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data: artists, error: artistsError } = await supabaseServer
      .from("artists")
      .select(
        "id, name, slug, bio, location, website_url, instagram_url, profile_image_url, hero_image_url, status, created_by_clerk_user_id, approved_at, approved_by_clerk_user_id, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (artistsError) throw artistsError;

    const artistIds = (artists ?? [])
      .map((artist) => artist.id)
      .filter((artistId): artistId is string => typeof artistId === "string");

    const ownerMemberships: ArtistOwnerMembership[] = [];
    if (artistIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("artist_memberships")
        .select("artist_id, clerk_user_id")
        .eq("role", "owner")
        .in("artist_id", artistIds);

      if (error) throw error;
      ownerMemberships.push(...((data ?? []) as ArtistOwnerMembership[]));
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
