"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ArtistInvitesContextValue = {
  pendingInviteCount: number;
  refreshPendingInvites: () => Promise<void>;
};

const ArtistInvitesContext = createContext<ArtistInvitesContextValue | null>(null);

export function ArtistInvitesProvider({
  initialPendingCount,
  children,
}: {
  initialPendingCount: number;
  children: ReactNode;
}) {
  const [pendingInviteCount, setPendingInviteCount] = useState(initialPendingCount);

  const refreshPendingInvites = useCallback(async () => {
    try {
      const response = await fetch("/api/artists/claim", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as {
        invitations?: unknown[];
      };

      if (response.ok) {
        setPendingInviteCount(
          Array.isArray(body.invitations) ? body.invitations.length : 0,
        );
      }
    } catch {
      // Keep the last known count if a background refresh fails.
    }
  }, []);

  useEffect(() => {
    window.addEventListener("focus", refreshPendingInvites);

    return () => {
      window.removeEventListener("focus", refreshPendingInvites);
    };
  }, [refreshPendingInvites]);

  const value = useMemo(
    () => ({ pendingInviteCount, refreshPendingInvites }),
    [pendingInviteCount, refreshPendingInvites],
  );

  return (
    <ArtistInvitesContext.Provider value={value}>
      {children}
    </ArtistInvitesContext.Provider>
  );
}

export function useArtistInvites() {
  const context = useContext(ArtistInvitesContext);

  if (!context) {
    throw new Error("useArtistInvites must be used within ArtistInvitesProvider");
  }

  return context;
}
