"use client";

import { useUser } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseAccountBrowser } from "@/lib/auth/supabaseAccountBrowser";

type AccountProvider = "clerk" | "supabase";
type AccountSession = {
  isLoaded: boolean;
  userId: string | null;
  isSignedIn: boolean;
  provider: AccountProvider;
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
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);

  useEffect(() => {
    if (provider !== "supabase") return;

    let active = true;
    setSupabaseLoaded(false);

    void supabaseAccountBrowser.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setSupabaseUserId(error ? null : (data.user?.id ?? null));
      setSupabaseLoaded(true);
    }).catch(() => {
      if (!active) return;
      setSupabaseUserId(null);
      setSupabaseLoaded(true);
    });

    const { data: subscription } = supabaseAccountBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setSupabaseUserId(session?.user.id ?? null);
        setSupabaseLoaded(true);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [provider]);

  const value = useMemo<AccountSession>(() => {
    const isLoaded = provider === "supabase" ? supabaseLoaded : clerkLoaded;
    const userId = provider === "supabase" ? supabaseUserId : (clerkUser?.id ?? null);
    return { provider, isLoaded, userId, isSignedIn: isLoaded && Boolean(userId) };
  }, [provider, supabaseLoaded, clerkLoaded, supabaseUserId, clerkUser?.id]);

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
