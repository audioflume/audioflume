import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveVerifiedLegacyOwner } from "./resolveVerifiedLegacyOwner";

/**
 * Isolated SSR auth request context. Never use this preview cookie as
 * authorization for production Clerk endpoints.
 */
export function createPreviewSsrRequest(request: NextRequest) {
  const cookiesResponse = NextResponse.next({ request });

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
            cookiesResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            cookiesResponse.headers.set(name, value),
          );
        },
      },
    },
  );

  function respond(body: Record<string, unknown>, status = 200) {
    const response = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
    cookiesResponse.cookies.getAll().forEach(({ name, value, ...options }) =>
      response.cookies.set(name, value, options),
    );
    for (const header of ["Cache-Control", "Expires", "Pragma"]) {
      const value = cookiesResponse.headers.get(header);
      if (value) response.headers.set(header, value);
    }
    return response;
  }

  async function getVerifiedUserId() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return error ? null : (user?.id ?? null);
  }

  async function resolveOwner() {
    return resolveVerifiedLegacyOwner(getVerifiedUserId, async (supabaseUserId) => {
      const { data, error } = await supabaseServer
        .from("auth_identity_links")
        .select("clerk_user_id")
        .eq("supabase_user_id", supabaseUserId)
        .maybeSingle();
      if (error) throw error;
      return data?.clerk_user_id ?? null;
    });
  }

  return { getVerifiedUserId, resolveOwner, respond };
}
