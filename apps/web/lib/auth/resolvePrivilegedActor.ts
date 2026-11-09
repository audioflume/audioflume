import "server-only";

import { requireAdmin } from "@/lib/admin";
import { resolveAccountOwner } from "./resolveAccountOwner";
import { selectAccountAuthProvider } from "./selectAccountAuthProvider";

type PrivilegedActor =
  | { userId: string; isAdmin: boolean; status: 200 }
  | { userId: null; isAdmin: false; status: 401 | 403 | 500 };

/**
 * Staged artist authorization boundary. Supabase identity is mapped through
 * the independently verified, one-to-one legacy owner link; it never grants
 * admin rights from user_metadata, email, or a concurrent Clerk cookie.
 *
 * Admin privilege migration requires a separate server-trusted role source.
 */
export async function resolvePrivilegedActor(): Promise<PrivilegedActor> {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "clerk") {
    const { user, isAdmin } = await requireAdmin();
    return user?.id
      ? { userId: user.id, isAdmin, status: 200 }
      : { userId: null, isAdmin: false, status: 401 };
  }

  const owner = await resolveAccountOwner();
  return owner.userId
    ? { userId: owner.userId, isAdmin: false, status: 200 }
    : { userId: null, isAdmin: false, status: owner.status };
}
