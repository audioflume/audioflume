import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh only the future account cookie. This must be called from
 * middleware for the cutover test page or explicitly enabled account APIs,
 * not on desktop/admin or legacy Clerk-only routes.
 */
export async function refreshSupabaseAccountSession(
  request: NextRequest,
  options: { requireVerifiedUser?: boolean } = {},
) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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

  if (options.requireVerifiedUser) {
    // User verification, not merely a decoded JWT, gates account page HTML.
    // Each private API independently maps this user to the legacy owner.
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      const destination = request.nextUrl.pathname + request.nextUrl.search;
      const login = new URL("/sign-in", request.url);
      login.searchParams.set("redirect_url", destination);
      const redirect = NextResponse.redirect(login);
      response.cookies.getAll().forEach(({ name, value, ...cookieOptions }) =>
        redirect.cookies.set(name, value, cookieOptions),
      );
      redirect.headers.set("Cache-Control", "private, no-store");
      return redirect;
    }
  } else {
    await supabase.auth.getClaims();
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
