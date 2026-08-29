import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: notifications, error } = await supabaseServer
      .from("artist_notifications")
      .select("id, kind, title, message, action_url, read_at, created_at")
      .eq("recipient_clerk_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const rows = notifications ?? [];

    return NextResponse.json({
      notifications: rows,
      unread_count: rows.filter((notification) => !notification.read_at).length,
    });
  } catch (error) {
    console.error("Failed to load account notifications:", error);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const readAt = new Date().toISOString();

    if (body.mark_all_read === true) {
      const { error } = await supabaseServer
        .from("artist_notifications")
        .update({ read_at: readAt })
        .eq("recipient_clerk_user_id", user.id)
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
      .eq("recipient_clerk_user_id", user.id)
      .select("id, read_at")
      .maybeSingle();

    if (error) throw error;
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Failed to update account notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { error } = await supabaseServer
      .from("artist_notifications")
      .delete()
      .eq("recipient_clerk_user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error("Failed to clear account notifications:", error);
    return NextResponse.json(
      { error: "Failed to clear notifications" },
      { status: 500 },
    );
  }
}
