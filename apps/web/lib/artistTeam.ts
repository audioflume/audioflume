import { supabaseServer } from "@/lib/supabaseServer";

const ACCEPTABLE_INVITE_ROLES = new Set(["manager", "editor", "viewer"]);

function normalizeEmail(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function acceptPendingArtistTeamInvitations(
  clerkUserId: string,
  emailAddress: string | null | undefined,
) {
  const email = normalizeEmail(emailAddress);
  if (!email) return 0;

  const { data: invitations, error: invitationsError } = await supabaseServer
    .from("artist_team_invitations")
    .select("id, artist_id, role")
    .eq("status", "pending")
    .eq("email", email)
    .order("created_at", { ascending: true });

  if (invitationsError) throw invitationsError;
  if (!invitations?.length) return 0;

  let acceptedCount = 0;

  for (const invitation of invitations) {
    if (!ACCEPTABLE_INVITE_ROLES.has(String(invitation.role))) continue;

    const { data: existingMembership, error: membershipLookupError } =
      await supabaseServer
        .from("artist_memberships")
        .select("artist_id, clerk_user_id")
        .eq("artist_id", invitation.artist_id)
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();

    if (membershipLookupError) throw membershipLookupError;

    if (!existingMembership) {
      const { error: insertError } = await supabaseServer
        .from("artist_memberships")
        .insert({
          artist_id: invitation.artist_id,
          clerk_user_id: clerkUserId,
          role: invitation.role,
        });

      if (insertError) throw insertError;
    }

    const acceptedAt = new Date().toISOString();
    const { error: invitationUpdateError } = await supabaseServer
      .from("artist_team_invitations")
      .update({
        status: "accepted",
        accepted_by_clerk_user_id: clerkUserId,
        accepted_at: acceptedAt,
        revoked_at: null,
      })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (invitationUpdateError) throw invitationUpdateError;
    acceptedCount += 1;
  }

  return acceptedCount;
}
