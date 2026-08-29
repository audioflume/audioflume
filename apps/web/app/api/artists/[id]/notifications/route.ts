import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireArtistPermission(id, "artist:view");

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: notifications, error } = await supabaseServer
      .from("artist_notifications")
      .select("id, kind, title, message, action_url, read_at, created_at")
      .eq("artist_id", id)
      .eq("recipient_clerk_user_id", access.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const rows = notifications ?? [];

    return NextResponse.json({
      notifications: rows,
      unread_count: rows.filter((notification) => !notification.read_at).length,
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load artist notifications:", error);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireArtistPermission(id, "artist:view");

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const readAt = new Date().toISOString();

    if (body.mark_all_read === true) {
      const { error } = await supabaseServer
        .from("artist_notifications")
        .update({ read_at: readAt })
        .eq("artist_id", id)
        .eq("recipient_clerk_user_id", access.userId)
        .is("read_at", null);

      if (error) throw error;

      return NextResponse.json({ read_at: readAt });
    }

    const notificationId =
      typeof body.notification_id === "string" ? body.notification_id : "";

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 },
      );
    }

    const { data: notification, error } = await supabaseServer
      .from("artist_notifications")
      .update({ read_at: readAt })
      .eq("id", notificationId)
      .eq("artist_id", id)
      .eq("recipient_clerk_user_id", access.userId)
      .select("id, read_at")
      .maybeSingle();

    if (error) throw error;
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to update artist notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireArtistPermission(id, "artist:view");

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabaseServer
      .from("artist_notifications")
      .delete()
      .eq("artist_id", id)
      .eq("recipient_clerk_user_id", access.userId);

    if (error) throw error;

    return NextResponse.json({ cleared: true });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to clear artist notifications:", error);
    return NextResponse.json(
      { error: "Failed to clear notifications" },
      { status: 500 },
    );
  }
}
