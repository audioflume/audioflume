import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import {
  ArtistClaimError,
  createArtistClaimInvitation,
  expireArtistClaimInvitations,
  normalizeArtistClaimEmail,
  revokeArtistClaimInvitation,
} from "@/lib/artistClaims";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const email = normalizeArtistClaimEmail(body?.email);
    const allowOwnershipTransfer = body?.transfer_ownership === true;
    const replacePending = body?.replace_pending === true;

    if (replacePending) {
      await expireArtistClaimInvitations(id);

      const { data: pendingInvitation, error: pendingError } = await supabaseServer
        .from("artist_claim_invitations")
        .select("id")
        .eq("artist_id", id)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingError) throw pendingError;
      if (pendingInvitation) {
        await revokeArtistClaimInvitation({
          artistId: id,
          invitationId: pendingInvitation.id,
        });
      }
    }

    const invitation = await createArtistClaimInvitation({
      artistId: id,
      email,
      invitedByClerkUserId: admin.user?.id ?? null,
      origin: new URL(request.url).origin,
      allowOwnershipTransfer,
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof ArtistClaimError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to create artist claim invitation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create artist claim invitation",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
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

    await revokeArtistClaimInvitation({
      artistId: id,
      invitationId,
    });

    return NextResponse.json({ revoked: true });
  } catch (error) {
    if (error instanceof ArtistClaimError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to revoke artist claim invitation:", error);
    return NextResponse.json(
      { error: "Failed to revoke artist claim invitation" },
      { status: 500 },
    );
  }
}
