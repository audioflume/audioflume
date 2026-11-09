"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { profileFromVerifiedSupabaseUser, type VerifiedAccountProfileIdentity } from "@/lib/auth/verifiedSupabaseProfile";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseAccountBrowser } from "@/lib/auth/supabaseAccountBrowser";

type AccountProvider = "clerk" | "supabase";
type AccountDisplayUser = VerifiedAccountProfileIdentity & { id: string };

type AccountSession = {
  isLoaded: boolean;
  userId: string | null;
  isSignedIn: boolean;
  provider: AccountProvider;
  user: AccountDisplayUser | null;
  signOut: () => Promise<void>;
};

const AccountSessionContext = createContext<AccountSession | null>(null);

/**
 * Website-only migration session. The server selects the provider, not a
 * browser-controlled query/header. In Supabase mode userId is the Supabase
 * auth user ID for client cache partitioning ONLY. API authorization still
 * resolves the verified legacy owner independently on the server.
 */
export function AccountSessionProvider({
  provider,
  children,
}: {
  provider: AccountProvider;
  children: ReactNode;
}) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [supabaseUser, setSupabaseUser] = useState<AccountDisplayUser | null>(null);
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);

  useEffect(() => {
    if (provider !== "supabase") return;

    let active = true;
    setSupabaseLoaded(false);

    void supabaseAccountBrowser.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setSupabaseUser(error || !data.user
        ? null
        : { id: data.user.id, ...profileFromVerifiedSupabaseUser(data.user) });
      setSupabaseLoaded(true);
    }).catch(() => {
      if (!active) return;
      setSupabaseUser(null);
      setSupabaseLoaded(true);
    });

    const { data: subscription } = supabaseAccountBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setSupabaseUser(session?.user
          ? { id: session.user.id, ...profileFromVerifiedSupabaseUser(session.user) }
          : null);
        setSupabaseLoaded(true);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [provider]);

  const user = useMemo<AccountDisplayUser | null>(() => {
    if (provider === "supabase") return supabaseUser;
    if (!clerkUser) return null;
    return {
      id: clerkUser.id,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      fullName: clerkUser.fullName,
      username: clerkUser.username,
      imageUrl: clerkUser.imageUrl,
      primaryEmailAddress: {
        emailAddress: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      },
    };
  }, [provider, supabaseUser, clerkUser]);

  const signOut = async () => {
    if (provider === "supabase") {
      const { error } = await supabaseAccountBrowser.auth.signOut();
      if (error) throw error;
      return;
    }
    await clerkSignOut();
  };

  const value = useMemo<AccountSession>(() => {
    const isLoaded = provider === "supabase" ? supabaseLoaded : clerkLoaded;
    const userId = user?.id ?? null;
    return { provider, isLoaded, userId, isSignedIn: isLoaded && Boolean(userId), user, signOut };
  }, [provider, supabaseLoaded, clerkLoaded, user, signOut]);

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  );
}

export function useAccountSession() {
  const session = useContext(AccountSessionContext);
  if (!session) throw new Error("useAccountSession must be used inside AccountSessionProvider");
  return session;
}
