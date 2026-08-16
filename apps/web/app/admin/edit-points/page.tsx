"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AlertIcon from "@/components/icons/AlertIcon";
import CheckIcon from "@/components/icons/CheckIcon";
import FailedIcon from "@/components/icons/FailedIcon";
import LoadingSpinner from "@/components/LoadingSpinner";
import Toast from "@/components/Toast";

type BatchAnalyzeResult = {
  songId: string;
  title: string;
  status: "saved" | "skipped" | "failed";
  saved?: number;
  error?: string;
};

type MissingSongsResponse = {
  totalMissing: number;
  songs: { id: string; title: string }[];
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

const STATUS_COLORS = {
  saved: "var(--status-success, #48b571)",
  skipped: "var(--status-warning, #d9a441)",
  failed: "var(--status-error, #dc584f)",
};

const STATUS_BACKGROUNDS = {
  saved: "var(--status-success-soft, rgba(72, 181, 113, 0.12))",
  skipped: "var(--status-warning-soft, rgba(217, 164, 65, 0.12))",
  failed: "var(--status-error-soft, rgba(220, 88, 79, 0.12))",
};

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

function summarizeResults(results: BatchAnalyzeResult[], totalMissing: number) {
  return {
    totalMissing,
    analyzed: results.filter((result) => result.status === "saved").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
    completedAt: new Date().toISOString(),
  };
}

function ResultStatus({ status }: { status: BatchAnalyzeResult["status"] }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      <span
        className="flex h-[18px] w-[18px] flex-[0_0_18px] items-center justify-center rounded-full"
        style={{
          backgroundColor: STATUS_BACKGROUNDS[status],
          color: STATUS_COLORS[status],
        }}
      >
        {status === "saved" && <CheckIcon size={13} strokeWidth={2.6} />}
        {status === "skipped" && <AlertIcon size={11} />}
        {status === "failed" && <FailedIcon size={11} strokeWidth={2.6} />}
      </span>
      <span className="capitalize">{status}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-secondary)]">
      <span>{label}</span>
      <span className="font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

