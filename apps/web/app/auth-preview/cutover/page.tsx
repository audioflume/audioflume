"use client";

import { useEffect, useState } from "react";
import { supabaseAccountBrowser } from "@/lib/auth/supabaseAccountBrowser";
import styles from "../page.module.css";

type CutoverCheck = {
  authorized?: boolean;
  accountApiProvider?: "clerk" | "supabase";
  error?: string;
};

export default function SupabaseAccountCookieCutoverPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");
  const [apiStatus, setApiStatus] = useState("");
  const [apiProvider, setApiProvider] = useState<"clerk" | "supabase" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabaseAccountBrowser.auth.getUser().then(({ data }) =>
      setEmail(data.user?.email ?? null),
    ).catch(() => setEmail(null));

    const { data } = supabaseAccountBrowser.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user.email ?? null);
        setStatus("");
        setApiStatus("");
        setApiProvider(null);
      },
    );
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setError("");
    const { error: authError } = await supabaseAccountBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth-preview/cutover`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (authError) setError(authError.message);
  }

  async function signOut() {
    setError("");
    const { error: authError } = await supabaseAccountBrowser.auth.signOut();
    if (authError) setError(authError.message);
    else {
      setEmail(null);
      setStatus("");
      setApiStatus("");
      setApiProvider(null);
    }
  }

  async function checkCookie() {
    setChecking(true);
    setError("");
    setStatus("");
    setApiStatus("");
    try {
      const response = await fetch("/api/auth-preview/cutover-session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json() as CutoverCheck;
      setApiProvider(data.accountApiProvider ?? null);
      if (response.ok && data.authorized) {
        setStatus("PASS (200): Verified Supabase account cookie maps to an existing Audioflume owner.");
      } else if (response.status === 401) {
        setStatus("DENIED (401): No verified Supabase account cookie.");
      } else if (response.status === 403) {
        setStatus("DENIED (403): Verified identity is not linked to a legacy Audioflume owner.");
      } else {
        setStatus(`CHECK FAILED (${response.status}): ${data.error ?? "Unknown error"}`);
      }
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "Verification request failed.");
    } finally {
      setChecking(false);
    }
  }

  async function checkMigratedApis() {
    if (apiProvider !== "supabase") return;
    setChecking(true);
    setError("");
    setApiStatus("");
    try {
      const endpoints = ["/api/favorites", "/api/playlists", "/api/projects"];
      const responses = await Promise.all(endpoints.map((path) =>
        fetch(path, { credentials: "same-origin", cache: "no-store" }),
      ));
      if (responses.some((response) => !response.ok)) {
        setApiStatus(`CHECK FAILED: HTTP statuses ${responses.map((response) => response.status).join(", ")}.`);
        return;
      }
      const [favorites, playlists, projects] = await Promise.all(
        responses.map((response) => response.json()),
      );
      if (!Array.isArray(favorites.favorites) || !Array.isArray(playlists) || !Array.isArray(projects)) {
        throw new Error("Account APIs did not return their expected response shapes.");
      }
      setApiStatus(`PASS: ${favorites.favorites.length} favorites, ${playlists.length} playlists, ${projects.length} projects from migrated account APIs.`);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "API check failed.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Future Supabase account cookie test">
        <p className={styles.eyebrow}>AUDIOFLUME / ACCOUNT AUTH CUTOVER TEST</p>
        <h1 className={styles.title}>Account session test.</h1>
        <p className={styles.description}>
          This test uses the future website account cookie. Clerk remains active
          unless the server explicitly switches account APIs. No data is changed.
        </p>
        <p className={styles.sessionEmail}>
          {email ? `Supabase signed in: ${email}` : "No Supabase account cookie session."}
        </p>
        {!email ? (
          <button className={styles.secondaryButton} type="button" onClick={() => void signIn()}>
            Continue with Google
          </button>
        ) : (
          <button className={styles.secondaryButton} type="button" onClick={() => void signOut()}>
            Sign out of account test
          </button>
        )}
        <button className={styles.secondaryButton} type="button" disabled={checking}
          onClick={() => void checkCookie()}>
          {checking ? "Checking…" : "Verify account cookie and owner"}
        </button>
        {status ? <p className={styles.success} role="status">{status}</p> : null}
        {apiProvider ? (
          <p className={styles.description}>
            Account API provider: {apiProvider === "supabase" ? "Supabase (server-enabled)" : "Clerk (default)"}
          </p>
        ) : null}
        {apiProvider === "supabase" && status.startsWith("PASS") ? (
          <button className={styles.secondaryButton} type="button" disabled={checking}
            onClick={() => void checkMigratedApis()}>
            Verify migrated account APIs
          </button>
        ) : null}
        {apiStatus ? <p className={styles.success} role="status">{apiStatus}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
