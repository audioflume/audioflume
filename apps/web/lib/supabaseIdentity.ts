import "server-only";

import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Resolve a Supabase Auth bearer token to the existing application ownership key.
 * No mapping is created here. Only a verified Supabase session can read its link,
 * and this function must only be used by server-side authorization code.
 */
export async function getLinkedLegacyUserId(accessToken: string): Promise<string | null> {
  if (!accessToken) return null;

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(accessToken);
  if (authError || !user) return null;

  const { data: link, error: lookupError } = await supabaseServer
    .from("auth_identity_links")
    .select("clerk_user_id")
    .eq("supabase_user_id", user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  return link?.clerk_user_id ?? null;
}
