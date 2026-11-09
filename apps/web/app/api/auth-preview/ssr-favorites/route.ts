import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Read-only staged endpoint. Production /api/favorites remains Clerk-authorized.
// The browser never chooses the legacy owner.
export async function GET(request: NextRequest) {
  const response = NextResponse.json({}, {
    headers: { "Cache-Control": "private, no-store" },
  });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: "sb-audioflume-auth-preview-ssr" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  function result(body: Record<string, unknown>, status: number) {
    const next = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
    response.cookies.getAll().forEach(({ name, value, ...options }) =>
      next.cookies.set(name, value, options),
    );
    for (const header of ["Cache-Control", "Expires", "Pragma"]) {
      const value = response.headers.get(header);
      if (value) next.headers.set(header, value);
    }
    return next;
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return result({ error: "A verified Supabase cookie session is required." }, 401);
    }

    const { data: link, error: linkError } = await supabaseServer
      .from("auth_identity_links")
      .select("clerk_user_id")
      .eq("supabase_user_id", user.id)
      .maybeSingle();

    if (linkError) throw linkError;
    if (!link?.clerk_user_id) {
      return result({ error: "This Supabase identity has no verified Audioflume owner link." }, 403);
    }

    const pageSize = 500;
    let offset = 0;
    const activeFavorites: { song_id: string; created_at: string }[] = [];

    while (true) {
      const { data: favorites, error: favoritesError } = await supabaseServer
        .from("favorites")
        .select("song_id, created_at")
        .eq("clerk_user_id", link.clerk_user_id)
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
