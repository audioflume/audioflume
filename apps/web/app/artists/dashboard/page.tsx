import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ArtistDashboardShell from "@/components/artists/ArtistDashboardShell";
import { ensureUserProfile } from "@/lib/account";
import { getArtistDashboardProfiles } from "@/lib/artistDashboard";
import { acceptPendingArtistTeamInvitations } from "@/lib/artistTeam";

export const dynamic = "force-dynamic";

export default async function ArtistDashboardPage() {
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
