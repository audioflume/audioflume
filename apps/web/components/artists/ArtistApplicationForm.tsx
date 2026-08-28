"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
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
  website_url: string | null;
  spotify_url: string | null;
  instagram_url: string | null;
  created_at: string;
};

type ApplicationResponse = {
  applications?: ArtistApplication[];
  application?: ArtistApplication;
  error?: string;
};

type ApplicationForm = {
  name: string;
  website_url: string;
  spotify_url: string;
  instagram_url: string;
};

const EMPTY_FORM: ApplicationForm = {
  name: "",
  website_url: "",
  spotify_url: "",
  instagram_url: "",
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

function SpotifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M32,0C14.3,0,0,14.34,0,32s14.34,32,32,32,32-14.34,32-32S49.66,0,32,0ZM46.68,46.18c-.57.96-1.8,1.22-2.75.65-7.53-4.59-16.98-5.62-28.14-3.1-1.07.23-2.14-.42-2.37-1.49s.42-2.14,1.49-2.37c12.2-2.79,22.67-1.61,31.08,3.56.95.57,1.26,1.79.69,2.74,0,0,0,0,0,.01h0ZM50.58,37.47c-.73,1.19-2.26,1.53-3.44.84-8.6-5.28-21.72-6.81-31.89-3.75-1.34.38-2.71-.34-3.1-1.64-.38-1.34.34-2.71,1.68-3.1,11.62-3.52,26.07-1.83,35.98,4.24,1.15.69,1.49,2.22.76,3.4h0ZM50.92,28.37c-10.32-6.12-27.34-6.69-37.2-3.71-1.57.5-3.25-.42-3.75-1.99s.42-3.25,1.99-3.75c11.32-3.44,30.13-2.75,41.98,4.28,1.42.84,1.87,2.68,1.03,4.09-.76,1.45-2.64,1.91-4.05,1.07h0Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="17.4" cy="6.7" r="1" fill="currentColor" />
    </svg>
  );
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

      const application = body.application;
      setApplications((current) => [application, ...current]);
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

  if (pendingApplication) {
    return (
      <Card>
        <div className="grid gap-3 p-4">
          <Info label="Artist" value={pendingApplication.name} />
          <Info label="Status" value={formatStatus(pendingApplication.status)} />
          <Info label="Submitted" value={formatDate(pendingApplication.created_at)} />
          {message ? <Feedback tone={message.tone} message={message.text} /> : null}
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submitApplication}>
      <section className="filmwave-backend-section p-[50px]">
        <p className="m-0 max-w-[560px] text-[18px] font-[300] leading-[1.35] tracking-normal text-[var(--text-primary)]">
          Create your artist profile and submit it for review. Once approved, this profile will become the home for your catalogue, releases, playlists, and artist tools.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Artist name"
            value={form.name}
            placeholder="Artist name"
            onChange={(value) =>
              setForm((current) => ({ ...current, name: value }))
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
          <label className="grid gap-1.5">
            <span className="flex items-center gap-1.5">
              <SpotifyIcon />
              Spotify
            </span>
            <input
              type="url"
              value={form.spotify_url}
              placeholder="https://open.spotify.com/..."
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  spotify_url: event.target.value,
                }))
              }
              className="filmwave-backend-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="flex items-center gap-1.5">
              <InstagramIcon />
              Instagram
            </span>
            <input
              type="url"
              value={form.instagram_url}
              placeholder="https://instagram.com/..."
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instagram_url: event.target.value,
                }))
              }
              className="filmwave-backend-input"
            />
          </label>
        </div>

        <div className="mt-5 flex min-h-10 flex-wrap items-center justify-between gap-3">
          <div className="min-h-5 text-xs">
            {message ? <Feedback tone={message.tone} message={message.text} /> : null}
          </div>
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
      </section>
    </form>
  );
}
