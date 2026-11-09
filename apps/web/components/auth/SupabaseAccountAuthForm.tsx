"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabaseAccountBrowser } from "@/lib/auth/supabaseAccountBrowser";
import styles from "@/app/auth-preview/page.module.css";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";
type Props = { initialMode: "sign-in" | "sign-up"; next: string };

export default function SupabaseAccountAuthForm({ initialMode, next }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  }

  const callbackUrl = (destination: string) =>
    `${window.location.origin}/auth/supabase/callback?next=${encodeURIComponent(destination)}`;

  async function checkLinkAndContinue() {
    const response = await fetch("/api/auth-preview/cutover-session", {
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
    try {
      if (mode === "forgot") {
        const { error: authError } = await supabaseAccountBrowser.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: callbackUrl("/sign-in?mode=reset"),
        });
        if (authError) throw authError;
        setNotice("If this email has an account, a password reset message will be sent.");
      } else if (mode === "reset") {
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

  const title = mode === "sign-up" ? "Create your account." :
    mode === "forgot" ? "Reset your password." :
    mode === "reset" ? "Choose a new password." : "Welcome back.";

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Audioflume account authentication">
        <p className={styles.eyebrow}>AUDIOFLUME / ACCOUNT</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>
          {mode === "forgot" ? "We'll send a password reset link to your email." :
            mode === "reset" ? "Enter a new password for your account." :
            "Continue with Google or your email and password."}
        </p>
        {(mode === "sign-in" || mode === "sign-up") ? (
          <>
            <button className={styles.secondaryButton} type="button" disabled={busy}
              onClick={() => void googleSignIn()}>Continue with Google</button>
            <p className={styles.divider}>or continue with email</p>
          </>
        ) : null}
        <form className={styles.form} onSubmit={(event) => void emailSubmit(event)}>
          {mode !== "reset" ? (
            <label className={styles.label}>Email
              <input className={styles.input} type="email" autoComplete="email" value={email}
                onChange={(event) => setEmail(event.target.value)} required />
            </label>
          ) : null}
          {mode !== "forgot" ? (
            <label className={styles.label}>{mode === "reset" ? "New password" : "Password"}
              <input className={styles.input} type="password"
                autoComplete={mode === "sign-up" || mode === "reset" ? "new-password" : "current-password"}
                value={password} onChange={(event) => setPassword(event.target.value)}
                minLength={6} required />
            </label>
          ) : null}
          <button className={styles.primaryButton} type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "sign-up" ? "Create account" :
              mode === "forgot" ? "Send reset email" : mode === "reset" ? "Save password" : "Sign in"}
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
