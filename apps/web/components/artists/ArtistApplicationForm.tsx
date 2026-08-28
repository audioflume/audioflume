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

type ArtistImageKind = "profile" | "hero";

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

async function uploadArtistImage(
  artistId: string,
  kind: ArtistImageKind,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await fetch(`/api/artists/${artistId}/images`, {
    method: "POST",
    body: formData,
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(body.error || "Failed to upload artist image");
  }
}

export default function ArtistApplicationForm() {
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [applications, setApplications] = useState<ArtistApplication[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [featureImageFile, setFeatureImageFile] = useState<File | null>(null);
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

      const failedImages: string[] = [];
      const imageUploads: Array<{
        kind: ArtistImageKind;
        file: File | null;
        label: string;
      }> = [
        { kind: "profile", file: thumbnailFile, label: "artist thumbnail" },
        { kind: "hero", file: featureImageFile, label: "feature image" },
      ];

      for (const image of imageUploads) {
        if (!image.file) continue;

        try {
          await uploadArtistImage(application.id, image.kind, image.file);
        } catch (uploadError) {
          console.error(`Failed to upload ${image.label}:`, uploadError);
          failedImages.push(image.label);
        }
      }

      setForm(EMPTY_FORM);
      setThumbnailFile(null);
      setFeatureImageFile(null);

      if (failedImages.length > 0) {
        setMessage({
          tone: "error",
          text: `Application submitted, but the ${failedImages.join(" and ")} could not be uploaded. You can add ${failedImages.length === 1 ? "it" : "them"} from your artist profile.`,
        });
      } else {
        setMessage({
          tone: "success",
          text: "Application submitted. Your artist profile is now pending review.",
        });
      }
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
    <Card>
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

            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  Artist thumbnail
                </span>
                <div className="flex min-h-[96px] items-center gap-3 border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <div className="h-14 w-14 shrink-0 border border-[var(--border)] bg-[var(--bg-tertiary)]" />
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex h-8 cursor-pointer items-center justify-center border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      Choose image
                      <input
                        type="file"
                        accept="image/*"
                        disabled={submitting}
                        className="hidden"
                        onChange={(event) => {
                          setThumbnailFile(event.target.files?.[0] ?? null);
                        }}
                      />
                    </label>
                    <div className="mt-2 truncate text-[10px] text-[var(--text-muted)]">
                      {thumbnailFile?.name || "Square image recommended"}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  Feature image
                </span>
                <div className="flex min-h-[96px] items-center gap-3 border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <div className="h-14 w-24 shrink-0 border border-[var(--border)] bg-[var(--bg-tertiary)]" />
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex h-8 cursor-pointer items-center justify-center border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      Choose image
                      <input
                        type="file"
                        accept="image/*"
                        disabled={submitting}
                        className="hidden"
                        onChange={(event) => {
                          setFeatureImageFile(event.target.files?.[0] ?? null);
                        }}
                      />
                    </label>
                    <div className="mt-2 truncate text-[10px] text-[var(--text-muted)]">
                      {featureImageFile?.name || "Wide image recommended"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
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

          <div className="grid gap-3 px-4 py-3.5">
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
  );
}
