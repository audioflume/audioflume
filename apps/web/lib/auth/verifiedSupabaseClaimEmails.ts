import { normalizeArtistClaimEmail } from "@/lib/artistClaims";

/**
 * Email-based artist claims are allowed only for a currently confirmed
 * email on the exact server-fetched Supabase Auth subject. User metadata,
 * browser claims, and an unverified email string are never sufficient.
 */
export function verifiedSupabaseClaimEmails(
  expectedSubject: string,
  user: {
    id?: string | null;
    email?: string | null;
    email_confirmed_at?: string | null;
  } | null | undefined,
): string[] {
  if (!expectedSubject || !user || user.id !== expectedSubject || !user.email_confirmed_at) {
    return [];
  }

  const email = normalizeArtistClaimEmail(user.email);
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? [email] : [];
}
