import "server-only";

import { getProfileSeed } from "@/lib/account";
import { supabaseServer } from "@/lib/supabaseServer";
import { profileFromVerifiedSupabaseUser } from "./verifiedSupabaseProfile";

/**
 * Give a verified new Supabase identity its own legacy-schema owner key.
 * Never claim an existing Clerk profile by matching an email address.
 * Existing one-to-one links are always preserved.
 */
export async function provisionSupabaseAccountOwner(supabaseUserId: string): Promise<string | null> {
  const { data: linked, error: lookupError } = await supabaseServer
    .from("auth_identity_links")
    .select("clerk_user_id")
    .eq("supabase_user_id", supabaseUserId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (linked?.clerk_user_id) return linked.clerk_user_id;

  const { data, error } = await supabaseServer.auth.admin.getUserById(supabaseUserId);
  const user = data.user;
  if (error || !user || user.id !== supabaseUserId || !user.email || !user.email_confirmed_at) {
    return null;
  }

  const ownerId = `supabase_${supabaseUserId}`;
  const profile = profileFromVerifiedSupabaseUser(user);
  const { error: profileError } = await supabaseServer
    .from("user_profiles")
    .upsert(getProfileSeed(ownerId, { id: ownerId, ...profile }), {
      onConflict: "clerk_user_id",
      ignoreDuplicates: true,
    });
  if (profileError) throw profileError;

  const { error: linkError } = await supabaseServer.from("auth_identity_links").insert({
    supabase_user_id: supabaseUserId,
    clerk_user_id: ownerId,
  });
  if (linkError) {
    // Concurrent verified requests may race; only accept the link for this subject.
    const { data: winner, error: winnerError } = await supabaseServer
      .from("auth_identity_links")
      .select("clerk_user_id")
      .eq("supabase_user_id", supabaseUserId)
      .maybeSingle();
    if (winnerError) throw winnerError;
    if (winner?.clerk_user_id === ownerId) return ownerId;
    if (winner?.clerk_user_id) return winner.clerk_user_id;
    throw linkError;
  }

  return ownerId;
}
