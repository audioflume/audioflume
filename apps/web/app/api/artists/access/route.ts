import { NextResponse } from "next/server";

import { resolvePrivilegedActor } from "@/lib/auth/resolvePrivilegedActor";
import {
  getArtistMembershipsForUser,
  getArtistPermissions,
} from "@/lib/artistPermissions";

export async function GET() {
  const { isAdmin, userId, status } = await resolvePrivilegedActor();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }

  try {
    const memberships = await getArtistMembershipsForUser(userId);

    return NextResponse.json({
      isAdmin,
      memberships: memberships.map((membership) => ({
        artist_id: membership.artist_id,
        role: membership.role,
        permissions: getArtistPermissions(membership.role),
      })),
    });
  } catch (error) {
    console.error("Failed to load artist access:", error);
    return NextResponse.json(
      { error: "Failed to load artist access" },
      { status: 500 },
    );
  }
}
