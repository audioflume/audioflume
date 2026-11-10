"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Future web account session, separate from legacy localStorage and
 * the isolated SSR auth-preview cookie. The provider remains Clerk until
 * the server-side cutover has been explicitly enabled.
 */
export const supabaseAccountBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookieOptions: { name: "sb-audioflume-auth" } },
);
