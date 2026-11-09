import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveVerifiedLegacyOwner } from "@/lib/auth-preview/resolveVerifiedLegacyOwner";
import { selectAccountAuthProvider } from "./selectAccountAuthProvider";

export type VerifiedAccountProfileIdentity = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string | null };
};

type AccountOwner =
  | { userId: string; status: 200; error?: never; profileIdentity?: VerifiedAccountProfileIdentity }
  | { userId: null; status: 401 | 403 | 500; error: string };

/**
 * Migration-stage server authorization switch. Default is Clerk.
 * Supabase is opt-in with an explicit server-side environment variable;
 * there is never an automatic provider fallback or client-selected owner.
 */
export async function resolveAccountOwner(): Promise<AccountOwner> {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "clerk") {
    const { userId } = await auth();
    return userId
      ? { userId, status: 200 }
      : { userId: null, status: 401, error: "Unauthorized" };
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: { name: "sb-audioflume-auth" },
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    let verifiedProfile: VerifiedAccountProfileIdentity | null = null;
    const ownership = await resolveVerifiedLegacyOwner(
      async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;

        // Metadata supplies display fields only, never identity or authorization.
        // The verified user.id and auth_identity_links control ownership.
        const metadata = user.user_metadata ?? {};
        const display = (key: string) =>
          typeof metadata[key] === "string" && metadata[key].trim()
            ? (metadata[key] as string).trim()
            : null;
        const firstName = display("given_name") ?? display("first_name");
        const lastName = display("family_name") ?? display("last_name");
        verifiedProfile = {
          firstName,
          lastName,
          fullName: display("full_name") ?? display("name")
            ?? ([firstName, lastName].filter(Boolean).join(" ") || null),
          username: null,
          imageUrl: display("avatar_url") ?? display("picture"),
          primaryEmailAddress: { emailAddress: user.email ?? null },
        };
        return user.id;
      },
      async (supabaseUserId) => {
        const { data, error } = await supabaseServer
          .from("auth_identity_links")
          .select("clerk_user_id")
          .eq("supabase_user_id", supabaseUserId)
          .maybeSingle();

        if (error) throw error;
        return data?.clerk_user_id ?? null;
      },
    );

    if (ownership.status !== 200) {
      return { userId: null, status: ownership.status, error: ownership.error };
    }

    if (!verifiedProfile) {
      return { userId: null, status: 500, error: "Verified profile unavailable." };
    }

    return { userId: ownership.legacyUserId, status: 200, profileIdentity: verifiedProfile };
  } catch (error) {
    console.error("Supabase account authorization failed:", error);
    return { userId: null, status: 500, error: "Account authorization is temporarily unavailable." };
  }
}
