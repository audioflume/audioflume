import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Preview-only read access: cookie session -> verified Supabase user ->
// one-to-one legacy owner mapping -> scoped aggregate counts.
// Never trust a browser-supplied owner ID or Supabase user_metadata.
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
      return result({ error: "This Supabase account has no verified Audioflume owner link." }, 403);
    }

    const [playlists, projects] = await Promise.all([
      supabaseServer.from("playlists").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", link.clerk_user_id),
      supabaseServer.from("projects").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", link.clerk_user_id),
    ]);

    if (playlists.error || projects.error) {
      throw new Error("Could not verify scoped account counts.");
    }

    return result({
      counts: {
        playlists: playlists.count ?? 0,
        projects: projects.count ?? 0,
      },
    }, 200);
  } catch (error) {
    console.error("SSR preview ownership check failed:", error);
    return result({ error: "Account verification is temporarily unavailable." }, 500);
  }
}
