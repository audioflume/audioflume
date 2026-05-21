"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { SecurityEvent } from "../accountTypes";
import { Button, Card, CardTitle, Info, Row } from "../AccountUI";
import { formatDate } from "../accountUtils";

export default function SecuritySection() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const email = user?.primaryEmailAddress?.emailAddress || "Primary email";

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        const response = await fetch("/api/account/security-events");
        const payload = await response.json();
        if (!active) return;
        setEvents(Array.isArray(payload.events) ? payload.events : []);
      } catch (error) {
        console.error(error);
        if (!active) return;
        setEvents([]);
      }
    }

    loadEvents();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardTitle title="Sign-in security" description="Secure identity controls are handled by Clerk." />
          <Row title="Password" description="Change the password used to access your Filmwave account through Clerk.">
            <Button subtle onClick={() => openUserProfile()}>
              Manage password
            </Button>
          </Row>
          <Row title="Two-factor authentication" description="Add an extra layer of protection from your Clerk user profile.">
            <Button subtle onClick={() => openUserProfile()}>
              Manage 2FA
            </Button>
          </Row>
          <Row title="Backup email" description="Use Clerk to manage recovery and verified email addresses.">
            <Button subtle onClick={() => openUserProfile()}>
              Manage emails
            </Button>
          </Row>
        </Card>

        <Card>
          <CardTitle title="Account access" description="Current verified contact and identity status from Clerk." />
          <div className="grid gap-3 p-4">
            <Info label="Primary email" value={email} />
            <Info label="Email status" value={user?.primaryEmailAddress?.verification?.status || "Unknown"} />
            <Info label="User ID" value={user?.id || "Unavailable"} />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle title="Recent security events" description="Lightweight Filmwave-side audit trail. Clerk remains the source of truth for auth sessions." />
        <div className="divide-y divide-[var(--border)]">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{event.event_type}</div>
                  {event.description ? <div className="mt-1 text-xs text-[var(--text-muted)]">{event.description}</div> : null}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {event.location_label || "Filmwave"} · {formatDate(event.created_at)}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">No Filmwave security events yet.</div>
          )}
        </div>
      </Card>
    </>
  );
}
