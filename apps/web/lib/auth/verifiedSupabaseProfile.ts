/**
 * Convert only display information from a user independently verified with
 * Supabase auth.getUser(). Never use raw_user_meta_data/user_metadata to
 * resolve the legacy account owner, grant roles or establish email identity.
 */
export type VerifiedAccountProfileIdentity = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string | null };
};

export function profileFromVerifiedSupabaseUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): VerifiedAccountProfileIdentity {
  const metadata = user.user_metadata ?? {};
  const display = (key: string) => {
    const value = metadata[key];
    return typeof value === "string" ? (value.trim() || null) : null;
  };

  const firstName = display("given_name") ?? display("first_name");
  const lastName = display("family_name") ?? display("last_name");

  return {
    firstName,
    lastName,
    fullName: display("full_name") ?? display("name")
      ?? ([firstName, lastName].filter(Boolean).join(" ") || null),
    username: null,
    imageUrl: display("avatar_url") ?? display("picture"),
    primaryEmailAddress: { emailAddress: user.email ?? null },
  };
}
