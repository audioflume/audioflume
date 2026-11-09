import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Isolated migration test. Never use this route as a production
// authorization gate: it intentionally returns no account data.
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ authenticated: false }, {
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

  // getUser checks with Supabase Auth, unlike an unverified cookie session.
  const { data: { user }, error } = await supabase.auth.getUser();
  // An invalid or expired token must not be interpreted as authenticated.
  const result = NextResponse.json({ authenticated: !error && Boolean(user) }, {
    headers: { "Cache-Control": "private, no-store" },
  });

  response.cookies.getAll().forEach(({ name, value, ...options }) =>
    result.cookies.set(name, value, options),
  );
  for (const header of ["Cache-Control", "Expires", "Pragma"]) {
    const value = response.headers.get(header);
    if (value) result.headers.set(header, value);
  }

  return result;
}
