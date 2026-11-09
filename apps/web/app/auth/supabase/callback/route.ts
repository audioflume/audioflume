import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { safeAuthRedirect } from "@/lib/auth/safeAuthRedirect";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The production-cookie OAuth/email callback, dormant while Clerk is active. */
export async function GET(request: NextRequest) {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) !== "supabase") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const next = safeAuthRedirect(request.nextUrl.searchParams.get("next"));
  const pendingCookies = new Map<string, { value: string; options: Record<string, unknown> }>();
  const pendingHeaders = new Headers();
  const response = (pathname: string) => {
    const result = NextResponse.redirect(new URL(pathname, request.url));
    result.headers.set("Cache-Control", "private, no-store");
    pendingCookies.forEach(({ value, options }, name) => result.cookies.set(name, value, options));
    pendingHeaders.forEach((value, name) => result.headers.set(name, value));
    return result;
  };
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return response("/sign-in?auth_status=failed");

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
          cookiesToSet.forEach(({ name, value, options }) =>
            pendingCookies.set(name, { value, options }),
          );
          Object.entries(headers).forEach(([name, value]) => pendingHeaders.set(name, value));
        },
      },
    },
  );

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return response("/sign-in?auth_status=failed");

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return response("/sign-in?auth_status=failed");

    const { data: owner, error: ownerError } = await supabaseServer
      .from("auth_identity_links")
      .select("clerk_user_id")
      .eq("supabase_user_id", user.id)
      .maybeSingle();

    if (ownerError) throw ownerError;

    // Registration does not authorize access to another legacy account.
    return response(owner?.clerk_user_id ? next : "/sign-in?auth_status=unlinked");
  } catch (error) {
    console.error("Supabase account callback failed:", error);
    return response("/sign-in?auth_status=failed");
  }
}
