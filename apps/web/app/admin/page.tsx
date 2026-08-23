"use client";

import type { Song } from "@/lib/types";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Footer from "@/components/Footer";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminSongRow from "@/components/admin/AdminSongRow";
import AlertIcon from "@/components/icons/AlertIcon";
import CheckIcon from "@/components/icons/CheckIcon";
import FailedIcon from "@/components/icons/FailedIcon";
import FolderIcon from "@/components/icons/FolderIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import UploadIcon from "@/components/icons/UploadIcon";
import { songHasIssue } from "@/lib/songHealth";

type StatusTone = "success" | "warning" | "error";

type SystemHealthItem = {
  key: string;
  label: string;
  tone: StatusTone;
  message: string;
};

type QuickAction = {
  label: string;
  href: string;
  icon: "upload" | "music" | "folder";
};

type LibraryStats = {
  totalSongs: number;
  missingCoverArt: number;
  missingSongInfo: number;
  missingWaveformPeaks: number;
  missingTags: number;
  missingEditPoints: number;
};

const ADMIN_HERO_IMAGE =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80";

const DEFAULT_SYSTEM_STATUSES: SystemHealthItem[] = [
  {
    key: "supabase",
    label: "Supabase connected",
    tone: "warning",
    message: "Not checked yet.",
  },
  {
    key: "r2_music",
    label: "Music library storage",
    tone: "warning",
    message: "Not checked yet.",
  },
  {
    key: "r2_images",
    label: "Image storage",
    tone: "warning",
    message: "Not checked yet.",
  },
  {
    key: "analyzer",
    label: "Analyzer ready",
    tone: "warning",
    message: "Not checked yet.",
  },
];

const SYSTEM_HEALTH_FAILED_STATUSES: SystemHealthItem[] =
  DEFAULT_SYSTEM_STATUSES.map((item) => ({
    ...item,
    tone: "error",
    message: "System health check failed.",
  }));

const quickActions: QuickAction[] = [
  {
    label: "Upload Song",
    href: "/admin/songs/new",
    icon: "upload",
  },
  {
    label: "Music Library",
    href: "/admin/music-library",
    icon: "music",
  },
  {
    label: "Playlist Manager",
    href: "/admin/playlist-manager",
    icon: "folder",
  },
];

const STATUS_COLORS = {
  success: "var(--status-success, #48b571)",
  warning: "var(--status-warning, #d9a441)",
  error: "var(--status-error, #dc584f)",
};

const STATUS_BACKGROUNDS = {
  success: "var(--status-success-soft, rgba(72, 181, 113, 0.12))",
  warning: "var(--status-warning-soft, rgba(217, 164, 65, 0.12))",
  error: "var(--status-error-soft, rgba(220, 88, 79, 0.12))",
};

function getIsAdmin(
  userEmail: string | undefined,
  publicMetadata: Record<string, unknown> | undefined,
) {
  const isAdminByRole = publicMetadata?.role === "admin";

  const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  const adminEmails = adminEmailsEnv
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  const isAdminByEmail = !!userEmail && adminEmails.includes(userEmail);

  return isAdminByRole || isAdminByEmail;
}

function DashboardCard({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)]">
      {children}
    </section>
  );
}

function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
      <h2 className="font-[family-name:var(--font-zalando-sans)] text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
        {title}
      </h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function ActionIcon({ icon }: { icon: QuickAction["icon"] }) {
  if (icon === "upload") return <UploadIcon size={13} />;
  if (icon === "music") return <MusicIcon size={13} />;
  return <FolderIcon size={13} />;
}

function StatusIcon({ tone }: { tone: StatusTone }) {
  return (
    <div
      className="flex h-[18px] w-[18px] flex-[0_0_18px] items-center justify-center rounded-full"
      style={{
        backgroundColor: STATUS_BACKGROUNDS[tone],
        color: STATUS_COLORS[tone],
      }}
    >
      {tone === "success" && <CheckIcon size={13} strokeWidth={2.6} />}
      {tone === "warning" && <AlertIcon size={11} />}
      {tone === "error" && <FailedIcon size={11} strokeWidth={2.6} />}
    </div>
  );
}

