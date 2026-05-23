"use client";

import type { Song } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AlertIcon from "@/components/icons/AlertIcon";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import CheckIcon from "@/components/icons/CheckIcon";
import FailedIcon from "@/components/icons/FailedIcon";
import FolderIcon from "@/components/icons/FolderIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import UploadIcon from "@/components/icons/UploadIcon";
import WaveformIcon from "@/components/icons/WaveformIcon";
import { primaryPillButtonClass } from "@/components/uiClasses";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
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
  section: string;
  description: string;
  icon: "upload" | "music" | "waveform" | "folder";
};

type LibraryStats = {
  totalSongs: number;
  missingCoverArt: number;
  missingSongInfo: number;
  missingWaveformPeaks: number;
  missingTags: number;
  missingEditPoints: number;
};

const DEFAULT_SYSTEM_STATUSES: SystemHealthItem[] = [
  { key: "supabase", label: "Supabase connected", tone: "warning", message: "Not checked yet." },
  { key: "r2_music", label: "Music library storage", tone: "warning", message: "Not checked yet." },
  { key: "r2_images", label: "Image storage", tone: "warning", message: "Not checked yet." },
  { key: "analyzer", label: "Analyzer ready", tone: "warning", message: "Not checked yet." },
];

const SYSTEM_HEALTH_FAILED_STATUSES: SystemHealthItem[] = DEFAULT_SYSTEM_STATUSES.map((item) => ({
  ...item,
  tone: "error",
  message: "System health check failed.",
}));

const quickActions: QuickAction[] = [
  {
    label: "New Song Upload",
    href: "/admin/songs/new",
    section: "Upload",
    description: "Upload music, cover art, stems, and metadata.",
    icon: "upload",
  },
  {
    label: "Music Library",
    href: "/admin/music-library",
    section: "Database",
    description: "Search, preview, edit, and manage uploaded songs.",
    icon: "music",
  },
  {
    label: "Cue Points",
    href: "/admin/edit-points",
    section: "Analyzer",
    description: "Batch analyze and review generated cue points.",
    icon: "waveform",
  },
  {
    label: "Playlist Manager",
    href: "/admin/playlist-manager",
    section: "Curation",
    description: "Manage curated playlists and Discover sections.",
    icon: "folder",
  },
];

const STATUS_COLORS = {
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  error: "var(--status-error)",
};

function DashboardCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
      {children}
    </div>
  );
}

function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[62px] items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3.5">
      <div className="min-w-0">
        <h2 className="text-lg font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function ActionIcon({ icon }: { icon: QuickAction["icon"] }) {
  if (icon === "upload") return <UploadIcon size={13} />;
  if (icon === "music") return <MusicIcon size={13} />;
  if (icon === "waveform") return <WaveformIcon size={13} />;
  return <FolderIcon size={13} />;
}

function ActionRow(action: QuickAction) {
  return (
    <Link
      href={action.href}
      className="group grid min-h-[72px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] px-4 py-3 transition last:border-b-0 hover:bg-[var(--bg-hover)]"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition group-hover:text-[var(--text-primary)]">
        <ActionIcon icon={action.icon} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-[var(--text-muted)]">
          {action.section}
        </div>
        <div className="mt-1 text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {action.label}
        </div>
        <p className="mt-1 max-w-xl truncate text-xs text-[var(--text-muted)]">
          {action.description}
        </p>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition group-hover:border-[var(--text-muted)] group-hover:bg-[var(--text-primary)] group-hover:text-[var(--bg-primary)]">
        <ArrowUpRightIcon />
      </div>
    </Link>
  );
}

