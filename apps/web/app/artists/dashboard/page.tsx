import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ArtistDashboardShell from "@/components/artists/ArtistDashboardShell";
import { ensureUserProfile } from "@/lib/account";
import { getArtistDashboardProfiles } from "@/lib/artistDashboard";
import { acceptPendingArtistTeamInvitations } from "@/lib/artistTeam";
import { resolveAccountOwner } from "@/lib/auth/resolveAccountOwner";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";
import { verifiedSupabaseClaimEmails } from "@/lib/auth/verifiedSupabaseClaimEmails";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function ArtistDashboardPage() {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "clerk") {
    const user = await currentUser();
    if (!user?.id) {
      redirect("/sign-in");
    }

    await ensureUserProfile(user.id, user);
    await acceptPendingArtistTeamInvitations(
      user.id,
      user.primaryEmailAddress?.emailAddress ?? null,
    );

    const profiles = await getArtistDashboardProfiles(user.id);

    return <ArtistDashboardShell profiles={profiles} />;
  }

  // Resolve the Supabase subject and its one-to-one legacy owner together.
  // Never accept an invitation using display metadata or a Clerk browser cookie.
  const owner = await resolveAccountOwner();
  if (!owner.userId || !owner.supabaseUserId || !owner.profileIdentity) {
    redirect("/sign-in");
  }

  await ensureUserProfile(owner.userId, { id: owner.userId, ...owner.profileIdentity });

  // A fresh, server-trusted confirmed email is required before accepting
  // existing team invitations on behalf of the verified legacy owner.
  const { data, error } = await supabaseServer.auth.admin.getUserById(owner.supabaseUserId);
  if (error || data.user?.id !== owner.supabaseUserId) {
    throw new Error("Unable to verify artist invitation email.");
  }
  const verifiedEmails = verifiedSupabaseClaimEmails(owner.supabaseUserId, data.user);
  if (verifiedEmails.length > 0) {
    await acceptPendingArtistTeamInvitations(owner.userId, verifiedEmails[0]);
  }

  const profiles = await getArtistDashboardProfiles(owner.userId);

  return <ArtistDashboardShell profiles={profiles} />;
}
