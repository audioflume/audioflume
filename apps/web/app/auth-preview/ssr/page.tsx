"use client";

import { useEffect, useState } from "react";
import { supabaseSsrPreview } from "@/lib/supabaseSsrPreview";
import styles from "../page.module.css";

export default function SsrSessionPreviewPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabaseSsrPreview.auth.getUser().then(({ data }) =>
      setEmail(data.user?.email ?? null),
    );
    const { data: subscription } = supabaseSsrPreview.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user.email ?? null);
        setServerStatus(null);
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

  async function signOut() {
    setError("");
    const { error: signOutError } = await supabaseSsrPreview.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else {
      setEmail(null);
      setServerStatus(null);
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
        {error ? <p role="alert">{error}</p> : null}
        <a href="/auth-preview">Back to account-linking preview</a>
      </section>
    </main>
  );
}
