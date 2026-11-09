"use client";

import { useState } from "react";
import { useAccountSession } from "@/context/AccountSessionContext";
import { supabaseAccountBrowser } from "@/lib/auth/supabaseAccountBrowser";
import { Button, Card, CardTitle, Feedback, Info, Row } from "../AccountUI";

export default function SupabaseSecuritySection() {
  const { user, isLoaded } = useAccountSession();
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  async function sendPasswordReset() {
    if (!email || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const redirectTo = `${window.location.origin}/auth/supabase/callback?next=${encodeURIComponent("/sign-in?mode=reset")}`;
      const { error } = await supabaseAccountBrowser.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setFeedback({ tone: "success", text: "If this account supports password sign-in, a reset email will be sent." });
    } catch {
      setFeedback({ tone: "error", text: "We couldn't request a password reset. Please try again later." });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardTitle title="Sign-in security" />
          <Row title="Password" description="Request a secure password reset email for your Supabase sign-in.">
            <Button subtle disabled={!isLoaded || !email || sending} onClick={() => void sendPasswordReset()}>
              {sending ? "Sending..." : "Reset password"}
            </Button>
          </Row>
          <Row title="Two-factor authentication" description="Two-factor controls are not yet available for Supabase accounts on Audioflume.">
            <span className="text-xs text-[var(--text-muted)]">Not available yet</span>
          </Row>
          <Row title="Backup email" description="Recovery email management is not yet available for Supabase accounts on Audioflume.">
            <span className="text-xs text-[var(--text-muted)]">Not available yet</span>
          </Row>
          {feedback ? (
            <div className="px-5 pb-4" role={feedback.tone === "error" ? "alert" : "status"}>
              <Feedback tone={feedback.tone} message={feedback.text} />
            </div>
          ) : null}
        </Card>
        <Card>
          <CardTitle title="Account access" />
          <div className="grid gap-3 p-4">
            <Info label="Primary email" value={email ?? "Unavailable"} />
            <Info label="Email status" value={email ? "Verified session" : "Unavailable"} />
            <Info label="User ID" value={user?.id ?? "Unavailable"} />
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <CardTitle title="Recent security events" />
        <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
          Supabase account security events are not yet available in this view.
        </div>
      </Card>
    </>
  );
}
