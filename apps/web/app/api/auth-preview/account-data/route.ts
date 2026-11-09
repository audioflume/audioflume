import { NextResponse } from "next/server";

import { getLinkedLegacyUserId } from "@/lib/supabaseIdentity";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Read-only migration verification. A Supabase account can only see aggregate
// counts for its own VERIFIED legacy owner link; never returns the owner ID.
export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return respond({ error: "Supabase sign-in is required." }, 401);
  }

  try {
    const legacyUserId = await getLinkedLegacyUserId(accessToken);
    if (!legacyUserId) {
      return respond({ error: "This Supabase account is not linked to an existing Audioflume account." }, 403);
    }

    const [playlists, favorites, projects, artistMemberships] = await Promise.all([
      supabaseServer.from("playlists").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
      supabaseServer.from("favorites").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
      supabaseServer.from("projects").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
      supabaseServer.from("artist_memberships").select("artist_id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
    ]);

    if (playlists.error || favorites.error || projects.error || artistMemberships.error) {
      throw new Error("Account ownership verification query failed.");
    }

    return respond({
      counts: {
        playlists: playlists.count ?? 0,
        favorites: favorites.count ?? 0,
        projects: projects.count ?? 0,
        artistMemberships: artistMemberships.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Could not verify legacy account data:", error);
    return respond({ error: "Account data verification is temporarily unavailable." }, 500);
  }
}
