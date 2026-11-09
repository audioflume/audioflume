import { NextResponse } from "next/server";

import { resolvePreviewOwner } from "@/lib/supabasePreviewAuthorization";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Count only favorites whose songs are still published and not archived.
// Pagination avoids silently truncating accounts with more than 1,000 favorites.
async function countActiveFavorites(legacyUserId: string) {
  const pageSize = 500;
  let offset = 0;
  let total = 0;

  while (true) {
    const { data: favorites, error: favoriteError } = await supabaseServer
      .from("favorites")
      .select("song_id")
      .eq("clerk_user_id", legacyUserId)
      .range(offset, offset + pageSize - 1);
    if (favoriteError) throw favoriteError;

    const rows = favorites ?? [];
    const songIds = [...new Set(
      rows.map((favorite) => favorite.song_id)
        .filter((songId): songId is string => typeof songId === "string" && UUID_PATTERN.test(songId))
    )];

    if (songIds.length > 0) {
      const { data: activeSongs, error: songError } = await supabaseServer
        .from("songs")
        .select("id")
        .in("id", songIds)
        .eq("status", "published")
        .is("archived_at", null);
      if (songError) throw songError;

      const activeIds = new Set((activeSongs ?? []).map((song) => song.id));
      total += rows.filter((favorite) => activeIds.has(favorite.song_id)).length;
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return total;
}

// Read-only migration verification. A Supabase account can only see aggregate
// counts for its own VERIFIED legacy owner link; never returns the owner ID.
export async function GET(request: Request) {
  try {
    const ownership = await resolvePreviewOwner(request);
    if (ownership.status !== 200) {
      return respond({ error: ownership.error }, ownership.status);
    }

    const legacyUserId = ownership.legacyUserId;

    const [playlists, favoritesCount, projects, artistMemberships] = await Promise.all([
      supabaseServer.from("playlists").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
      countActiveFavorites(legacyUserId),
      supabaseServer.from("projects").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
      supabaseServer.from("artist_memberships").select("artist_id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
    ]);

    if (playlists.error || projects.error || artistMemberships.error) {
      throw new Error("Account ownership verification query failed.");
    }

    return respond({
      counts: {
        playlists: playlists.count ?? 0,
        favorites: favoritesCount,
        projects: projects.count ?? 0,
        artistMemberships: artistMemberships.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Could not verify legacy account data:", error);
    return respond({ error: "Account data verification is temporarily unavailable." }, 500);
  }
}
