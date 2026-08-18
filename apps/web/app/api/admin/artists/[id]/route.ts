import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { createArtistNotificationForMembers } from "@/lib/artistNotifications";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type ArtistStatus = "pending" | "approved" | "rejected" | "suspended";

const ARTIST_STATUSES: ArtistStatus[] = [
  "pending",
  "approved",
  "rejected",
  "suspended",
];

function normalizeArtistStatus(value: unknown): ArtistStatus | null {
  return ARTIST_STATUSES.includes(value as ArtistStatus)
    ? (value as ArtistStatus)
    : null;
}

function getArtistStatusNotification(status: ArtistStatus, artistName: string) {
  if (status === "approved") {
    return {
      kind: "artist_approved",
      title: `${artistName} was approved`,
      message:
        "Your artist profile is approved. You can now manage and submit catalogue music.",
    };
  }

  if (status === "rejected") {
    return {
      kind: "artist_rejected",
      title: `${artistName} needs changes`,
      message: "Your artist profile needs changes before it can be approved.",
    };
  }

  if (status === "suspended") {
    return {
      kind: "artist_suspended",
      title: `${artistName} was suspended`,
      message: "Your artist profile has been suspended.",
    };
  }

  return {
    kind: "artist_pending",
    title: `${artistName} is pending review`,
    message: "Your artist profile has been returned to pending review.",
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const status = normalizeArtistStatus((body as Record<string, unknown>).status);
  if (!status) {
    return NextResponse.json({ error: "Invalid artist status" }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const { data: existingArtist, error: existingError } = await supabaseServer
      .from("artists")
      .select("id, name, status, approved_at, approved_by_clerk_user_id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existingArtist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const updates: {
      status: ArtistStatus;
      approved_at?: string | null;
      approved_by_clerk_user_id?: string | null;
    } = { status };

    if (status === "approved") {
      updates.approved_at = existingArtist.approved_at ?? new Date().toISOString();
      updates.approved_by_clerk_user_id =
        existingArtist.approved_by_clerk_user_id ?? admin.user?.id ?? null;
    } else if (status === "pending" || status === "rejected") {
      updates.approved_at = null;
      updates.approved_by_clerk_user_id = null;
    }

    const { data: artist, error: updateError } = await supabaseServer
      .from("artists")
      .update(updates)
      .eq("id", id)
      .select(
        "id, name, slug, bio, location, website_url, instagram_url, profile_image_url, hero_image_url, status, created_by_clerk_user_id, approved_at, approved_by_clerk_user_id, created_at, updated_at",
      )
      .single();

    if (updateError) throw updateError;

    if (existingArtist.status !== status) {
      const notification = getArtistStatusNotification(status, artist.name);

      try {
        await createArtistNotificationForMembers({
          artistId: id,
          ...notification,
          actionUrl: `/artists/dashboard?section=overview&artist=${id}`,
        });
      } catch (notificationError) {
        console.error("Failed to create artist status notification:", notificationError);
      }
    }

    return NextResponse.json({ artist });
  } catch (error) {
    console.error("Failed to update artist status:", error);
    return NextResponse.json(
      { error: "Failed to update artist status" },
      { status: 500 },
    );
  }
}
