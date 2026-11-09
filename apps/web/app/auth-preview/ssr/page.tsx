"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabaseSsrPreview } from "@/lib/supabaseSsrPreview";
import styles from "../page.module.css";

export default function SsrSessionPreviewPage() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [ownershipBusy, setOwnershipBusy] = useState(false);
  const [ownershipStatus, setOwnershipStatus] = useState<string | null>(null);
  const [favoritesBusy, setFavoritesBusy] = useState(false);
  const [favoritesStatus, setFavoritesStatus] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabaseSsrPreview.auth.getUser().then(({ data }) =>
      setEmail(data.user?.email ?? null),
    );
    const { data: subscription } = supabaseSsrPreview.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user.email ?? null);
        setServerStatus(null);
        setOwnershipStatus(null);
        setFavoritesStatus(null);
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setError("");
    const { error: signInError } = await supabaseSsrPreview.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth-preview/ssr`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (signInError) setError(signInError.message);
  }

  async function checkServerSession() {
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/auth-preview/ssr-session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Server session check failed.");
      const result = (await response.json()) as { authenticated?: boolean };
      setServerStatus(result.authenticated
        ? "PASS: Supabase Auth verified this cookie session on the server."
        : "No verified Supabase cookie session on the server.");
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "Session check failed.");
    } finally {
      setChecking(false);
    }
  }

  async function checkLinkedOwnership() {
    setOwnershipBusy(true);
    setOwnershipStatus(null);
    setError("");
    try {
      const response = await fetch("/api/auth-preview/ssr-account-data", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = (await response.json()) as {
        counts?: { playlists: number; projects: number };
        error?: string;
      };
      if (response.status === 401) {
        setOwnershipStatus("DENIED (401): No verified Supabase cookie session.");
      } else if (response.status === 403) {
        setOwnershipStatus("PASS (403): This unlinked account cannot access legacy account data.");
      } else if (response.ok && result.counts) {
        setOwnershipStatus(`PASS (200): Verified owner has ${result.counts.playlists} playlists and ${result.counts.projects} projects.`);
      } else {
        setOwnershipStatus(`CHECK FAILED (${response.status}): ${result.error ?? "Could not verify account ownership."}`);
      }
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "Ownership verification failed.");
    } finally {
      setOwnershipBusy(false);
    }
  }

  async function compareFavorites() {
    setFavoritesBusy(true);
    setFavoritesStatus(null);
    setError("");
    try {
      if (!clerkLoaded || !clerkUser) {
        setFavoritesStatus("Sign in with Clerk before comparing the two Favorites APIs.");
        return;
      }

      const [previewResponse, clerkResponse] = await Promise.all([
        fetch("/api/auth-preview/ssr-favorites", {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/favorites", {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);

      if (previewResponse.status === 401) {
        setFavoritesStatus("DENIED (401): No verified Supabase cookie session.");
        return;
      }
      if (previewResponse.status === 403) {
        setFavoritesStatus("PASS (403): Unlinked Supabase account cannot read Favorites.");
        return;
      }
      if (!previewResponse.ok || !clerkResponse.ok) {
        throw new Error(`Favorites check failed (Supabase ${previewResponse.status}, Clerk ${clerkResponse.status}).`);
      }

      const preview = (await previewResponse.json()) as {
        favorites?: { song_id: string }[];
      };
      const clerk = (await clerkResponse.json()) as {
        favorites?: { song_id: string }[];
      };
      if (!Array.isArray(preview.favorites) || !Array.isArray(clerk.favorites)) {
        throw new Error("Favorites responses did not contain the expected arrays.");
      }

      const fromSupabase = preview.favorites.map((favorite) => favorite.song_id).sort();
      const fromClerk = clerk.favorites.map((favorite) => favorite.song_id).sort();
      const matches = JSON.stringify(fromSupabase) === JSON.stringify(fromClerk);

      setFavoritesStatus(matches
        ? `PASS: Both verified sessions return the same ${fromSupabase.length} favorite song IDs.`
        : `MISMATCH: Supabase returned ${fromSupabase.length} favorites and Clerk returned ${fromClerk.length}. Check for deleted or unpublished songs.`);
    } catch (comparisonError) {
      setError(comparisonError instanceof Error
        ? comparisonError.message : "Favorites comparison failed.");
    } finally {
      setFavoritesBusy(false);
    }
  }

  async function signOut() {
    setError("");
    const { error: signOutError } = await supabaseSsrPreview.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else {
      setEmail(null);
      setServerStatus(null);
      setOwnershipStatus(null);
      setFavoritesStatus(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Supabase SSR session preview">
        <p className={styles.eyebrow}>AUDIOFLUME / ISOLATED SSR SESSION TEST</p>
        <h1 className={styles.title}>Cookie session test.</h1>
        <p className={styles.description}>
          This test uses a separate Supabase cookie session. It does not replace Clerk
          or grant access to your existing Audioflume data.
        </p>
        <p className={styles.sessionEmail}>
          {email ? `Supabase signed in: ${email}` : "No Supabase SSR preview session."}
        </p>
        {!email ? (
          <button type="button" className={styles.secondaryButton} onClick={() => void signIn()}>
            Continue with Google
          </button>
        ) : (
          <button type="button" className={styles.secondaryButton} onClick={() => void signOut()}>
            Sign out of SSR preview
          </button>
        )}
        <button type="button" className={styles.secondaryButton}
          onClick={() => void checkServerSession()} disabled={checking}>
          {checking ? "Checking server session…" : "Verify server cookie session"}
        </button>
        {serverStatus ? <p className={styles.success} role="status">{serverStatus}</p> : null}
        <button type="button" className={styles.secondaryButton}
          onClick={() => void checkLinkedOwnership()} disabled={ownershipBusy}>
          {ownershipBusy ? "Verifying linked account…" : "Test cookie-based account access"}
        </button>
        {ownershipStatus ? <p className={styles.success} role="status">{ownershipStatus}</p> : null}
        <button type="button" className={styles.secondaryButton}
          onClick={() => void compareFavorites()} disabled={favoritesBusy || !clerkLoaded}>
          {favoritesBusy ? "Comparing Favorites…" : "Compare Clerk and Supabase Favorites"}
        </button>
        {favoritesStatus ? <p className={styles.success} role="status">{favoritesStatus}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <a href="/auth-preview">Back to account-linking preview</a>
      </section>
    </main>
  );
}
