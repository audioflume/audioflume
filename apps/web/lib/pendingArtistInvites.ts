import { normalizeArtistClaimEmail } from "@/lib/artistClaims";
import { supabaseServer } from "@/lib/supabaseServer";

type ArtistInviteUser = {
  emailAddresses: Array<{
    emailAddress: string;
    verification?: { status?: string | null } | null;
  }>;
};

function getVerifiedUserEmails(user: ArtistInviteUser) {
  return Array.from(
    new Set(
      user.emailAddresses
        .filter((address) => address.verification?.status === "verified")
        .map((address) => normalizeArtistClaimEmail(address.emailAddress))
        .filter(Boolean),
    ),
  );
}

export async function getPendingArtistInviteCount(user: ArtistInviteUser) {
  const emails = getVerifiedUserEmails(user);
  if (emails.length === 0) return 0;

  const { data: invitations, error: invitationsError } = await supabaseServer
    .from("artist_claim_invitations")
    .select("artist_id, ownership_transfer")
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .in("email", emails);

  if (invitationsError) throw invitationsError;
  if (!invitations?.length) return 0;

  const artistIds = Array.from(
    new Set(invitations.map((invitation) => invitation.artist_id)),
  );

  const [artistsResult, ownersResult] = await Promise.all([
    supabaseServer.from("artists").select("id").in("id", artistIds),
    supabaseServer
      .from("artist_memberships")
      .select("artist_id")
      .eq("role", "owner")
      .in("artist_id", artistIds),
  ]);

  if (artistsResult.error) throw artistsResult.error;
  if (ownersResult.error) throw ownersResult.error;

  const existingArtistIds = new Set(
    (artistsResult.data ?? []).map((artist) => artist.id),
  );
  const ownedArtistIds = new Set(
    (ownersResult.data ?? []).map((membership) => membership.artist_id),
  );

  return invitations.filter(
    (invitation) =>
      existingArtistIds.has(invitation.artist_id) &&
      (invitation.ownership_transfer || !ownedArtistIds.has(invitation.artist_id)),
  ).length;
}
