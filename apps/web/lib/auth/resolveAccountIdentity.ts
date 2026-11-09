import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { resolveAccountOwner, type VerifiedAccountProfileIdentity } from "./resolveAccountOwner";
import { selectAccountAuthProvider } from "./selectAccountAuthProvider";

type AccountIdentityUser = VerifiedAccountProfileIdentity & { id: string };

export type AccountIdentityResolution =
  | { status: 200; userId: string; user: AccountIdentityUser; error?: never }
  | { status: 401 | 403 | 500; userId: null; user: null; error: string };

/**
 * Migration-only identity adapter for profile/billing/membership.
 * Default mode preserves Clerk currentUser() fields. Supabase mode uses
 * the user from verified auth.getUser() and the one-to-one legacy owner link.
 *
 * Supabase user_metadata is used exclusively for display fields. Neither
 * metadata nor email may select the legacy owner or grant billing privileges.
 */
export async function resolveAccountIdentity(): Promise<AccountIdentityResolution> {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "clerk") {
    const user = await currentUser();
    if (!user?.id) {
      return { status: 401, userId: null, user: null, error: "Unauthorized" };
    }

    return {
      status: 200,
      userId: user.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        username: user.username,
        imageUrl: user.imageUrl,
        primaryEmailAddress: { emailAddress: user.primaryEmailAddress?.emailAddress ?? null },
      },
    };
  }

  const account = await resolveAccountOwner();
  if (!account.userId) {
    return { status: account.status, userId: null, user: null, error: account.error };
  }

  // Defense in depth: never seed a billing or membership record without
  // the verified profile attached to the same auth.getUser() resolution.
  if (!account.profileIdentity) {
    return { status: 500, userId: null, user: null, error: "Verified account identity unavailable." };
  }

  return {
    status: 200,
    userId: account.userId,
    user: { id: account.userId, ...account.profileIdentity },
  };
}
