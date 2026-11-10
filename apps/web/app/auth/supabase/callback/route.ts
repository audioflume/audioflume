import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { safeAuthRedirect } from "@/lib/auth/safeAuthRedirect";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";
import { provisionSupabaseAccountOwner } from "@/lib/auth/provisionSupabaseAccountOwner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The production-cookie OAuth/email callback, dormant while Clerk is active. */
export async function GET(request: NextRequest) {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) !== "supabase") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const next = safeAuthRedirect(request.nextUrl.searchParams.get("next"));
  const result = NextResponse.redirect(new URL("/sign-in?auth_status=failed", request.url));
  result.headers.set("Cache-Control", "private, no-store");
  const redirectTo = (pathname: string) => {
    result.headers.set("Location", new URL(pathname, request.url).toString());
    return result;
  };
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
          cookiesToSet.forEach(({ name, value, options }) =>
            result.cookies.set(name, value, options),
          );
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
    const ownerId = owner?.clerk_user_id ?? await provisionSupabaseAccountOwner(user.id);
    return redirectTo(ownerId ? next : "/sign-in?auth_status=unlinked");
  } catch (error) {
    console.error("Supabase account callback failed:", error);
    return result;
  }
}
