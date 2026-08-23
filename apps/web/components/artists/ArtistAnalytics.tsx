"use client";

import { useEffect, useState } from "react";

type ArtistAnalyticsTotals = {
  downloads: number;
  saves: number;
  playlist_adds: number;
  project_adds: number;
};

type ArtistAnalyticsPeriod = {
  saves: number;
  playlist_adds: number;
  project_adds: number;
  total: number;
};

type ArtistAnalyticsTimelinePoint = {
  date: string;
  saves: number;
  playlist_adds: number;
  project_adds: number;
  total: number;
};

type ArtistAnalyticsTrack = {
  id: string;
  title: string;
  cover_url: string | null;
  status: string;
  downloads: number;
  saves: number;
  playlist_adds: number;
  project_adds: number;
};

type ArtistAnalyticsResponse = {
  range_days?: number;
  totals?: ArtistAnalyticsTotals;
  period?: ArtistAnalyticsPeriod;
  timeline?: ArtistAnalyticsTimelinePoint[];
  tracks?: ArtistAnalyticsTrack[];
  error?: string;
};

const RANGE_OPTIONS = [7, 30, 90] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="filmwave-backend-section flex min-h-[104px] flex-col justify-between p-4">
      <div className="text-[11px] font-[320] text-[var(--text-secondary)]">
        {label}
      </div>
      <div>
        <div className="font-[family-name:var(--font-zalando-sans)] text-[24px] font-[200] leading-none tracking-[-0.04em] text-[var(--text-primary)]">
          {formatNumber(value)}
        </div>
        <div className="mt-2 text-[10px] font-[320] text-[var(--text-muted)]">{note}</div>
      </div>
    </div>
  );
}

function ActivityChart({ timeline }: { timeline: ArtistAnalyticsTimelinePoint[] }) {
  const maxValue = Math.max(1, ...timeline.map((point) => point.total));
  const hasActivity = timeline.some((point) => point.total > 0);

  const polylinePoints = timeline
    .map((point, index) => {
      const x =
        timeline.length <= 1 ? 500 : (index / (timeline.length - 1)) * 1000;
      const y = 190 - (point.total / maxValue) * 145;
      return `${x},${y}`;
    })
    .join(" ");

  if (!hasActivity) {
    return (
      <div className="flex h-[220px] items-center justify-center border-t border-[var(--border-subtle)] text-xs font-[320] text-[var(--text-muted)]">
        No engagement activity in this period yet.
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border-subtle)] px-5 pb-4 pt-5">
      <div className="h-[200px] w-full text-[var(--text-primary)]">
        <svg
          viewBox="0 0 1000 210"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          aria-label="Artist engagement activity"
          role="img"
        >
          <line
            x1="0"
            x2="1000"
            y1="190"
            y2="190"
            stroke="var(--border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {timeline.map((point, index) => {
            if (point.total === 0) return null;
            const x =
              timeline.length <= 1
                ? 500
                : (index / (timeline.length - 1)) * 1000;
            const y = 190 - (point.total / maxValue) * 145;
            return (
              <circle
                key={point.date}
                cx={x}
                cy={y}
                r="2.5"
                fill="currentColor"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] font-[320] text-[var(--text-muted)]">
        <span>{timeline[0] ? formatDate(timeline[0].date) : ""}</span>
        <span>
          {timeline[timeline.length - 1]
            ? formatDate(timeline[timeline.length - 1].date)
            : ""}
        </span>
      </div>
    </div>
  );
}

