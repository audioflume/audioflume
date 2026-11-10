import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { provisionSupabaseAccountOwner } from "./provisionSupabaseAccountOwner";
import { resolveVerifiedLegacyOwner } from "@/lib/auth-preview/resolveVerifiedLegacyOwner";

/**
 * Production-targeted Supabase cookie authorization, staged but NOT wired into
 * any existing API. No Clerk fallback or identity supplied by the browser.
 *
 * Cutover prerequisite: browser sessions must use this same cookie namespace,
 * middleware must refresh it, and RLS/browser-direct access must be reviewed.
 */
export function createSupabaseAccountRequest(request: NextRequest) {
  const cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: "sb-audioflume-auth" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            cookieResponse.headers.set(name, value),
          );
        },
      },
    },
  );

  async function resolveOwner() {
    return resolveVerifiedLegacyOwner(
      async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        return error ? null : (user?.id ?? null);
      },
      async (supabaseUserId) => {
        const { data, error } = await supabaseServer
          .from("auth_identity_links")
          .select("clerk_user_id")
          .eq("supabase_user_id", supabaseUserId)
          .maybeSingle();

        if (error) throw error;
        return data?.clerk_user_id ?? await provisionSupabaseAccountOwner(supabaseUserId);
      },
    );
  }

  function respond(body: Record<string, unknown>, status = 200) {
    const response = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });

    cookieResponse.cookies.getAll().forEach(({ name, value, ...options }) =>
      response.cookies.set(name, value, options),
    );
    for (const header of ["Cache-Control", "Expires", "Pragma"]) {
      const value = cookieResponse.headers.get(header);
      if (value) response.headers.set(header, value);
    }

    return response;
  }

  return { resolveOwner, respond };
}
