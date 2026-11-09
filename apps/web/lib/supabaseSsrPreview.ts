"use client";

import { createBrowserClient } from "@supabase/ssr";

export const supabaseSsrPreview = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookieOptions: { name: "sb-audioflume-auth-preview-ssr" },
  },
);
