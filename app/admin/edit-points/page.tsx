"use client";

import { useState } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";
import Toast from "@/components/Toast";
import { primaryPillButtonClass, secondaryPillButtonClass } from "@/components/uiClasses";

type BatchAnalyzeResult = {
  songId: string;
  title: string;
  status: "saved" | "skipped" | "failed";
  saved?: number;
  error?: string;
};

type BatchAnalyzeResponse = {
  totalMissing: number;
  analyzed: number;
  skipped: number;
  failed: number;
  results: BatchAnalyzeResult[];
  error?: string;
};

export default function AdminEditPointsPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BatchAnalyzeResponse | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2200);
  };

  const analyzeMissingEditPoints = async () => {
    if (isAnalyzing) return;

    const confirmed = window.confirm(
      "Analyze all songs currently missing edit points? This can take a few minutes.",
    );

    if (!confirmed) return;

    try {
      setIsAnalyzing(true);
      setResult(null);

      const res = await fetch("/api/admin/songs/batch-analyze-edit-points", {
        method: "POST",
      });

      const data = (await res.json()) as BatchAnalyzeResponse;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to batch analyze edit points.");
      }

      setResult(data);
      showToast(
        `Analyzed ${data.analyzed} song${data.analyzed === 1 ? "" : "s"}`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to batch analyze edit points.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <section className="px-8 pt-14 pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
              Edit Points
            </h1>

            <p className="mt-2 max-w-[620px] text-sm leading-6 text-[var(--text-secondary)]">
              Batch analyze missing edit points and review analyzer results before building frontend edit-point filters.
            </p>
          </div>

          <Link href="/admin/music-library?issue=editPoints" className={secondaryPillButtonClass}>
            View Missing
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Batch Analyzer
              </div>
              <h2 className="mt-2 text-lg font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                Analyze songs missing edit points
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                This only targets songs that still have no saved edit-point rows. Corrected songs are left alone.
              </p>
            </div>

            <div className="px-5 py-5">
              <button
                type="button"
                onClick={analyzeMissingEditPoints}
                disabled={isAnalyzing}
                className={`${primaryPillButtonClass} disabled:cursor-default disabled:opacity-50`}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Missing Edit Points"}
              </button>

              {result && (
                <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)]">
                  <div className="grid grid-cols-[minmax(0,1fr)_96px_80px] border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    <div>Song</div>
                    <div>Status</div>
                    <div>Saved</div>
                  </div>

                  {result.results.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-[var(--text-secondary)]">
                      No songs are missing edit points.
                    </div>
                  ) : (
                    result.results.map((item) => (
                      <div
                        key={item.songId}
                        className="grid grid-cols-[minmax(0,1fr)_96px_80px] items-center border-b border-[var(--border-subtle)] px-4 py-3 text-xs last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[var(--text-primary)]">
                            {item.title || "Untitled song"}
                          </div>
                          {item.error && (
                            <div className="mt-1 truncate text-[11px] text-[var(--status-error,#dc584f)]">
                              {item.error}
                            </div>
                          )}
                        </div>

                        <div className="capitalize text-[var(--text-secondary)]">
                          {item.status}
                        </div>

                        <div className="font-mono text-[var(--text-secondary)]">
                          {item.saved ?? "—"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Current Step
            </div>
            <h2 className="mt-2 text-base font-medium text-[var(--text-primary)]">
              Fill the catalog
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Once the missing songs are analyzed, the next step is a proper review queue for low-confidence points and corrected/manual status.
            </p>

            {result && (
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <div className="text-[var(--text-muted)]">Missing</div>
                  <div className="mt-1 font-mono text-lg text-[var(--text-primary)]">
                    {result.totalMissing}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <div className="text-[var(--text-muted)]">Analyzed</div>
                  <div className="mt-1 font-mono text-lg text-[var(--text-primary)]">
                    {result.analyzed}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <div className="text-[var(--text-muted)]">Skipped</div>
                  <div className="mt-1 font-mono text-lg text-[var(--text-primary)]">
                    {result.skipped}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <div className="text-[var(--text-muted)]">Failed</div>
                  <div className="mt-1 font-mono text-lg text-[var(--text-primary)]">
                    {result.failed}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      <Toast message={toastMessage} />
    </main>
  );
}
