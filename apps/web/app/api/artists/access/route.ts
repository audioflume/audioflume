import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import {
  getArtistMembershipsForUser,
  getArtistPermissions,
} from "@/lib/artistPermissions";

export async function GET() {
  const { isAdmin, user } = await requireAdmin();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const memberships = await getArtistMembershipsForUser(user.id);

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