export default function AdminEditPointsPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [currentSongTitle, setCurrentSongTitle] = useState("");
  const [totalToAnalyze, setTotalToAnalyze] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [result, setResult] = useState<BatchAnalyzeResponse | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const progressPercent =
    totalToAnalyze > 0 ? Math.round((completedCount / totalToAnalyze) * 100) : 0;

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
      "Analyze all songs currently missing cue points? This can take a few minutes.",
    );

    if (!confirmed) return;

    try {
      setIsAnalyzing(true);
      setAnalysisStartedAt(Date.now());
      setCompletedCount(0);
      setCurrentSongTitle("");

      const missingRes = await fetch("/api/admin/songs/batch-analyze-edit-points", {
        method: "GET",
      });
      const missingData = (await missingRes.json()) as MissingSongsResponse;

      if (!missingRes.ok) {
        throw new Error(missingData?.error || "Failed to load songs missing cue points.");
      }

      setTotalToAnalyze(missingData.songs.length);

      if (missingData.songs.length === 0) {
        const emptyResult = summarizeResults([], 0);
        setResult(emptyResult);
        window.localStorage.setItem(
          RECENT_ANALYSIS_STORAGE_KEY,
          JSON.stringify(emptyResult),
        );
        showToast("No songs are missing cue points");
        return;
      }

      const results: BatchAnalyzeResult[] = [];

      for (const song of missingData.songs) {
        setCurrentSongTitle(song.title || "Untitled song");

        const res = await fetch(
          `/api/admin/songs/batch-analyze-edit-points?songId=${encodeURIComponent(song.id)}`,
          { method: "POST" },
        );
        const data = (await res.json()) as BatchAnalyzeResponse;

        if (!res.ok) {
          results.push({
            songId: song.id,
            title: song.title || "Untitled song",
            status: "failed",
            error: data?.error || "Failed to analyze song.",
          });
        } else {
          results.push(...(data.results || []));
        }

        setCompletedCount(results.length);
      }

      const nextResult = summarizeResults(results, missingData.songs.length);

      setResult(nextResult);
      window.localStorage.setItem(
        RECENT_ANALYSIS_STORAGE_KEY,
        JSON.stringify(nextResult),
      );
      showToast(
        `Analyzed ${nextResult.analyzed} song${nextResult.analyzed === 1 ? "" : "s"}`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to batch analyze cue points.",
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisStartedAt(null);
      setCurrentSongTitle("");
    }
  };

  return (
    <AdminContentPage
      label="Cue Points"
      title="Cue Points"
      compactHeader
      contentAreaClassName="bg-[var(--filmwave-neutral-surface)]"
      contentAreaBottomPadding={false}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={analyzeMissingEditPoints}
          disabled={isAnalyzing}
          className="inline-flex h-10 min-w-[104px] cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[var(--text-primary)] bg-[var(--text-primary)] px-5 text-sm font-medium text-[var(--bg-primary)] transition disabled:cursor-default disabled:opacity-50"
        >
          {isAnalyzing && (
            <LoadingSpinner size={13} stroke={11} color="currentColor" />
          )}
          {isAnalyzing ? "Analyzing..." : "Analyze Missing Cue Points"}
        </button>

        <Link
          href="/admin/music-library?issue=editPoints"
          className="inline-flex h-10 min-w-[104px] items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          View Missing
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-3">
          <section className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)]">
            <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
              <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                Batch Analyzer
              </h2>
              {isAnalyzing ? (
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {progressPercent}%
                </span>
              ) : null}
            </div>

            <div className="px-5 pb-5">
              <div className="flex min-h-10 items-center justify-between gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-xs">
                <span className="min-w-0 truncate text-[var(--text-secondary)]">
                  {isAnalyzing
                    ? currentSongTitle
                      ? `Analyzing ${currentSongTitle}`
                      : "Preparing analyzer..."
                    : result
                      ? "Last batch complete"
                      : "Ready to analyze missing cue points"}
                </span>
                <span className="shrink-0 text-[var(--text-muted)]">
                  {isAnalyzing
                    ? `${completedCount}/${totalToAnalyze || "—"}`
                    : result
                      ? getRecentAnalysisLabel(result.completedAt)
                      : "Ready"}
                </span>
              </div>

              {isAnalyzing && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                    <div
                      className="h-full rounded-full bg-[var(--text-primary)] opacity-60 transition-[width] duration-300 ease-out"
                      style={{ width: `${Math.max(2, progressPercent)}%` }}
                    />
                  </div>
                </div>
              )}

              {analysisStartedAt && isAnalyzing && (
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  Keep this page open until the batch completes.
                </p>
              )}
            </div>
          </section>

          {result && (
            <section className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)]">
              <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
                <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                  Recently Analyzed
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {getRecentAnalysisLabel(result.completedAt)}
                </span>
              </div>

              {result.results.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center border-t border-[var(--border-subtle)] px-5 text-xs text-[var(--text-secondary)]">
                  No songs are missing cue points.
                </div>
              ) : (
                <div className="border-t border-[var(--border-subtle)]">
                  {result.results.map((item, index) => (
                    <div
                      key={item.songId}
                      className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_110px_58px_92px] items-center gap-3 px-5 text-xs"
                      style={{
                        borderBottom:
                          index === result.results.length - 1
                            ? "none"
                            : "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/admin/songs/${item.songId}/edit-points?from=edit-points`}
                          className="block truncate font-medium text-[var(--text-primary)] transition hover:text-[var(--text-secondary)]"
                        >
                          {item.title || "Untitled song"}
                        </Link>
                        {item.error && (
                          <div className="mt-1 truncate text-[11px] text-[var(--status-error,#dc584f)]">
                            {item.error}
                          </div>
                        )}
                      </div>

                      <ResultStatus status={item.status} />

                      <div className="text-[var(--text-secondary)]">
                        {item.saved ?? "—"}
                      </div>

                      <Link
                        href={`/admin/songs/${item.songId}/edit-points?from=edit-points`}
                        className="inline-flex h-8 items-center justify-center rounded-[7px] border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <section className="h-fit overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="px-5 pb-3 pt-5">
            <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
              Run Summary
            </h2>
          </div>

          <div className="grid gap-2 px-5 pb-5">
            <SummaryRow label="Missing" value={result?.totalMissing ?? "—"} />
            <SummaryRow label="Analyzed" value={result?.analyzed ?? "—"} />
            <SummaryRow label="Skipped" value={result?.skipped ?? "—"} />
            <SummaryRow label="Failed" value={result?.failed ?? "—"} />
          </div>
        </section>
      </div>

      <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
      <Toast message={toastMessage} />
    </AdminContentPage>
  );
}
