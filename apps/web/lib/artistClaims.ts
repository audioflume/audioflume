import { clerkClient } from "@clerk/nextjs/server";

import { supabaseServer } from "@/lib/supabaseServer";

export type ArtistClaimInvitationStatus =
  | "pending"
  | "claimed"
  | "revoked"
  | "expired";

export type ArtistClaimInvitation = {
  id: string;
  artist_id: string;
  email: string;
  status: ArtistClaimInvitationStatus;
  clerk_invitation_id: string | null;
  expires_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export class ArtistClaimError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ArtistClaimError";
    this.status = status;
  }
}

export function normalizeArtistClaimEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 320);
}

export function isValidArtistClaimEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function expireArtistClaimInvitations(artistId?: string) {
  const now = new Date().toISOString();
  let query = supabaseServer
    .from("artist_claim_invitations")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lte("expires_at", now);

  if (artistId) {
    query = query.eq("artist_id", artistId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function createArtistClaimInvitation({
  artistId,
  email: rawEmail,
  invitedByClerkUserId,
  origin,
}: {
  artistId: string;
  email: string;
  invitedByClerkUserId: string | null;
  origin: string;
}) {
  const email = normalizeArtistClaimEmail(rawEmail);
  if (!email || !isValidArtistClaimEmail(email)) {
    throw new ArtistClaimError("Enter a valid email address", 400);
  }

  await expireArtistClaimInvitations(artistId);

  const { data: artist, error: artistError } = await supabaseServer
    .from("artists")
    .select("id, name")
    .eq("id", artistId)
    .maybeSingle();

  if (artistError) throw artistError;
  if (!artist) throw new ArtistClaimError("Artist not found", 404);

  const { data: owner, error: ownerError } = await supabaseServer
    .from("artist_memberships")
    .select("clerk_user_id")
    .eq("artist_id", artistId)
    .eq("role", "owner")
    .maybeSingle();

  if (ownerError) throw ownerError;
  if (owner) {
    throw new ArtistClaimError("This artist profile already has an owner", 409);
  }

  const { data: pending, error: pendingError } = await supabaseServer
    .from("artist_claim_invitations")
    .select("id, email")
    .eq("artist_id", artistId)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingError) throw pendingError;
  if (pending) {
    throw new ArtistClaimError(
      `A claim invitation is already pending for ${pending.email}`,
      409,
    );
  }

  const client = await clerkClient();
  const redirectUrl = new URL("/artists/claim", origin).toString();
  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    ignoreExisting: true,
    notify: true,
    expiresInDays: 30,
    redirectUrl,
  });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: storedInvitation, error: storeError } = await supabaseServer
    .from("artist_claim_invitations")
    .insert({
      artist_id: artistId,
      email,
      status: "pending",
      clerk_invitation_id: invitation.id,
      invited_by_clerk_user_id: invitedByClerkUserId,
      expires_at: expiresAt,
    })
    .select(
      "id, artist_id, email, status, clerk_invitation_id, expires_at, claimed_at, revoked_at, created_at",
    )
    .single();

  if (storeError) {
    try {
      await client.invitations.revokeInvitation({ invitationId: invitation.id });
    } catch (revokeError) {
      console.error("Failed to revoke orphaned artist claim invitation:", revokeError);
    }
    throw storeError;
  }

  return storedInvitation as ArtistClaimInvitation;
}

export async function revokeArtistClaimInvitation({
  artistId,
  invitationId,
}: {
  artistId: string;
  invitationId: string;
}) {
  const { data: invitation, error: lookupError } = await supabaseServer
    .from("artist_claim_invitations")
    .select("id, status, clerk_invitation_id")
    .eq("id", invitationId)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!invitation || invitation.status !== "pending") {
    throw new ArtistClaimError("Pending claim invitation not found", 404);
  }

  if (invitation.clerk_invitation_id) {
    const client = await clerkClient();
    try {
      await client.invitations.revokeInvitation({
        invitationId: invitation.clerk_invitation_id,
      });
    } catch (revokeError) {
      console.error("Failed to revoke Clerk artist claim invitation:", revokeError);
    }
  }

  const { error: updateError } = await supabaseServer
    .from("artist_claim_invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", invitationId)
    .eq("artist_id", artistId)
    .eq("status", "pending");

  if (updateError) throw updateError;
}
