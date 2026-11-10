"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { profileFromVerifiedSupabaseUser, type VerifiedAccountProfileIdentity } from "@/lib/auth/verifiedSupabaseProfile";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  return provider === "supabase"
    ? <SupabaseAccountSessionProvider>{children}</SupabaseAccountSessionProvider>
    : <ClerkAccountSessionProvider>{children}</ClerkAccountSessionProvider>;
}

function ClerkAccountSessionProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const user = useMemo<AccountDisplayUser | null>(() => {
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
  }, [clerkUser]);
  const signOut = useCallback(async () => {
    await clerkSignOut();
  }, [clerkSignOut]);
  const value = useMemo<AccountSession>(() => {
    const userId = user?.id ?? null;
    return { provider: "clerk", isLoaded: clerkLoaded, userId, isSignedIn: clerkLoaded && Boolean(userId), user, signOut };
  }, [clerkLoaded, user, signOut]);

  return <AccountSessionContext.Provider value={value}>{children}</AccountSessionContext.Provider>;
}

function SupabaseAccountSessionProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<AccountDisplayUser | null>(null);
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let sessionVersion = 0;

    void supabaseAccountBrowser.auth.getUser().then(({ data, error }) => {
      // A late initial lookup must never restore a signed-out or replaced user.
      if (!active || sessionVersion !== 0) return;
      setSupabaseUser(error || !data.user
        ? null
        : { id: data.user.id, ...profileFromVerifiedSupabaseUser(data.user) });
      setSupabaseLoaded(true);
    }).catch(() => {
      if (!active || sessionVersion !== 0) return;
      setSupabaseUser(null);
      setSupabaseLoaded(true);
    });

    const { data: subscription } = supabaseAccountBrowser.auth.onAuthStateChange(
      (event, session) => {
        // Initial display identity comes from the independently verified lookup.
        if (!active || event === "INITIAL_SESSION") return;
        sessionVersion += 1;
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
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabaseAccountBrowser.auth.signOut();
    if (error) throw error;
  }, []);
  const value = useMemo<AccountSession>(() => {
    const userId = supabaseUser?.id ?? null;
    return { provider: "supabase", isLoaded: supabaseLoaded, userId, isSignedIn: supabaseLoaded && Boolean(userId), user: supabaseUser, signOut };
  }, [supabaseLoaded, supabaseUser, signOut]);

  return <AccountSessionContext.Provider value={value}>{children}</AccountSessionContext.Provider>;
}

export function useAccountSession() {
  const session = useContext(AccountSessionContext);
  if (!session) throw new Error("useAccountSession must be used inside AccountSessionProvider");
  return session;
}
