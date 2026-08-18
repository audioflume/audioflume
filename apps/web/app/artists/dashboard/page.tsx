import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ArtistDashboardShell from "@/components/artists/ArtistDashboardShell";
import { getArtistDashboardProfiles } from "@/lib/artistDashboard";

export const dynamic = "force-dynamic";

export default async function ArtistDashboardPage() {
  const user = await currentUser();
  if (!user?.id) {
    redirect("/sign-in");
  }

  const profiles = await getArtistDashboardProfiles(user.id);

  return <ArtistDashboardShell profiles={profiles} />;
}
