import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function getCount(table: string, userId: string) {
  const { count, error } = await supabaseServer
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("clerk_user_id", userId);

  if (error) {
    console.warn(`Failed to count ${table}:`, error.message);
    return 0;
  }

  return count ?? 0;
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [playlists, projects, favorites, downloads] = await Promise.all([
      getCount("playlists", userId),
      getCount("projects", userId),
      getCount("favorites", userId),
      getCount("user_downloads", userId),
    ]);

    return NextResponse.json({
      usage: {
        playlists,
        projects,
        favorites,
        downloads,
      },
    });
  } catch (error) {
    console.error("Failed to load account usage:", error);
    return NextResponse.json(
      { error: "Failed to load account usage" },
      { status: 500 },
    );
  }
}
