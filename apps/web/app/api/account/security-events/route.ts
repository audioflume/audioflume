import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseServer
      .from("user_security_events")
      .select("id, event_type, description, location_label, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("Failed to load security events:", error.message);
      return NextResponse.json({ events: [] });
    }

    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    console.error("Failed to load account security events:", error);
    return NextResponse.json({ events: [] });
  }
}
