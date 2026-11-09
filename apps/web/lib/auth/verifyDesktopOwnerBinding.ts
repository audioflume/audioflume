/**
 * Check a signed desktop bearer against the CURRENT one-to-one Supabase link.
 * A deleted/reassigned link or lookup failure must revoke access immediately.
 */
export async function verifyDesktopOwnerBinding(
  legacyOwnerId: string,
  supabaseUserId: string,
  lookup: (supabaseUserId: string) => Promise<string | null>,
): Promise<string | null> {
  if (!legacyOwnerId || !supabaseUserId) return null;

  try {
    const linkedOwnerId = await lookup(supabaseUserId);
    return linkedOwnerId === legacyOwnerId ? legacyOwnerId : null;
  } catch {
    return null;
  }
}
