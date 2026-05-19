"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";
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
  completedAt?: string;
};

const RECENT_ANALYSIS_STORAGE_KEY = "filmwave-recent-edit-point-analysis";

function getRecentAnalysisLabel(value?: string) {
  if (!value) return "Recent run";

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recent run";
  }
}

export default function AdminEditPointsPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<BatchAnalyzeResponse | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_ANALYSIS_STORAGE_KEY);
      if (!stored) return;
      setResult(JSON.parse(stored) as BatchAnalyzeResponse);
    } catch {
      window.localStorage.removeItem(RECENT_ANALYSIS_STORAGE_KEY);
    }
  }, []);

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
      setAnalysisStartedAt(Date.now());

      const res = await fetch("/api/admin/songs/batch-analyze-edit-points", {
        method: "POST",
      });

      const data = (await res.json()) as BatchAnalyzeResponse;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to batch analyze edit points.");
      }

      const nextResult = {
        ...data,
        completedAt: new Date().toISOString(),
      };

      setResult(nextResult);
      window.localStorage.setItem(
        RECENT_ANALYSIS_STORAGE_KEY,
        JSON.stringify(nextResult),
      );
      showToast(
        `Analyzed ${data.analyzed} song${data.analyzed === 1 ? "" : "s"}`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to batch analyze edit points.",
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisStartedAt(null);
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

            <p className="mt-2 max-w-[620px] text-xs leading-5 text-[var(--text-secondary)]">
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
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
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
                {isAnalyzing && (
                  <LoadingSpinner
                    size={13}
                    stroke={11}
                    color="currentColor"
                  />
                )}
                {isAnalyzing ? "Analyzing..." : "Analyze Missing Edit Points"}
              </button>

              {isAnalyzing && (
                <div className="mt-4 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-primary)]">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                    <div className="h-full w-1/3 animate-[editPointBatchProgress_1.15s_ease-in-out_infinite] rounded-full bg-[var(--text-primary)] opacity-60" />
                  </div>
                  <style>{`
                    @keyframes editPointBatchProgress {
                      0% { transform: translateX(-120%); }
                      100% { transform: translateX(320%); }
                    }
                  `}</style>
                </div>
              )}

              {analysisStartedAt && isAnalyzing && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Analyzer is running. Keep this page open until the batch completes.
                </p>
              )}

              {result && (
                <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Recently Analyzed
                    </div>
                    <div className="font-mono text-[11px] text-[var(--text-muted)]">
                      {getRecentAnalysisLabel(result.completedAt)}
                    </div>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_96px_80px_110px] border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    <div>Song</div>
                    <div>Status</div>
                    <div>Saved</div>
                    <div>Review</div>
                  </div>

                  {result.results.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-[var(--text-secondary)]">
                      No songs are missing edit points.
                    </div>
                  ) : (
                    result.results.map((item) => (
                      <div
                        key={item.songId}
                        className="grid grid-cols-[minmax(0,1fr)_96px_80px_110px] items-center border-b border-[var(--border-subtle)] px-4 py-3 text-xs last:border-b-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/admin/songs/${item.songId}/edit-points?from=edit-points`}
                            className="truncate font-medium text-[var(--text-primary)] transition hover:text-[var(--text-secondary)]"
                          >
                            {item.title || "Untitled song"}
                          </Link>
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

                        <Link
                          href={`/admin/songs/${item.songId}/edit-points?from=edit-points`}
                          className="inline-flex h-7 w-fit items-center rounded-full border border-[var(--border)] px-3 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        >
                          Edit Points
                        </Link>
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
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Auto-generated edit points are useful, but they should still be reviewed. Songs with only auto edit points now show an Auto indicator in the admin library.
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
