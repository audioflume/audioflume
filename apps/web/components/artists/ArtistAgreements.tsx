"use client";

import { useEffect, useState } from "react";
import { BackendCheckbox } from "@/components/backend/BackendControls";

type ArtistAgreementDocument = {
  id: string;
  document_key: string;
  version: number;
  title: string;
  summary: string | null;
  document_url: string | null;
  required: boolean;
  status: "draft" | "published";
  effective_at: string | null;
  accepted: boolean;
  accepted_at: string | null;
  accepted_by_clerk_user_id: string | null;
  accepted_by_display_name: string | null;
};

type AgreementsResponse = {
  documents?: ArtistAgreementDocument[];
  can_accept?: boolean;
  completion?: {
    required_total: number;
    required_accepted: number;
    complete: boolean;
  };
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function statusClassName(status: "accepted" | "preparing" | "required") {
  if (status === "accepted") {
    return "bg-[rgba(72,181,113,0.12)] text-[#48b571]";
  }
  return "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

export default function ArtistAgreements({ artistId }: { artistId: string }) {
  const [documents, setDocuments] = useState<ArtistAgreementDocument[]>([]);
  const [canAccept, setCanAccept] = useState(false);
  const [completion, setCompletion] = useState({
    required_total: 0,
    required_accepted: 0,
    complete: false,
  });
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadAgreements() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/artists/${artistId}/agreements`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | AgreementsResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to load agreements");
      }

      setDocuments(Array.isArray(body?.documents) ? body.documents : []);
      setCanAccept(Boolean(body?.can_accept));
      setCompletion(
        body?.completion ?? {
          required_total: 0,
          required_accepted: 0,
          complete: false,
        },
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load agreements",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setDocuments([]);
    setConfirmed({});
    setMessage("");
    void loadAgreements();
  }, [artistId]);

  async function acceptAgreement(documentId: string) {
    if (!canAccept || !confirmed[documentId] || busyId) return;

    setBusyId(documentId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/artists/${artistId}/agreements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          confirmed: true,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to accept agreement");
      }

      setConfirmed((current) => ({ ...current, [documentId]: false }));
      setMessage("Agreement accepted.");
      await loadAgreements();
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Failed to accept agreement",
      );
    } finally {
      setBusyId("");
    }
  }

  if (loading && documents.length === 0) {
    return (
      <div className="filmwave-backend-section flex min-h-[280px] items-center justify-center text-xs text-[var(--text-muted)] font-[320]">
        Loading agreements...
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {message ? (
        <div className="filmwave-backend-section px-4 py-3 text-xs text-[var(--status-success,#48b571)] font-[320]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="filmwave-backend-section px-4 py-3 text-xs text-[var(--status-error,#dc584f)] font-[320]">
          {error}
        </div>
      ) : null}

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header-bordered">
          <h2 className="filmwave-backend-section-title">Onboarding documents</h2>
          {completion.required_total > 0 ? (
            <span
              className={`filmwave-backend-status-badge ${statusClassName(
                completion.complete ? "accepted" : "required",
              )}`}
            >
              {completion.complete
                ? "Complete"
                : `${completion.required_accepted} of ${completion.required_total} accepted`}
            </span>
          ) : (
            <span
              className={`filmwave-backend-status-badge ${statusClassName("preparing")}`}
            >
              Preparing
            </span>
          )}
        </div>
        <div className="px-5 py-4 text-xs leading-6 text-[var(--text-secondary)] font-[320]">
          Required artist agreements and onboarding documents will live here. Each
          acceptance is recorded against the exact document version.
        </div>
      </section>

      {documents.length === 0 ? (
        <section className="filmwave-backend-section flex min-h-[180px] items-center justify-center px-5 text-center text-xs text-[var(--text-muted)] font-[320]">
          No onboarding documents have been added yet.
        </section>
      ) : (
        documents.map((document) => {
          const isDraft = document.status === "draft";
          const isBusy = busyId === document.id;
          const status = document.accepted
            ? "accepted"
            : isDraft
              ? "preparing"
              : "required";
          const statusLabel = document.accepted
            ? "Accepted"
            : isDraft
              ? "Preparing"
              : document.required
                ? "Required"
                : "Optional";

          return (
            <section key={document.id} className="filmwave-backend-section">
              <div className="filmwave-backend-section-header-bordered">
                <h2 className="filmwave-backend-section-title">{document.title}</h2>
                <span
                  className={`filmwave-backend-status-badge ${statusClassName(status)}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="px-5 py-5">
                {document.summary ? (
                  <p className="m-0 max-w-[720px] text-xs leading-6 text-[var(--text-secondary)] font-[320]">
                    {document.summary}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[var(--text-muted)] font-[320]">
                  <span>Version {document.version}</span>
                  {document.effective_at ? (
                    <span>Effective {formatDate(document.effective_at)}</span>
                  ) : null}
                  {document.accepted_at ? (
                    <span>
                      Accepted {formatDate(document.accepted_at)}
                      {document.accepted_by_display_name
                        ? ` by ${document.accepted_by_display_name}`
                        : ""}
                    </span>
                  ) : null}
                </div>

                {isDraft ? (
                  <div className="mt-5 text-xs text-[var(--text-muted)] font-[320]">
                    This document is being prepared and cannot be accepted yet.
                  </div>
                ) : (
                  <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {document.document_url ? (
                        <a
                          href={document.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="filmwave-backend-button filmwave-backend-button-secondary"
                        >
                          Review document
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] font-[320]">
                          Document file unavailable.
                        </span>
                      )}

                      {!document.accepted && canAccept && document.document_url ? (
                        <button
                          type="button"
                          disabled={!confirmed[document.id] || isBusy}
                          onClick={() => void acceptAgreement(document.id)}
                          className="filmwave-backend-button filmwave-backend-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBusy ? "Accepting..." : "Accept agreement"}
                        </button>
                      ) : null}
                    </div>

                    {!document.accepted && canAccept && document.document_url ? (
                      <BackendCheckbox
                        checked={Boolean(confirmed[document.id])}
                        onChange={(checked) =>
                          setConfirmed((current) => ({
                            ...current,
                            [document.id]: checked,
                          }))
                        }
                        disabled={isBusy}
                        size="sm"
                        className="mt-4 max-w-[720px] items-start gap-2 text-[11px] leading-5"
                        label="I have reviewed this document and agree on behalf of the artist."
                      />
                    ) : null}

                    {!document.accepted && !canAccept ? (
                      <div className="mt-4 text-[11px] leading-5 text-[var(--text-muted)] font-[320]">
                        Only the artist owner can accept agreements on behalf of the
                        artist.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