function StatusIcon({ tone }: { tone: StatusTone }) {
  const color = STATUS_COLORS[tone];

  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {tone === "success" && <CheckIcon size={12} />}
      {tone === "warning" && <AlertIcon />}
      {tone === "error" && <FailedIcon />}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  href,
}: {
  label: string;
  value: number | string;
  helper: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 transition hover:bg-[var(--bg-hover)]">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-[28px] leading-none tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-2 text-xs text-[var(--text-secondary)]">
        {helper}
      </div>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { user, isLoaded } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songsError, setSongsError] = useState("");
  const [systemStatuses, setSystemStatuses] = useState<SystemHealthItem[]>(DEFAULT_SYSTEM_STATUSES);
  const [systemHealthLoading, setSystemHealthLoading] = useState(true);

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
        setSongsError(err instanceof Error ? err.message : "Failed to load songs.");
      } finally {
        setSongsLoading(false);
      }
    };

    if (isLoaded && isAdmin) fetchSongs();
  }, [isLoaded, isAdmin]);

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        setSystemHealthLoading(true);
        const res = await fetch("/api/admin/system-health", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load system health.");
        const data = await res.json();
        setSystemStatuses(data.statuses || DEFAULT_SYSTEM_STATUSES);
      } catch {
        setSystemStatuses(SYSTEM_HEALTH_FAILED_STATUSES);
      } finally {
        setSystemHealthLoading(false);
      }
    };

    if (isLoaded && isAdmin) fetchSystemHealth();
  }, [isLoaded, isAdmin]);

  const stats: LibraryStats = useMemo(() => {
    return {
      totalSongs: songs.length,
      missingCoverArt: songs.filter((song) => songHasIssue(song, "coverArt")).length,
      missingSongInfo: songs.filter((song) => songHasIssue(song, "songInfo")).length,
      missingWaveformPeaks: songs.filter((song) => songHasIssue(song, "waveformPeaks")).length,
      missingTags: songs.filter((song) => songHasIssue(song, "tags")).length,
      missingEditPoints: songs.filter((song) => songHasIssue(song, "editPoints")).length,
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

  if (!isLoaded) {
    return (
      <AdminContentPage
        label="Dashboard"
        title="Admin Dashboard"
        description="Upload, review, and manage Filmwave library content from one operational workspace."
        headerAction={(
          <Link href="/admin/songs/new" className={primaryPillButtonClass}>
            <UploadIcon size={13} />
            <span>Upload Song</span>
          </Link>
        )}
      >
        <div className="text-sm text-[var(--text-secondary)]">Loading...</div>
      </AdminContentPage>
    );
  }

  if (!isAdmin) {
    return (
      <AdminContentPage
        label="Dashboard"
        title="Admin"
        description="You do not have access to this page."
      >
        <div />
      </AdminContentPage>
    );
  }

  return (
    <AdminContentPage
      label="Dashboard"
      title="Admin Dashboard"
      description="Upload, review, and manage Filmwave library content from one operational workspace."
      headerAction={(
        <Link href="/admin/songs/new" className={primaryPillButtonClass}>
          <UploadIcon size={13} />
          <span>Upload Song</span>
        </Link>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          <DashboardCard>
            <CardHeader
              title="Admin Operations"
              description="Common library management actions."
            />
            <div>{quickActions.map((action) => <ActionRow key={action.href} {...action} />)}</div>
          </DashboardCard>

          <DashboardCard>
            <CardHeader
              title="Library Snapshot"
              description="Fast links into common review filters."
              action={songsLoading ? <span className="text-xs text-[var(--text-muted)]">Scanning</span> : null}
            />
            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <MetricCard label="Total Songs" value={songsLoading ? "—" : stats.totalSongs} helper="songs in library" href="/admin/music-library" />
              <MetricCard label="Missing Cover" value={songsLoading ? "—" : stats.missingCoverArt} helper="need cover art" href="/admin/music-library?issue=coverArt" />
              <MetricCard label="Missing Info" value={songsLoading ? "—" : stats.missingSongInfo} helper="need metadata" href="/admin/music-library?issue=songInfo" />
              <MetricCard label="Missing Peaks" value={songsLoading ? "—" : stats.missingWaveformPeaks} helper="need waveform" href="/admin/music-library?issue=peakData" />
              <MetricCard label="Missing Tags" value={songsLoading ? "—" : stats.missingTags} helper="need tags" href="/admin/music-library?issue=tags" />
              <MetricCard label="Missing Cues" value={songsLoading ? "—" : stats.missingEditPoints} helper="need markers" href="/admin/music-library?issue=editPoints" />
            </div>
          </DashboardCard>
        </div>

        <div className="grid content-start gap-4">
          <DashboardCard>
            <CardHeader title="Library Health" action={<StatusIcon tone={healthTone} />} />
            <div className="grid gap-2 p-4 text-xs text-[var(--text-secondary)]">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
                {stats.missingCoverArt} missing cover art
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
                {stats.missingSongInfo} missing info
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
                {stats.missingWaveformPeaks} missing peaks
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
                {stats.missingTags} missing tags
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
                {stats.missingEditPoints} missing cue points
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <CardHeader
              title="System Status"
              action={
                systemHealthLoading ? (
                  <span className="text-xs text-[var(--text-muted)]">Checking</span>
                ) : null
              }
            />
            <div className="grid gap-2 p-4">
              {systemStatuses.map((status) => (
                <div
                  key={status.key}
                  title={status.message}
                  className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                >
                  <StatusIcon tone={status.tone} />
                  <span>{status.label}</span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>

      {songsError && (
        <div className="mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          {songsError}
        </div>
      )}
    </AdminContentPage>
  );
}
