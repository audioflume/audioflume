import { resolveAccountOwner } from "@/lib/auth/resolveAccountOwner";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Clerk-authenticated replacement data source for the existing PlaylistFilter.
// The shared component is not switched to this route until separately reviewed.
export async function GET() {
  const account = await resolveAccountOwner();
  const { userId } = account;

  if (!userId) {
    return NextResponse.json(
      { error: account.error },
      { status: account.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const { data, error } = await supabaseServer
      .from("playlists")
      .select("id, name")
      .eq("clerk_user_id", userId)
      .order("name");

    if (error) throw error;

    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to load playlist filter options:", error);
    return NextResponse.json(
      { error: "Unable to load playlist filter options." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
