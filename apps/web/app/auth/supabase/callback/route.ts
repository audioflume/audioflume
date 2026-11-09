import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { safeAuthRedirect } from "@/lib/auth/safeAuthRedirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The production-cookie OAuth/email callback, dormant while Clerk is active. */
export async function GET(request: NextRequest) {
  const next = safeAuthRedirect(request.nextUrl.searchParams.get("next"));
  const response = (pathname: string) => {
    const result = NextResponse.redirect(new URL(pathname, request.url));
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  };
  let result = response("/sign-in?auth_status=failed");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return result;

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => result.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => result.headers.set(name, value));
        },
      },
    },
  );

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return result;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return result;

    const { data: owner, error: ownerError } = await supabaseServer
      .from("auth_identity_links")
      .select("clerk_user_id")
      .eq("supabase_user_id", user.id)
      .maybeSingle();

    if (ownerError) throw ownerError;

    // Registration does not authorize access to another legacy account.
    result = response(owner?.clerk_user_id ? next : "/sign-in?auth_status=unlinked");
    return result;
  } catch (error) {
    console.error("Supabase account callback failed:", error);
    result = response("/sign-in?auth_status=failed");
    return result;
  }
}
