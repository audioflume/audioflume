import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ArtistDashboardShell from "@/components/artists/ArtistDashboardShell";
import { ensureUserProfile } from "@/lib/account";
import { getArtistDashboardProfiles } from "@/lib/artistDashboard";
import { acceptPendingArtistTeamInvitations } from "@/lib/artistTeam";
import { resolveAccountIdentity } from "@/lib/auth/resolveAccountIdentity";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";

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

  // Staged Supabase path: resolve a verified linked legacy owner. Membership
  // reads are safe; do not auto-accept email invitations across providers.
  const identity = await resolveAccountIdentity();
  if (identity.status !== 200) {
    redirect("/sign-in");
  }

  await ensureUserProfile(identity.userId, identity.user);
  const profiles = await getArtistDashboardProfiles(identity.userId);

  return <ArtistDashboardShell profiles={profiles} />;
}
