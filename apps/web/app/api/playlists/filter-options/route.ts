import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Clerk-authenticated replacement data source for the existing PlaylistFilter.
// The shared component is not switched to this route until separately reviewed.
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
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
