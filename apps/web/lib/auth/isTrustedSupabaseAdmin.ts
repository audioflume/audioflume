/**
 * Supabase admin permissions must originate in trusted Auth app_metadata
 * retrieved using the service-role Admin API, not in user_metadata, email,
 * client claims or a concurrent Clerk browser session.
 *
 * The explicit second flag allows rollout of linked accounts before
 * enabling Supabase admin actions.
 */
export function isTrustedSupabaseAdmin(
  accountProvider: string | undefined,
  enabled: string | undefined,
  appMetadata: unknown,
): boolean {
  if (accountProvider !== "supabase" || enabled !== "true") return false;
  if (!appMetadata || typeof appMetadata !== "object" || Array.isArray(appMetadata)) return false;
  return (appMetadata as Record<string, unknown>).role === "admin";
}
