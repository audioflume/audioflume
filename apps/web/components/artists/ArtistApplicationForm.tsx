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
        <p className="m-0 max-w-[680px] text-[18px] leading-7 text-[var(--text-secondary)]">
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
          <Input
            label="Spotify"
            type="url"
            value={form.spotify_url}
            placeholder="https://open.spotify.com/..."
            onChange={(value) =>
              setForm((current) => ({ ...current, spotify_url: value }))
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
