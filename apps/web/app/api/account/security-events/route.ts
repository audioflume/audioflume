import { resolveAccountOwner } from "@/lib/auth/resolveAccountOwner";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const account = await resolveAccountOwner();
  const { userId } = account;
  if (!userId) return NextResponse.json({ error: account.error }, { status: account.status });

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
