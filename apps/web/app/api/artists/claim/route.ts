import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { ensureUserProfile } from "@/lib/account";
import {
  expireArtistClaimInvitations,
  normalizeArtistClaimEmail,
} from "@/lib/artistClaims";
import { supabaseServer } from "@/lib/supabaseServer";

function getVerifiedUserEmails(user: {
  emailAddresses: Array<{
    emailAddress: string;
    verification?: { status?: string | null } | null;
  }>;
}) {
  return Array.from(
    new Set(
      user.emailAddresses
        .filter((address) => address.verification?.status === "verified")
        .map((address) => normalizeArtistClaimEmail(address.emailAddress))
        .filter(Boolean),
    ),
  );
}

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserProfile(user.id, user);
    await expireArtistClaimInvitations();

    const emails = getVerifiedUserEmails(user);
    if (emails.length === 0) {
      return NextResponse.json({ invitations: [] });
    }

    const { data: invitations, error: invitationsError } = await supabaseServer
      .from("artist_claim_invitations")
      .select("id, artist_id, email, status, expires_at, created_at")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .in("email", emails)
      .order("created_at", { ascending: true });

    if (invitationsError) throw invitationsError;
    if (!invitations?.length) {
      return NextResponse.json({ invitations: [] });
    }

    const artistIds = Array.from(
      new Set(invitations.map((invitation) => invitation.artist_id)),
    );

    const [artistsResult, ownersResult] = await Promise.all([
      supabaseServer
        .from("artists")
        .select("id, name, slug, profile_image_url, status")
        .in("id", artistIds),
      supabaseServer
        .from("artist_memberships")
        .select("artist_id")
        .eq("role", "owner")
        .in("artist_id", artistIds),
    ]);

    if (artistsResult.error) throw artistsResult.error;
    if (ownersResult.error) throw ownersResult.error;

    const artistsById = new Map(
      (artistsResult.data ?? []).map((artist) => [artist.id, artist]),
    );
    const ownedArtistIds = new Set(
      (ownersResult.data ?? []).map((membership) => membership.artist_id),
    );

    return NextResponse.json({
      invitations: invitations
        .filter((invitation) => !ownedArtistIds.has(invitation.artist_id))
        .map((invitation) => ({
          ...invitation,
          artist: artistsById.get(invitation.artist_id) ?? null,
        }))
        .filter((invitation) => Boolean(invitation.artist)),
    });
  } catch (error) {
    console.error("Failed to load artist claim invitations:", error);
    return NextResponse.json(
      { error: "Failed to load artist claim invitations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const invitationId =
      typeof body?.invitation_id === "string" ? body.invitation_id : "";

    if (!invitationId) {
      return NextResponse.json(
        { error: "Claim invitation is required" },
        { status: 400 },
      );
    }

    await ensureUserProfile(user.id, user);
    await expireArtistClaimInvitations();

    const emails = getVerifiedUserEmails(user);
    if (emails.length === 0) {
      return NextResponse.json(
        { error: "A verified email address is required" },
        { status: 403 },
      );
    }

    const { data: invitation, error: invitationError } = await supabaseServer
      .from("artist_claim_invitations")
      .select("id, artist_id, email, status, expires_at")
      .eq("id", invitationId)
      .eq("status", "pending")
      .maybeSingle();

    if (invitationError) throw invitationError;
    if (!invitation) {
      return NextResponse.json(
        { error: "Claim invitation is invalid or expired" },
        { status: 404 },
      );
    }

    const invitationEmail = normalizeArtistClaimEmail(invitation.email);
    if (!emails.includes(invitationEmail)) {
      return NextResponse.json(
        { error: "This invitation belongs to a different email address" },
        { status: 403 },
      );
    }

    const { data: artistId, error: claimError } = await supabaseServer.rpc(
      "claim_artist_invitation",
      {
        p_invitation_id: invitation.id,
        p_clerk_user_id: user.id,
        p_email: invitationEmail,
      },
    );

    if (claimError) {
      const message = claimError.message || "Failed to claim artist profile";
      const status = /already been claimed/i.test(message) ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({
      claimed: true,
      artist_id: artistId,
      redirect_url: `/artists/dashboard?section=overview&artist=${artistId}`,
    });
  } catch (error) {
    console.error("Failed to claim artist profile:", error);
    return NextResponse.json(
      { error: "Failed to claim artist profile" },
      { status: 500 },
    );
  }
}
