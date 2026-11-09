import { createPreviewSsrRequest } from "@/lib/auth-preview/createPreviewSsrRequest";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Read-only staged endpoint. Production /api/favorites remains Clerk-authorized.
// The browser never chooses the legacy owner.
export async function GET(request: NextRequest) {
  const { resolveOwner, respond: result } = createPreviewSsrRequest(request);

  try {
    const ownership = await resolveOwner();
    if (ownership.status !== 200) {
      return result({ error: ownership.error }, ownership.status);
    }

    const legacyUserId = ownership.legacyUserId;

    const pageSize = 500;
    let offset = 0;
    const activeFavorites: { song_id: string; created_at: string }[] = [];

    while (true) {
      const { data: favorites, error: favoritesError } = await supabaseServer
        .from("favorites")
        .select("song_id, created_at")
        .eq("clerk_user_id", legacyUserId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (favoritesError) throw favoritesError;
      const rows = favorites ?? [];
      const ids = [...new Set(rows.map((favorite) => favorite.song_id)
        .filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id)))];

      if (ids.length > 0) {
        const { data: songs, error: songsError } = await supabaseServer
          .from("songs")
          .select("id")
          .in("id", ids)
          .eq("status", "published")
          .is("archived_at", null);
        if (songsError) throw songsError;

        const activeIds = new Set((songs ?? []).map((song) => song.id));
        activeFavorites.push(...rows.filter((favorite) =>
          typeof favorite.song_id === "string" && activeIds.has(favorite.song_id),
        ).map((favorite) => ({
          song_id: favorite.song_id as string,
          created_at: favorite.created_at,
        })));
      }

      if (rows.length < pageSize) break;
      offset += pageSize;
    }

    return result({ favorites: activeFavorites }, 200);
  } catch (error) {
    console.error("SSR preview favorites verification failed:", error);
    return result({ error: "Favorites verification is temporarily unavailable." }, 500);
  }
}
