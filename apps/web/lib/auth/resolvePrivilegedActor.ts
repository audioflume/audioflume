import "server-only";

import { requireAdmin } from "@/lib/admin";
import { resolveAccountOwner } from "./resolveAccountOwner";
import { isTrustedSupabaseAdmin } from "./isTrustedSupabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";
import { selectAccountAuthProvider } from "./selectAccountAuthProvider";

type PrivilegedActor =
  | { userId: string; isAdmin: boolean; status: 200 }
  | { userId: null; isAdmin: false; status: 401 | 403 | 500 };

/**
 * Staged artist authorization boundary. Supabase identity is mapped through
 * the independently verified, one-to-one legacy owner link; it never grants
 * admin rights from user_metadata, email, or a concurrent Clerk cookie.
 *
 * Supabase admin elevation requires an explicit rollout gate and a fresh
 * server-trusted app_metadata role lookup for the verified Supabase UUID.
 */
export async function resolvePrivilegedActor(): Promise<PrivilegedActor> {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "clerk") {
    const { user, isAdmin } = await requireAdmin();
    return user?.id
      ? { userId: user.id, isAdmin, status: 200 }
      : { userId: null, isAdmin: false, status: 401 };
  }

  const owner = await resolveAccountOwner();
  if (!owner.userId) {
    return { userId: null, isAdmin: false, status: owner.status };
  }

  if (process.env.AUDIOFLUME_SUPABASE_ADMIN_AUTH_ENABLED !== "true" || !owner.supabaseUserId) {
    return { userId: owner.userId, isAdmin: false, status: 200 };
  }

  try {
    const { data, error } = await supabaseServer.auth.admin.getUserById(owner.supabaseUserId);
    const isAdmin = !error &&
      data.user?.id === owner.supabaseUserId &&
      isTrustedSupabaseAdmin(
        process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
        process.env.AUDIOFLUME_SUPABASE_ADMIN_AUTH_ENABLED,
        data.user.app_metadata,
      );
    return { userId: owner.userId, isAdmin, status: 200 };
  } catch (error) {
    console.error("Supabase artist admin authorization failed:", error);
    return { userId: owner.userId, isAdmin: false, status: 200 };
  }
}