export default function ArtistAnalytics({ artistId }: { artistId: string }) {
  const [rangeDays, setRangeDays] = useState<(typeof RANGE_OPTIONS)[number]>(30);
  const [data, setData] = useState<ArtistAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/artists/${artistId}/analytics?days=${rangeDays}`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => null)) as
          | ArtistAnalyticsResponse
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load analytics");
        }

        if (!cancelled) setData(payload || {});
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load analytics",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [artistId, rangeDays]);

  const totals = data?.totals ?? {
    downloads: 0,
    saves: 0,
    playlist_adds: 0,
    project_adds: 0,
  };
  const period = data?.period ?? {
    saves: 0,
    playlist_adds: 0,
    project_adds: 0,
    total: 0,
  };
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
  const periodMetrics = [
    { label: "Saves", value: period.saves },
    { label: "Playlist adds", value: period.playlist_adds },
    { label: "Project adds", value: period.project_adds },
  ];

  if (loading && !data) {
    return (
      <div className="filmwave-backend-section flex min-h-[320px] items-center justify-center text-xs font-[320] text-[var(--text-muted)]">
        Loading analytics...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="filmwave-backend-section flex min-h-[320px] items-center justify-center px-6 text-center text-xs font-[320] text-[var(--text-secondary)]">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="filmwave-backend-section px-5 py-3 text-xs font-[320] text-[var(--text-primary)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Downloads" value={totals.downloads} note="All time" />
        <MetricCard label="Saves" value={totals.saves} note="Current total" />
        <MetricCard
          label="Playlist Adds"
          value={totals.playlist_adds}
          note="Current total"
        />
        <MetricCard
          label="Project Adds"
          value={totals.project_adds}
          note="Current total"
        />
      </section>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header-bordered flex-wrap">
          <div>
            <h2 className="filmwave-backend-section-title">Engagement activity</h2>
            <div className="mt-1 text-[11px] font-[320] text-[var(--text-muted)]">
              {formatNumber(period.total)} interactions in the last {rangeDays} days
            </div>
          </div>

          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                disabled={loading && rangeDays === days}
                className={`filmwave-backend-choice-button ${
                  rangeDays === days ? "is-active" : ""
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3">
          {periodMetrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`px-5 py-4 ${
                index < periodMetrics.length - 1
                  ? "border-b border-[var(--border-subtle)] sm:border-b-0 sm:border-r"
                  : ""
              }`}
            >
              <div className="text-[11px] font-[320] text-[var(--text-secondary)]">
                {metric.label}
              </div>
              <div className="mt-2 font-[family-name:var(--font-zalando-sans)] text-[18px] font-[200] tracking-[-0.03em] text-[var(--text-primary)]">
                {formatNumber(metric.value)}
              </div>
            </div>
          ))}
        </div>

        <ActivityChart timeline={timeline} />

        <div className="border-t border-[var(--border-subtle)] px-5 py-3 text-[11px] font-[320] leading-5 text-[var(--text-muted)]">
          Downloads are currently reported as all-time totals. The activity chart
          uses timestamped saves, playlist adds, and project adds.
        </div>
      </section>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header-bordered">
          <h2 className="filmwave-backend-section-title">Track performance</h2>
          <span className="text-[11px] font-[320] text-[var(--text-muted)]">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"} · All time
          </span>
        </div>

        {tracks.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs font-[320] text-[var(--text-muted)]">
            No tracks to report yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[minmax(250px,1fr)_90px_90px_110px_110px] items-center border-b border-[var(--border-subtle)] px-5 py-3 text-[10px] font-[320] text-[var(--text-secondary)]">
                <span>Track</span>
                <span className="text-right">Downloads</span>
                <span className="text-right">Saves</span>
                <span className="text-right">Playlist adds</span>
                <span className="text-right">Project adds</span>
              </div>

              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className={`grid min-h-[68px] grid-cols-[minmax(250px,1fr)_90px_90px_110px_110px] items-center px-5 py-2 ${
                    index < tracks.length - 1
                      ? "border-b border-[var(--border-subtle)]"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3 pr-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--bg-tertiary)] text-[11px] font-[320] text-[var(--text-muted)]">
                      {track.cover_url ? (
                        <img
                          src={track.cover_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-[320] text-[var(--text-primary)]">
                        {track.title}
                      </div>
                      <div className="mt-1 text-[10px] font-[320] text-[var(--text-muted)]">
                        {formatStatus(track.status || "track")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs font-[320] text-[var(--text-secondary)]">
                    {formatNumber(track.downloads)}
                  </div>
                  <div className="text-right text-xs font-[320] text-[var(--text-secondary)]">
                    {formatNumber(track.saves)}
                  </div>
                  <div className="text-right text-xs font-[320] text-[var(--text-secondary)]">
                    {formatNumber(track.playlist_adds)}
                  </div>
                  <div className="text-right text-xs font-[320] text-[var(--text-secondary)]">
                    {formatNumber(track.project_adds)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