function AdminHero({
  stats,
  healthTone,
  statuses,
  songsLoading,
}: {
  stats: LibraryStats;
  healthTone: StatusTone;
  statuses: SystemHealthItem[];
  songsLoading: boolean;
}) {
  const completeChecks = [
    stats.missingCoverArt === 0,
    stats.missingSongInfo === 0,
    stats.missingWaveformPeaks === 0,
    stats.missingTags === 0,
    stats.missingEditPoints === 0,
  ].filter(Boolean).length;
  const progress = songsLoading ? 0 : Math.round((completeChecks / 5) * 100);
  const systemReadyCount = statuses.filter((status) => status.tone === "success").length;

  return (
    <section className="mb-4">
      <div className="group relative min-h-[355px] overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <img
          src={ADMIN_HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/46 to-black/10" />
        <div className="relative z-10 flex min-h-[355px] flex-col justify-between p-5 md:p-6">
          <div className="inline-flex w-fit max-w-full items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium leading-none text-white/75 backdrop-blur">
            <span className="truncate">Audioflume admin</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/80 backdrop-blur">
              {songsLoading ? "Scanning library" : `${stats.totalSongs} songs scanned`}
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/80 backdrop-blur">
              Library health · {songsLoading ? "—" : `${progress}%`}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/80 backdrop-blur">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[healthTone] }}
              />
              {systemReadyCount} / {statuses.length} systems ready
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewMetric({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[72px] flex-col justify-between rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 transition hover:text-[var(--text-primary)]"
    >
      <span className="text-xs text-[var(--text-secondary)] transition group-hover:text-[var(--text-primary)]">
        {label}
      </span>
      <span className="mt-3 font-[family-name:var(--font-zalando-sans)] text-[24px] font-medium leading-none tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </span>
    </Link>
  );
}

function RecentSongsCard({
  songs,
  songsLoading,
  onDeleted,
}: {
  songs: Song[];
  songsLoading: boolean;
  onDeleted: (songId: string) => void;
}) {
  return (
    <DashboardCard>
      <CardHeader
        title="Recent Songs"
        action={
          <Link
            href="/admin/music-library"
            className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            View Library
          </Link>
        }
      />

      <div className="mb-5 overflow-hidden">
        <div className="overflow-x-auto overflow-y-hidden lg:overflow-x-visible">
          <div className="admin-dashboard-song-list min-w-[680px] lg:min-w-0">
            {songsLoading && (
              <div className="grid gap-0 border-t border-[var(--border-subtle)]">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="grid min-h-[72px] grid-cols-[68px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(104px,140px)_48px_64px_56px] items-center gap-3 px-5"
                    style={{
                      borderBottom:
                        index === 5
                          ? "none"
                          : "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="h-[52px] w-[52px] bg-[var(--bg-tertiary)]" />
                    <div className="h-2 w-[60%] bg-[var(--bg-tertiary)]" />
                    <div className="h-2 w-[50%] bg-[var(--bg-tertiary)]" />
                    <div className="h-6 w-[72px] rounded-full bg-[var(--bg-tertiary)]" />
                    <div className="h-2 w-[32px] bg-[var(--bg-tertiary)]" />
                    <div className="h-2 w-[42px] bg-[var(--bg-tertiary)]" />
                    <div className="h-2 w-[18px] bg-[var(--bg-tertiary)]" />
                  </div>
                ))}
              </div>
            )}

            {!songsLoading && songs.length === 0 && (
              <div className="flex min-h-[180px] items-center justify-center border-t border-[var(--border-subtle)] px-8 text-xs text-[var(--text-secondary)]">
                No songs uploaded yet.
              </div>
            )}

            {!songsLoading && songs.length > 0 && (
              <div className="admin-song-row-group border-t border-[var(--border-subtle)]">
                {songs.map((song, index) => (
                  <AdminSongRow
                    key={song.id}
                    song={song}
                    isLast={index === songs.length - 1}
                    selected={false}
                    selectionMode={false}
                    showSelectionColumn={false}
                    onSelectedChange={() => {}}
                    onDeleted={onDeleted}
                    statusDisplay="published"
                    size="large"
                    colorOnlyActions
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default function AdminDashboardPage() {
  const { user, isLoaded } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = getIsAdmin(
    userEmail,
    user?.publicMetadata as Record<string, unknown> | undefined,
  );

  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songsError, setSongsError] = useState("");
  const [systemStatuses, setSystemStatuses] = useState<SystemHealthItem[]>(
    DEFAULT_SYSTEM_STATUSES,
  );

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setSongsLoading(true);
        setSongsError("");
        const res = await fetch("/api/songs");
        if (!res.ok) throw new Error("Failed to load songs.");
        const data = (await res.json()) as Song[];
        setSongs(data);
      } catch (err) {
        setSongsError(
          err instanceof Error ? err.message : "Failed to load songs.",
        );
      } finally {
        setSongsLoading(false);
      }
    };

    if (isLoaded && isAdmin) fetchSongs();
  }, [isLoaded, isAdmin]);

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        const res = await fetch("/api/admin/system-health", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load system health.");
        const data = await res.json();
        setSystemStatuses(data.statuses || DEFAULT_SYSTEM_STATUSES);
      } catch {
        setSystemStatuses(SYSTEM_HEALTH_FAILED_STATUSES);
      }
    };

    if (isLoaded && isAdmin) fetchSystemHealth();
  }, [isLoaded, isAdmin]);

  const stats: LibraryStats = useMemo(() => {
    return {
      totalSongs: songs.length,
      missingCoverArt: songs.filter((song) => songHasIssue(song, "coverArt"))
        .length,
      missingSongInfo: songs.filter((song) => songHasIssue(song, "songInfo"))
        .length,
      missingWaveformPeaks: songs.filter((song) =>
        songHasIssue(song, "waveformPeaks"),
      ).length,
      missingTags: songs.filter((song) => songHasIssue(song, "tags")).length,
      missingEditPoints: songs.filter((song) =>
        songHasIssue(song, "editPoints"),
      ).length,
    };
  }, [songs]);

  const healthTone: StatusTone =
    stats.missingCoverArt > 0 ||
    stats.missingSongInfo > 0 ||
    stats.missingWaveformPeaks > 0
      ? "error"
      : stats.missingTags > 0
        ? "warning"
        : "success";

  const recentSongs = useMemo(() => [...songs].reverse().slice(0, 10), [songs]);

  if (!isLoaded) {
    return (
      <AdminContentPage
        label="Dashboard"
        title="Dashboard"
        compactHeader
        contentAreaClassName="bg-[var(--filmwave-neutral-surface)]"
        contentAreaBottomPadding={false}
      >
        <section className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-5 text-xs text-[var(--text-secondary)]">
          Loading...
        </section>
        <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
      </AdminContentPage>
    );
  }

  if (!isAdmin) {
    return (
      <AdminContentPage
        label="Dashboard"
        title="Dashboard"
        compactHeader
        contentAreaClassName="bg-[var(--filmwave-neutral-surface)]"
        contentAreaBottomPadding={false}
      >
        <section className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-5 text-xs text-[var(--text-secondary)]">
          You do not have access to this page.
        </section>
        <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
      </AdminContentPage>
    );
  }

  return (
    <AdminContentPage
      label="Dashboard"
      title="Dashboard"
      compactHeader
      contentAreaClassName="bg-[var(--filmwave-neutral-surface)]"
      contentAreaBottomPadding={false}
    >
      <style>{`
        .admin-dashboard-song-list .admin-song-menu-btn {
          opacity: 1;
        }

        .admin-dashboard-song-list .admin-song-edit-btn {
          opacity: 0;
        }

        .admin-dashboard-song-list .admin-song-edit-btn:hover,
        .admin-dashboard-song-list .admin-song-row:hover .admin-song-edit-btn {
          opacity: 1;
        }

        .admin-dashboard-song-list .admin-song-row.is-error {
          background: var(--status-error-faint);
        }

        .admin-dashboard-song-list .admin-song-row.is-warning {
          background: var(--status-warning-faint);
        }

        .admin-dashboard-song-list .admin-song-row.is-error:hover {
          background: var(--status-error-hover);
        }

        .admin-dashboard-song-list .admin-song-row.is-warning:hover {
          background: var(--status-warning-hover);
        }

        .admin-dashboard-song-list .admin-song-row {
          grid-template-columns: 68px minmax(0, 1.4fr) minmax(0, 1fr) minmax(104px, 140px) 48px 64px 56px;
          column-gap: 12px;
          padding-left: 20px;
          padding-right: 20px;
        }
      `}</style>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {quickActions.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            className={`inline-flex h-10 min-w-[104px] cursor-pointer items-center justify-center gap-2 rounded-[7px] border px-5 text-[12px] font-normal transition ${
              index === 0
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ActionIcon icon={action.icon} />
            <span>{action.label}</span>
          </Link>
        ))}
      </div>

      <AdminHero
        stats={stats}
        healthTone={healthTone}
        statuses={systemStatuses}
        songsLoading={songsLoading}
      />

      <div className="grid gap-3">
        <DashboardCard>
          <CardHeader
            title="Library Overview"
            action={<StatusIcon tone={healthTone} />}
          />

          <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <OverviewMetric
              label="Total Songs"
              value={songsLoading ? "—" : stats.totalSongs}
              href="/admin/music-library"
            />
            <OverviewMetric
              label="Missing Cover"
              value={songsLoading ? "—" : stats.missingCoverArt}
              href="/admin/music-library?issue=coverArt"
            />
            <OverviewMetric
              label="Missing Info"
              value={songsLoading ? "—" : stats.missingSongInfo}
              href="/admin/music-library?issue=songInfo"
            />
            <OverviewMetric
              label="Missing Peaks"
              value={songsLoading ? "—" : stats.missingWaveformPeaks}
              href="/admin/music-library?issue=peakData"
            />
            <OverviewMetric
              label="Missing Tags"
              value={songsLoading ? "—" : stats.missingTags}
              href="/admin/music-library?issue=tags"
            />
            <OverviewMetric
              label="Missing Cues"
              value={songsLoading ? "—" : stats.missingEditPoints}
              href="/admin/music-library?issue=editPoints"
            />
          </div>
        </DashboardCard>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <RecentSongsCard
            songs={recentSongs}
            songsLoading={songsLoading}
            onDeleted={(songId) =>
              setSongs((current) =>
                current.filter((item) => item.id !== songId),
              )
            }
          />

          <div className="grid content-start gap-3">
            <DashboardCard>
              <CardHeader title="System Status" />
              <div className="grid gap-2 px-5 pb-5">
                {systemStatuses.map((status) => (
                  <div
                    key={status.key}
                    title={status.message}
                    className="flex min-h-10 items-center gap-2.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-secondary)]"
                  >
                    <StatusIcon tone={status.tone} />
                    <span>{status.label}</span>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>

      {songsError ? (
        <section className="mt-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-5 text-xs text-[var(--text-secondary)]">
          {songsError}
        </section>
      ) : null}

      <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
    </AdminContentPage>
  );
}
