"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";

type LegacyDataCounts = {
  playlists: number;
  favorites: number;
  projects: number;
  artistMemberships: number;
};

const titleByMode: Record<Mode, string> = {
  "sign-in": "Welcome back.",
  "sign-up": "Create your account.",
  forgot: "Reset your password.",
  reset: "Choose a new password.",
};

export default function SupabaseAuthPreviewPage() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [linked, setLinked] = useState(false);
  const [linkStatusLoaded, setLinkStatusLoaded] = useState(false);
  const linkStatusRequestId = useRef(0);
  const [linkBusy, setLinkBusy] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [isolationBusy, setIsolationBusy] = useState(false);
  const [isolationResult, setIsolationResult] = useState("");
  const [legacyCounts, setLegacyCounts] = useState<LegacyDataCounts | null>(null);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "reset") setMode("reset");

    void supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        linkStatusRequestId.current += 1;
        setLinked(false);
        setLinkStatusLoaded(false);
        setLegacyCounts(null);
        setIsolationResult("");
      }
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    const requestId = ++linkStatusRequestId.current;
    setLinked(false);
    setLinkStatusLoaded(false);
    setLegacyCounts(null);
    setIsolationResult("");
    if (!user?.id) return;

    async function loadLinkStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.id !== user?.id) return;

        const response = await fetch("/api/auth-preview/link", {
          headers: { "X-Audioflume-Supabase-Token": session.access_token },
          cache: "no-store",
        });
        if (!response.ok) return;

        const result = (await response.json()) as { linked?: boolean };
        if (active && requestId === linkStatusRequestId.current) {
          setLinked(result.linked === true);
          setLinkStatusLoaded(true);
        }
      } catch {
        // A failed status check never grants access or creates a link.
      }
    }

    void loadLinkStatus();
    return () => { active = false; };
  }, [user?.id]);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
  }

  async function socialSignIn() {
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth-preview`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
    }
  }

  async function emailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth-preview?mode=reset`,
        });
        if (authError) throw authError;
        setNotice("If an account exists for this address, you'll receive a password reset email.");
      } else if (mode === "reset") {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setNotice("Password updated. Your Supabase session is now active.");
        setMode("sign-in");
        setPassword("");
      } else if (mode === "sign-up") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth-preview` },
        });
        if (authError) throw authError;
        setNotice(data.session
          ? "Supabase sign-up succeeded in preview. Your existing Audioflume account is not linked yet."
          : "Check your email to verify your new Supabase account.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        setNotice("Supabase sign-in succeeded in preview. Your existing Audioflume account is not linked yet.");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not complete authentication.");
    } finally {
      setBusy(false);
    }
  }

  async function linkExistingAccount() {
    linkStatusRequestId.current += 1;
    setLinkBusy(true);
    setError("");
    setNotice("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) {
        throw new Error("Your Supabase session has expired. Sign in again.");
      }

      const response = await fetch("/api/auth-preview/link", {
        method: "POST",
        headers: { "X-Audioflume-Supabase-Token": token },
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = (await response.json()) as {
        error?: string;
        linked?: boolean;
        alreadyLinked?: boolean;
      };

      if (!response.ok || !result.linked) {
        throw new Error(result.error ?? "Could not link these accounts.");
      }

      setLinked(true);
      setLinkStatusLoaded(true);
      setNotice(result.alreadyLinked
        ? "These accounts are already linked. Existing Audioflume data is unchanged."
        : "Accounts linked successfully. Existing Audioflume data remains under your original account.");
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not link these accounts.");
    } finally {
      setLinkBusy(false);
    }
  }

  async function verifyLinkedData() {
    setVerificationBusy(true);
    setError("");
    setLegacyCounts(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || session.user.id !== user?.id) {
        throw new Error("Your Supabase session has expired. Sign in again.");
      }

      const response = await fetch("/api/auth-preview/account-data", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = (await response.json()) as {
        counts?: LegacyDataCounts;
        error?: string;
      };
      if (!response.ok || !result.counts) {
        throw new Error(result.error ?? "Could not verify existing account data.");
      }
      setLegacyCounts(result.counts);
    } catch (verificationError) {
      setError(verificationError instanceof Error
        ? verificationError.message
        : "Could not verify existing account data.");
    } finally {
      setVerificationBusy(false);
    }
  }

  async function checkAccountIsolation() {
    setIsolationBusy(true);
    setIsolationResult("");
    setError("");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || session.user.id !== user?.id) {
        throw new Error("Sign in to Supabase again before running this check.");
      }

      // First verify that a request without Supabase credentials is denied.
      const anonymousResponse = await fetch("/api/auth-preview/account-data", {
        cache: "no-store",
        credentials: "omit",
      });
      if (anonymousResponse.status !== 401) {
        setIsolationResult("FAIL: The account-data endpoint did not reject a request without a Supabase token.");
        return;
      }

      const response = await fetch("/api/auth-preview/account-data", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (linked && response.status === 200) {
        setIsolationResult("PASS: The linked account can read its own record counts; requests without a token are denied.");
      } else if (!linked && response.status === 403) {
        setIsolationResult("PASS: This unlinked Google account was denied access to existing Audioflume data (403).");
      } else {
        setIsolationResult(`CHECK FAILED: Received HTTP ${response.status} when ${linked ? "200" : "403"} was expected. Do not continue the migration until this is investigated.`);
      }
    } catch (isolationError) {
      setError(isolationError instanceof Error ? isolationError.message : "Access isolation check failed.");
    } finally {
      setIsolationBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else {
      setUser(null);
      setNotice("Signed out of the Supabase preview session.");
    }
    setBusy(false);
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Supabase authentication preview">
        <p className={styles.eyebrow}>AUDIOFLUME / AUTHENTICATION PREVIEW</p>
        <h1 className={styles.title}>{titleByMode[mode]}</h1>
        <p className={styles.description}>
          {mode === "sign-up" ? "Sign up with a social account or your email address." :
            mode === "forgot" ? "We'll email you a link to reset your password." :
            mode === "reset" ? "Enter the new password for your account." :
            "Continue with a social account or your email and password."}
        </p>

        <div className={styles.notice} role="note">
          This is an isolated Supabase Auth preview. It does not grant access to your existing
          Clerk-owned Audioflume data, artist accounts, or desktop sync.
        </div>

        {user && mode !== "reset" ? (
          <div className={styles.session}>
            <p className={styles.sessionLabel}>SUPABASE SESSION ACTIVE</p>
            <p className={styles.sessionEmail}>{user.email ?? "Authenticated user"}</p>
            {clerkLoaded && !linked ? (
              clerkUser ? (
                <button className={styles.secondaryButton} type="button"
                  onClick={() => void linkExistingAccount()} disabled={busy || linkBusy}>
                  {linkBusy ? "Verifying accounts…" : "Link to my existing Audioflume account"}
                </button>
              ) : (
                <a className={styles.secondaryButton} href="/sign-in?redirect_url=%2Fauth-preview">
                  Sign in to your existing Audioflume account to link it
                </a>
              )
            ) : null}
            {linked ? (
              <>
                <p className={styles.success} role="status">Your Clerk and Supabase identities are linked.</p>
                <button className={styles.secondaryButton} type="button"
                  onClick={() => void verifyLinkedData()} disabled={busy || verificationBusy}>
                  {verificationBusy ? "Checking existing data…" : "Verify my existing account data"}
                </button>
                {legacyCounts ? (
                  <p className={styles.success} role="status">
                    Existing account: {legacyCounts.playlists} playlists, {legacyCounts.favorites} favorites,{" "}
                    {legacyCounts.projects} projects, {legacyCounts.artistMemberships} artist memberships.
                    No records were changed.
                  </p>
                ) : null}
              </>
            ) : null}
            <button className={styles.secondaryButton} type="button"
              onClick={() => void checkAccountIsolation()} disabled={busy || isolationBusy || linkBusy || !linkStatusLoaded}>
              {isolationBusy ? "Checking account isolation…" : !linkStatusLoaded ? "Checking link status…" : "Test account access isolation"}
            </button>
            {isolationResult ? <p className={styles.success} role="status">{isolationResult}</p> : null}
            <button className={styles.secondaryButton} type="button" onClick={signOut} disabled={busy}>
              Sign out of preview
            </button>
          </div>
        ) : (
          <>
            {mode === "sign-in" || mode === "sign-up" ? (
              <>
                <div className={styles.socials}>
                  <button className={styles.secondaryButton} type="button" disabled={busy}
                    onClick={() => void socialSignIn()}>
                    Continue with Google
                  </button>
                </div>
                <p className={styles.divider}>or continue with email</p>
              </>
            ) : null}
            <form onSubmit={(event) => void emailSubmit(event)} className={styles.form}>
              {mode !== "reset" ? (
                <label className={styles.label}>
                  Email address
                  <input type="email" autoComplete="email" required value={email}
                    onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"
                    className={styles.input} disabled={busy} />
                </label>
              ) : null}
              {mode !== "forgot" ? (
                <label className={styles.label}>
                  {mode === "reset" ? "New password" : "Password"}
                  <input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)}
                    className={styles.input} disabled={busy} />
                </label>
              ) : null}
              <button className={styles.primaryButton} type="submit" disabled={busy}>
                {busy ? "Working…" : mode === "sign-up" ? "Create account" :
                  mode === "forgot" ? "Send reset link" :
                  mode === "reset" ? "Update password" : "Sign in"}
              </button>
            </form>
            <div className={styles.links}>
              {mode === "sign-in" ? (
                <>
                  <button type="button" onClick={() => changeMode("forgot")}>Forgot password?</button>
                  <button type="button" onClick={() => changeMode("sign-up")}>Create an account</button>
                </>
              ) : <button type="button" onClick={() => changeMode("sign-in")}>Back to sign in</button>}
            </div>
          </>
        )}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {notice ? <p className={styles.success} role="status">{notice}</p> : null}
      </section>
    </main>
  );
}
