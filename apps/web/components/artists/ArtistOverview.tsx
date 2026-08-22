"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistSongSummary = {
  id: string;
  title: string;
  status: string;
  duration: number;
  created_at: string;
  player_song?: {
    coverArt?: string | null;
  };
};

type ArtistSongsResponse = {
  songs?: ArtistSongSummary[];
  error?: string;
};

type ArtistAnalyticsResponse = {
  totals?: {
    downloads: number;
    saves: number;
    playlist_adds: number;
    project_adds: number;
  };
  period?: {
    saves: number;
    playlist_adds: number;
    project_adds: number;
    total: number;
  };
  error?: string;
};

type CurrencySummary = {
  currency: string;
  available_balance_cents: number;
  pending_earnings_cents: number;
  total_earned_cents: number;
  paid_out_cents: number;
  payout_in_progress_cents: number;
};

type EarningsResponse = {
  currencies?: CurrencySummary[];
  error?: string;
};

type ArtistNotification = {
  id: string;
  kind: string;
  title: string;
  message: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationsResponse = {
  notifications?: ArtistNotification[];
  unread_count?: number;
  error?: string;
};

function getArtistDashboardHref(section: string, artistId: string) {
  const params = new URLSearchParams({ section, artist: artistId });
  return `/artists/dashboard?${params.toString()}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const elapsed = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) return "Just now";
  if (elapsed < hour) return `${Math.max(1, Math.floor(elapsed / minute))}m ago`;
  if (elapsed < day) return `${Math.max(1, Math.floor(elapsed / hour))}h ago`;
  if (elapsed < 7 * day) return `${Math.max(1, Math.floor(elapsed / day))}d ago`;

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClassName(status: string) {
  if (status === "rejected" || status === "changes_requested") {
    return "bg-[var(--danger-hover,rgba(255,93,87,0.1))] text-[var(--danger,#ff5d57)]";
  }
  if (status === "approved" || status === "published") {
    return "bg-[rgba(72,181,113,0.12)] text-[#48b571]";
  }
  return "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

function notificationColor(kind: string) {
  if (kind.includes("rejected") || kind.includes("suspended")) {
    return "var(--status-error)";
  }
  if (kind.includes("approved") || kind.includes("published")) {
    return "var(--status-success)";
  }
  return "color-mix(in srgb, var(--text-primary) 14%, transparent)";
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!response.ok) {
    throw new Error(body?.error || "Failed to load overview data");
  }

  return (body || {}) as T;
}

function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="filmwave-backend-section-header-bordered">
      <h2 className="filmwave-backend-section-title">{title}</h2>
      <Link
        href={href}
        className="text-[11px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

export default function ArtistOverview({
  artist,
}: {
  artist: ArtistDashboardProfile;
}) {
  const showEarnings = artist.role === "owner" || artist.role === "manager";
  const [songs, setSongs] = useState<ArtistSongSummary[]>([]);
  const [analytics, setAnalytics] = useState<ArtistAnalyticsResponse | null>(null);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [notifications, setNotifications] = useState<ArtistNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    let cancelled = false;

    setSongs([]);
    setAnalytics(null);
    setEarnings(null);
    setNotifications([]);
    setLoading(true);
    setWarning("");

    async function loadOverview() {
      const songsRequest = fetchJson<ArtistSongsResponse>(
        `/api/artists/${artist.id}/songs`,
      );
      const analyticsRequest = fetchJson<ArtistAnalyticsResponse>(
        `/api/artists/${artist.id}/analytics?days=30`,
      );
      const notificationsRequest = fetchJson<NotificationsResponse>(
        `/api/artists/${artist.id}/notifications`,
      );
      const earningsRequest = showEarnings
        ? fetchJson<EarningsResponse>(`/api/artists/${artist.id}/earnings`)
        : Promise.resolve<EarningsResponse>({});

      const [songsResult, analyticsResult, notificationsResult, earningsResult] =
        await Promise.allSettled([
          songsRequest,
          analyticsRequest,
          notificationsRequest,
          earningsRequest,
        ] as const);

      if (cancelled) return;

      let failedRequests = 0;

      if (songsResult.status === "fulfilled") {
        setSongs(Array.isArray(songsResult.value.songs) ? songsResult.value.songs : []);
      } else {
        failedRequests += 1;
      }

      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value);
      } else {
        failedRequests += 1;
      }

      if (notificationsResult.status === "fulfilled") {
        setNotifications(
          Array.isArray(notificationsResult.value.notifications)
            ? notificationsResult.value.notifications
            : [],
        );
      } else {
        failedRequests += 1;
      }

      if (earningsResult.status === "fulfilled") {
        setEarnings(earningsResult.value);
      } else if (showEarnings) {
        failedRequests += 1;
      }

      if (failedRequests > 0) {
        setWarning("Some overview information could not be loaded.");
      }
      setLoading(false);
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [artist.id, showEarnings]);

  const recentSongs = songs.slice(0, 5);
  const recentNotifications = notifications.slice(0, 4);
  const period = analytics?.period ?? {
    saves: 0,
    playlist_adds: 0,
    project_adds: 0,
    total: 0,
  };
  const totals = analytics?.totals ?? {
    downloads: 0,
    saves: 0,
    playlist_adds: 0,
    project_adds: 0,
  };
  const currencies = earnings?.currencies ?? [];
  const singleCurrency = currencies.length === 1 ? currencies[0] : null;
  const stats = [
    { label: "Approved Tracks", value: artist.stats.tracks },
    { label: "Releases", value: artist.stats.releases },
    { label: "Playlists", value: artist.stats.playlists },
    { label: "30-Day Interactions", value: period.total },
  ];

  return (
    <div className="grid gap-4">
      {warning ? (
        <div className="filmwave-backend-section px-4 py-3 text-xs text-[var(--text-secondary)]">
          {warning}
        </div>
      ) : null}

      {artist.hero_image_url ? (
        <section className="filmwave-backend-section overflow-hidden">
          <div className="h-[180px] bg-[var(--bg-tertiary)] md:h-[220px]">
            <img
              src={artist.hero_image_url}
              alt={`${artist.name} hero`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center justify-between gap-5 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate font-[family-name:var(--font-aktiv-grotesk)] text-[18px] font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                {artist.name}
              </div>
              {artist.designation ? (
                <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {artist.designation}
                </div>
              ) : null}
            </div>
            <Link
              href={getArtistDashboardHref("my-page", artist.id)}
              className="filmwave-backend-button shrink-0"
            >
              View my page
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="filmwave-backend-section flex min-h-[104px] flex-col justify-between p-4"
          >
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              {stat.label}
            </span>
            <span className="font-[family-name:var(--font-aktiv-grotesk)] text-[24px] font-medium leading-none tracking-[-0.04em] text-[var(--text-primary)]">
              {loading && stat.label === "30-Day Interactions"
                ? "—"
                : formatNumber(stat.value)}
            </span>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
        <section className="filmwave-backend-section overflow-hidden">
          <SectionHeader
            title="Recently added songs"
            href={getArtistDashboardHref("music", artist.id)}
            linkLabel="View music"
          />

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
              Loading songs...
            </div>
          ) : recentSongs.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-5 text-center text-xs text-[var(--text-muted)]">
              No songs added yet.
            </div>
          ) : (
            recentSongs.map((song, index) => (
              <div
                key={song.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  index < recentSongs.length - 1
                    ? "border-b border-[var(--border-subtle)]"
                    : ""
                }`}
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[5px] bg-[var(--bg-tertiary)]">
                  {song.player_song?.coverArt ? (
                    <img
                      src={song.player_song.coverArt}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {song.title}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--text-muted)] sm:hidden">
                    {formatDate(song.created_at)}
                  </div>
                </div>
                <span
                  className={`hidden rounded-full px-2 py-1 text-[9px] font-medium sm:inline-flex ${statusClassName(
                    song.status,
                  )}`}
                >
                  {formatStatus(song.status)}
                </span>
                <div className="hidden w-[86px] shrink-0 text-right text-[10px] text-[var(--text-muted)] sm:block">
                  {formatDate(song.created_at)}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="filmwave-backend-section overflow-hidden">
          <SectionHeader
            title="Analytics"
            href={getArtistDashboardHref("analytics", artist.id)}
            linkLabel="View analytics"
          />

          <div className="px-5 pb-5 pt-5">
            <div className="text-[11px] text-[var(--text-muted)]">Last 30 days</div>
            <div className="mt-2 font-[family-name:var(--font-aktiv-grotesk)] text-[36px] font-medium leading-none tracking-[-0.05em] text-[var(--text-primary)]">
              {loading ? "—" : formatNumber(period.total)}
            </div>
            <div className="mt-2 text-[10px] text-[var(--text-muted)]">
              Total interactions
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-[var(--border-subtle)]">
            {[
              { label: "Saves", value: period.saves },
              { label: "Playlist adds", value: period.playlist_adds },
              { label: "Project adds", value: period.project_adds },
            ].map((metric, index) => (
              <div
                key={metric.label}
                className={`px-4 py-4 ${
                  index < 2 ? "border-r border-[var(--border-subtle)]" : ""
                }`}
              >
                <div className="text-[9px] text-[var(--text-muted)]">
                  {metric.label}
                </div>
                <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                  {loading ? "—" : formatNumber(metric.value)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-5 py-4 text-[11px] text-[var(--text-secondary)]">
            <span>All-time downloads</span>
            <span className="font-medium text-[var(--text-primary)]">
              {loading ? "—" : formatNumber(totals.downloads)}
            </span>
          </div>
        </section>
      </div>

      <div
        className={`grid gap-4 ${
          showEarnings
            ? "xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.45fr)]"
            : ""
        }`}
      >
        {showEarnings ? (
          <section className="filmwave-backend-section overflow-hidden">
            <SectionHeader
              title="Earnings"
              href={getArtistDashboardHref("earnings", artist.id)}
              linkLabel="View earnings"
            />

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
                Loading earnings...
              </div>
            ) : currencies.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center px-5 text-center text-xs text-[var(--text-muted)]">
                No earnings recorded yet.
              </div>
            ) : singleCurrency ? (
              <div className="grid grid-cols-3">
                {[
                  {
                    label: "Available",
                    value: singleCurrency.available_balance_cents,
                  },
                  {
                    label: "Pending",
                    value: singleCurrency.pending_earnings_cents,
                  },
                  {
                    label: "Total earned",
                    value: singleCurrency.total_earned_cents,
                  },
                ].map((metric, index) => (
                  <div
                    key={metric.label}
                    className={`px-4 py-6 ${
                      index < 2 ? "border-r border-[var(--border-subtle)]" : ""
                    }`}
                  >
                    <div className="text-[9px] text-[var(--text-muted)]">
                      {metric.label}
                    </div>
                    <div className="mt-2 font-[family-name:var(--font-aktiv-grotesk)] text-[16px] font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                      {formatMoney(metric.value, singleCurrency.currency)}
                    </div>
                    <div className="mt-1 text-[9px] text-[var(--text-muted)]">
                      {singleCurrency.currency}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              currencies.slice(0, 3).map((summary, index) => (
                <div
                  key={summary.currency}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${
                    index < Math.min(currencies.length, 3) - 1
                      ? "border-b border-[var(--border-subtle)]"
                      : ""
                  }`}
                >
                  <div className="text-xs font-medium text-[var(--text-primary)]">
                    {summary.currency}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--text-primary)]">
                      {formatMoney(
                        summary.available_balance_cents,
                        summary.currency,
                      )}
                    </div>
                    <div className="mt-1 text-[9px] text-[var(--text-muted)]">
                      available
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        ) : null}

        <section className="filmwave-backend-section overflow-hidden">
          <SectionHeader
            title="Recent notifications"
            href={getArtistDashboardHref("notifications", artist.id)}
            linkLabel="View notifications"
          />

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
              Loading notifications...
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-5 text-center text-xs text-[var(--text-muted)]">
              Nothing new yet.
            </div>
          ) : (
            recentNotifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 px-5 py-4 ${
                  index < recentNotifications.length - 1
                    ? "border-b border-[var(--border-subtle)]"
                    : ""
                }`}
              >
                <span
                  className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: notificationColor(notification.kind) }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-xs text-[var(--text-primary)] ${
                      notification.read_at ? "font-normal" : "font-medium"
                    }`}
                  >
                    {notification.title}
                  </div>
                  {notification.message ? (
                    <div className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">
                      {notification.message}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 pt-0.5 text-[10px] text-[var(--text-muted)]">
                  {formatNotificationTime(notification.created_at)}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
