import "server-only";

import { supabaseServer } from "@/lib/supabaseServer";

/** Only Auth Admin API records determine whether an invite recipient exists. */
export async function findSupabaseArtistInviteRecipient(email: string) {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabaseServer.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const existing = data.users.find((user) => user.email?.trim().toLowerCase() === normalized);
    if (existing) return existing;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Unable to complete the account lookup.");
}

/**
 * New recipients receive a Supabase invitation. Existing registered users
 * receive a pending in-app invitation without a duplicate Auth user.
 * Never grant access based only on the supplied email.
 */
export async function sendSupabaseArtistInvitation(email: string, redirectTo: string): Promise<boolean> {
  const existing = await findSupabaseArtistInviteRecipient(email);
  if (existing) return false;

  const { error } = await supabaseServer.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) throw error;
  return true;
}
