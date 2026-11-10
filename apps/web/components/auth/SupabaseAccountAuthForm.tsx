"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabaseAccountBrowser } from "@/lib/auth/supabaseAccountBrowser";
import styles from "./SupabaseAccountAuthForm.module.css";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";
type Props = { initialMode: "sign-in" | "sign-up"; next: string };

export default function SupabaseAccountAuthForm({ initialMode, next }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "reset") setMode("reset");
    if (params.get("auth_status") === "unlinked") {
      setError("Your Supabase identity is not linked to an existing Audioflume account. Complete account linking before continuing.");
    } else if (params.get("auth_status") === "failed") {
      setError("Authentication could not be completed. Please try again.");
    }
    const { data } = supabaseAccountBrowser.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function changeMode(value: Mode) {
    setMode(value);
    setError("");
    setNotice("");
    setPassword("");
    setEmailConfirmed(false);
  }

  const callbackUrl = (destination: string) =>
    `${window.location.origin}/auth/supabase/callback?next=${encodeURIComponent(destination)}`;

  async function checkLinkAndContinue() {
    const response = await fetch("/api/account/auth-session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 403) {
      throw new Error("This Supabase identity is not linked to an existing Audioflume account. Complete account linking before continuing.");
    }
    if (!response.ok) throw new Error("Account verification failed. Please sign in again.");
    window.location.assign(next);
  }

  async function googleSignIn() {
    setBusy(true);
    setError("");
    const { error: authError } = await supabaseAccountBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(next),
        queryParams: { prompt: "select_account" },
      },
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
    }
  }

  async function emailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    if ((mode === "sign-in" || mode === "sign-up") && !emailConfirmed) {
      setEmailConfirmed(true);
      setBusy(false);
      return;
    }
    try {
      if (mode === "forgot") {
        const { error: authError } = await supabaseAccountBrowser.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: callbackUrl("/sign-in?mode=reset"),
        });
        if (authError) throw authError;
        setNotice("If this email has an account, a password reset message will be sent.");
      } else if (mode === "reset") {
        // A recovery redirect alone is not authorization to change account credentials.
        // Require the server-verified Supabase session and its existing owner link.
        const verification = await fetch("/api/account/auth-session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!verification.ok) {
          throw new Error("Your account session could not be verified. Request a new password reset link.");
        }
        const { error: authError } = await supabaseAccountBrowser.auth.updateUser({ password });
        if (authError) throw authError;
        setPassword("");
        setNotice("Password updated. You may continue signing in.");
        setMode("sign-in");
      } else if (mode === "sign-up") {
        const { data, error: authError } = await supabaseAccountBrowser.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: callbackUrl(next) },
        });
        if (authError) throw authError;
        if (data.session) {
          await checkLinkAndContinue();
        } else {
          setNotice("Check your email to confirm your account. Existing Audioflume data requires a verified account link.");
        }
      } else {
        const { error: authError } = await supabaseAccountBrowser.auth.signInWithPassword({
          email: email.trim(), password,
        });
        if (authError) throw authError;
        await checkLinkAndContinue();
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "forgot" ? "Reset your password." :
    mode === "reset" ? "Choose a new password." : "Log in or sign up";
  const showPassword = mode === "reset" ||
    ((mode === "sign-in" || mode === "sign-up") && emailConfirmed);

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Audioflume account authentication">
        <h1 className={styles.title}>{title}</h1>
        {mode === "forgot" || mode === "reset" ? (
          <p className={styles.description}>
            {mode === "forgot" ? "We'll send a password reset link to your email."
              : "Enter a new password for your account."}
          </p>
        ) : null}
        {(mode === "sign-in" || mode === "sign-up") && !emailConfirmed ? (
          <>
            <button className={styles.secondaryButton} type="button" disabled={busy}
              onClick={() => void googleSignIn()}>
              <svg className={styles.googleLogo} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.24a4.48 4.48 0 0 1-1.95 2.94v2.44h3.15c1.85-1.7 2.91-4.2 2.91-7.2Z" />
                <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.44-2.32l-3.15-2.44c-.87.58-1.99.94-3.29.94a5.97 5.97 0 0 1-5.61-4.13H3.14v2.53A9.75 9.75 0 0 0 12 21.75Z" />
                <path fill="#FBBC05" d="M6.39 13.8A5.86 5.86 0 0 1 6.08 12c0-.63.11-1.23.31-1.8V7.67H3.14A9.72 9.72 0 0 0 2.25 12c0 1.57.38 3.04.89 4.33l3.25-2.53Z" />
                <path fill="#EA4335" d="M12 6.07c1.43 0 2.71.49 3.72 1.46l2.79-2.79A9.37 9.37 0 0 0 12 2.25a9.75 9.75 0 0 0-8.86 5.42l3.25 2.53A5.97 5.97 0 0 1 12 6.07Z" />
              </svg>
              Continue with Google
            </button>
            <div className={styles.divider}><span>or</span></div>
          </>
        ) : null}
        <form className={styles.form} onSubmit={(event) => void emailSubmit(event)}>
          {mode !== "reset" ? (
            <label className={styles.label}>Email
              <input className={styles.input} type="email" autoComplete="email" value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailConfirmed) setEmailConfirmed(false);
                }} readOnly={emailConfirmed} required />
            </label>
          ) : null}
          {showPassword ? (
            <label className={styles.label}>{mode === "reset" ? "New password" : "Password"}
              <input className={styles.input} type="password"
                autoComplete={mode === "sign-up" || mode === "reset" ? "new-password" : "current-password"}
                value={password} onChange={(event) => setPassword(event.target.value)}
                minLength={6} required autoFocus />
            </label>
          ) : null}
          <button className={styles.primaryButton} type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "forgot" ? "Send reset email" :
              mode === "reset" ? "Save password" :
              !emailConfirmed ? "Continue" :
              mode === "sign-up" ? "Create account" : "Sign in"}
          </button>
        </form>
        <div className={styles.links}>
          {mode !== "sign-in" ? (
            <button type="button" onClick={() => changeMode("sign-in")}>Sign in</button>
          ) : (
            <>
              <button type="button" onClick={() => changeMode("sign-up")}>Create an account</button>
              <button type="button" onClick={() => changeMode("forgot")}>Forgot password?</button>
            </>
          )}
        </div>
        {notice ? <p className={styles.success} role="status">{notice}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
