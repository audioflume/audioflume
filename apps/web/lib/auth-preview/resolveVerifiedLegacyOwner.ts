/**
 * Pure decision boundary: only a server-verified Supabase identity may resolve
 * a legacy owner. No browser-provided legacy ID or email is accepted.
 * Kept separate from framework and database code for automated tests.
 */
export type LegacyOwnerResolution =
  | { status: 401; error: string }
  | { status: 403; error: string }
  | { status: 200; legacyUserId: string };

export async function resolveVerifiedLegacyOwner(
  verifiedUserId: () => Promise<string | null>,
  lookupLegacyOwner: (supabaseUserId: string) => Promise<string | null>,
): Promise<LegacyOwnerResolution> {
  const userId = await verifiedUserId();
  if (!userId) {
    return { status: 401, error: "A verified Supabase cookie session is required." };
  }

  const legacyUserId = await lookupLegacyOwner(userId);
  if (!legacyUserId) {
    return { status: 403, error: "This Supabase identity has no verified Audioflume owner link." };
  }

  return { status: 200, legacyUserId };
}
