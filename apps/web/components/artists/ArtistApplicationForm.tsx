"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  CardTitle,
  Feedback,
  Info,
  Input,
} from "@/components/account/AccountUI";

type ArtistApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

type ArtistApplication = {
  id: string;
  name: string;
  slug: string;
  status: ArtistApplicationStatus;
  location: string | null;
  website_url: string | null;
  instagram_url: string | null;
  bio: string | null;
  created_at: string;
};

type ApplicationResponse = {
  applications?: ArtistApplication[];
  application?: ArtistApplication;
  error?: string;
};

type ApplicationForm = {
  name: string;
  location: string;
  website_url: string;
  instagram_url: string;
  bio: string;
};

const EMPTY_FORM: ApplicationForm = {
  name: "",
  location: "",
  website_url: "",
  instagram_url: "",
  bio: "",
};

function formatStatus(status: ArtistApplicationStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Changes needed";
  if (status === "suspended") return "Suspended";
  return "Pending review";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function ArtistApplicationForm() {
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [applications, setApplications] = useState<ArtistApplication[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const pendingApplication = useMemo(
    () => applications.find((application) => application.status === "pending") ?? null,
    [applications],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      try {
        const response = await fetch("/api/artists/apply", { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as ApplicationResponse;

        if (!response.ok) {
          throw new Error(body.error || "Failed to load artist applications");
        }

        if (!cancelled) {
          setApplications(Array.isArray(body.applications) ? body.applications : []);
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState("error");
          setMessage({
            tone: "error",
            text:
              error instanceof Error
                ? error.message
                : "Failed to load artist applications",
          });
        }
      }
    }

    void loadApplications();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || pendingApplication) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/artists/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await response.json().catch(() => ({}))) as ApplicationResponse;

      if (!response.ok) {
        if (body.application) {
          setApplications((current) => {
            const withoutExisting = current.filter(
              (application) => application.id !== body.application?.id,
            );
            return [body.application as ArtistApplication, ...withoutExisting];
          });
        }
        throw new Error(body.error || "Failed to submit artist application");
      }

      if (!body.application) {
        throw new Error("Artist application was created without a response record");
      }

      setApplications((current) => [body.application as ArtistApplication, ...current]);
      setForm(EMPTY_FORM);
      setMessage({
        tone: "success",
        text: "Application submitted. Your artist profile is now pending review.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to submit artist application",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardTitle
          title={pendingApplication ? "Application submitted" : "Artist details"}
          description={
            pendingApplication
              ? "Your artist application is waiting for Audioflume review."
              : "Start with the core information for your artist profile. Images and full profile editing come later in onboarding."
          }
        />

        {pendingApplication ? (
          <div className="grid gap-3 p-4">
            <Info label="Artist" value={pendingApplication.name} />
            <Info label="Status" value={formatStatus(pendingApplication.status)} />
            <Info label="Submitted" value={formatDate(pendingApplication.created_at)} />
            {message ? <Feedback tone={message.tone} message={message.text} /> : null}
          </div>
        ) : (
          <form onSubmit={submitApplication}>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <Input
                label="Artist name"
                value={form.name}
                placeholder="Artist name"
                onChange={(value) =>
                  setForm((current) => ({ ...current, name: value }))
                }
              />
              <Input
                label="Location"
                value={form.location}
                placeholder="City, province / state, country"
                onChange={(value) =>
                  setForm((current) => ({ ...current, location: value }))
                }
              />
              <Input
                label="Website"
                type="url"
                value={form.website_url}
                placeholder="https://"
                onChange={(value) =>
                  setForm((current) => ({ ...current, website_url: value }))
                }
              />
              <Input
                label="Instagram"
                type="url"
                value={form.instagram_url}
                placeholder="https://instagram.com/..."
                onChange={(value) =>
                  setForm((current) => ({ ...current, instagram_url: value }))
                }
              />
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-[var(--text-muted)] font-[320]">
                  Artist bio
                </span>
                <textarea
                  value={form.bio}
                  placeholder="A short introduction to the artist and the music you make."
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bio: event.target.value }))
                  }
                  rows={6}
                  className="w-full resize-y border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)]"
                />
              </label>
            </div>

            <div className="grid gap-3 border-t border-[var(--border)] px-4 py-3.5">
              {message ? <Feedback tone={message.tone} message={message.text} /> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    loadState === "loading" ||
                    !form.name.trim()
                  }
                >
                  {submitting ? "Submitting..." : "Submit application"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Card>

      <Card>
        <CardTitle
          title="Your artist profiles"
          description="Profiles connected to your Audioflume account as an owner."
        />
        <div className="grid gap-3 p-4">
          {loadState === "loading" ? (
            <div className="text-xs text-[var(--text-muted)] font-[320]">Loading artist profiles...</div>
          ) : null}

          {loadState === "error" ? (
            <div className="text-xs text-[var(--text-muted)] font-[320]">
              Artist profiles could not be loaded.
            </div>
          ) : null}

          {loadState === "ready" && applications.length === 0 ? (
            <div className="border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 text-xs leading-5 text-[var(--text-muted)] font-[320]">
              No artist profiles yet. Your first submitted application will appear here.
            </div>
          ) : null}

          {applications.map((application) => (
            <div
              key={application.id}
              className="border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-sm tracking-[-0.02em] text-[var(--text-primary)] font-[320]">
                    {application.name}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)] font-[320]">
                    {formatDate(application.created_at)}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)] font-[320]">
                  {formatStatus(application.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
