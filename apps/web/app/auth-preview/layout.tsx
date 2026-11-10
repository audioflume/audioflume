"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Keep the dual-identity preview's Clerk context out of Supabase-only pages. */
export default function AuthPreviewLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/auth-preview" || pathname === "/auth-preview/ssr" || pathname.startsWith("/auth-preview/clerk-sign-in")) {
    return <ClerkProvider>{children}</ClerkProvider>;
  }
  return children;
}
