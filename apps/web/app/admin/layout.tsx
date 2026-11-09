import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";

/**
 * Supabase-mode admin pages must not rely on a concurrent Clerk session or
 * client-side metadata. Clerk mode keeps its existing page-level behavior.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase") {
    const admin = await requireAdmin();
    if (!admin.isAdmin) {
      redirect("/discover");
    }
  }

  return children;
}
