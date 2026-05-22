"use client";

import type { Song } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { usePlayer } from "@/context/PlayerContext";
import AlertIcon from "@/components/icons/AlertIcon";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import CheckIcon from "@/components/icons/CheckIcon";
import FailedIcon from "@/components/icons/FailedIcon";
import EngagementIcon from "@/components/icons/EngagementIcon";
import FolderIcon from "@/components/icons/FolderIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import UploadIcon from "@/components/icons/UploadIcon";
import WaveformIcon from "@/components/icons/WaveformIcon";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
import AdminSongRow from "@/components/admin/AdminSongRow";
import { songHasIssue } from "@/lib/songHealth";

type StatusTone = "success" | "warning" | "error";
type IssueTone = StatusTone | "neutral";

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

const STATUS_COLORS = {
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  error: "var(--status-error)",
};

const HEALTH_PROGRESS_COLORS = {
  success: "#48b571",
  warning: "#d9a441",
  error: "#dc584f",
};

const ADMIN_HERO_IMAGE =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80";

const DEFAULT_SYSTEM_STATUSES: SystemHealthItem[] = [
  { key: "supabase", label: "Supabase connected", tone: "warning", message: "Not checked yet." },
  { key: "r2_music", label: "Music library storage", tone: "warning", message: "Not checked yet." },
  { key: "r2_images", label: "Image storage", tone: "warning", message: "Not checked yet." },
  { key: "analyzer", label: "Analyzer ready", tone: "warning", message: "Not checked yet." },
];

const SYSTEM_HEALTH_FAILED_STATUSES: SystemHealthItem[] = [
  { key: "supabase", label: "Supabase connected", tone: "error", message: "System health check failed." },
  { key: "r2_music", label: "Music library storage", tone: "error", message: "System health check failed." },
  { key: "r2_images", label: "Image storage", tone: "error", message: "System health check failed." },
  { key: "analyzer", label: "Analyzer ready", tone: "error", message: "System health check failed." },
];

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
    label: "SFX Upload",
    href: "/admin/sfx/new",
    section: "Upload",
    description: "Upload sound effects and metadata.",
    icon: "waveform",
  },
  {
    label: "Asset Manager",
    href: "/admin/assets",
    section: "Assets",
    description: "Manage downloadable visual assets.",
    icon: "folder",
  },
];

function getProgressColor(progress: number) {
  if (progress <= 0) return HEALTH_PROGRESS_COLORS.error;
  if (progress >= 100) return HEALTH_PROGRESS_COLORS.success;

  if (progress < 50) {
    return interpolateHexColor(HEALTH_PROGRESS_COLORS.error, HEALTH_PROGRESS_COLORS.warning, progress / 50);
  }

  return interpolateHexColor(HEALTH_PROGRESS_COLORS.warning, HEALTH_PROGRESS_COLORS.success, (progress - 50) / 50);
}

function interpolateHexColor(start: string, end: string, ratio: number) {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio);
  const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio);
  const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function StatusIcon({ tone, icon }: { tone: StatusTone; icon: "check" | "alert" | "failed" }) {
  const color = STATUS_COLORS[tone];

  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1f`, color }}>
      {icon === "check" && <CheckIcon size={12} />}
      {icon === "alert" && <AlertIcon />}
      {icon === "failed" && <FailedIcon />}
    </div>
  );
}

function HealthStatusIcon({ status }: { status: StatusTone }) {
  const color = STATUS_COLORS[status];

  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: `${color}1f`, color }}>
      {status === "success" && <CheckIcon size={12} />}
      {status === "warning" && <AlertIcon />}
      {status === "error" && <FailedIcon />}
    </div>
  );
}

function TaskStatusIcon({ tone }: { tone: IssueTone }) {
  if (tone === "neutral") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-primary)] text-[var(--text-muted)]">
        <AlertIcon />
      </div>
    );
  }

  return <StatusIcon tone={tone} icon={tone === "success" ? "check" : tone === "error" ? "failed" : "alert"} />;
}

function ActionIcon({ icon }: { icon: QuickAction["icon"] }) {
  if (icon === "upload") return <UploadIcon size={13} />;
  if (icon === "music") return <MusicIcon size={13} />;
  if (icon === "waveform") return <WaveformIcon size={13} />;
  return <FolderIcon size={13} />;
}

function DashboardCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] ${className}`}>{children}</div>;
}

function CardTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[62px] items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3.5">
      <div className="min-w-0">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, helper, href, issueTone = "neutral" }: {
  label: string;
  value: number | string;
  helper: string;
  href?: string;
  issueTone?: "neutral" | "warning" | "error";
}) {
  const issueClass = issueTone === "error" ? "admin-metric-card-error" : issueTone === "warning" ? "admin-metric-card-warning" : "";
  const content = (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 transition hover:bg-[var(--bg-hover)] ${issueClass}`}>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 text-[28px] leading-none tracking-[-0.04em] text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 text-xs text-[var(--text-secondary)]">{helper}</div>
    </div>
  );

  if (!href) return content;
  return <Link href={href} className="block">{content}</Link>;
}

function ActionRow({ label, href, section, description, icon }: QuickAction) {
  return (
    <Link href={href} className="group grid min-h-[72px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] px-4 py-3 transition last:border-b-0 hover:bg-[var(--bg-hover)]">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition group-hover:text-[var(--text-primary)]">
        <ActionIcon icon={icon} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-[var(--text-muted)]">{section}</div>
        <div className="mt-1 text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">{label}</div>
        <p className="mt-1 max-w-xl truncate text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition group-hover:border-[var(--text-muted)] group-hover:bg-[var(--text-primary)] group-hover:text-[var(--bg-primary)]">
        <ArrowUpRightIcon />
      </div>
    </Link>
  );
}

function AdminHero({ totalSongs, progress, healthStatus, systemStatuses, songsLoading }: {
  totalSongs: number;
  progress: number;
  healthStatus: StatusTone;
  systemStatuses: SystemHealthItem[];
  songsLoading: boolean;
}) {
  const systemReadyCount = systemStatuses.filter((status) => status.tone === "success").length;

  return (
    <section className="mb-8">
      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.72fr)] xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Admin workspace</div>
          <h1 className="max-w-[760px] font-[family-name:var(--font-instrument-sans)] text-[clamp(42px,6vw,76px)] font-medium leading-[0.9] tracking-[-0.07em] text-[var(--text-primary)]">Admin Dashboard</h1>
        </div>
        <p className="max-w-[520px] text-sm leading-6 text-[var(--text-secondary)] xl:justify-self-end">Upload, review, and manage Filmwave library content from one operational workspace.</p>
      </div>

      <div className="group relative min-h-[255px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <img src={ADMIN_HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/46 to-black/10" />
        <div className="relative z-10 flex min-h-[255px] flex-col justify-between p-5 md:p-6">
          <div className="inline-flex w-fit max-w-full items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium leading-none text-white/75 backdrop-blur">
            <span className="truncate">Filmwave admin</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/80 backdrop-blur">{songsLoading ? "Scanning library" : `${totalSongs} songs scanned`}</div>
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/80 backdrop-blur">Library health · {songsLoading ? "—" : `${progress}%`}</div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[healthStatus] }} />
              {systemReadyCount} / {systemStatuses.length} systems ready
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LibraryQualityCard({ stats, healthStatus, songsLoading }: { stats: LibraryStats; healthStatus: StatusTone; songsLoading: boolean }) {
  const checks = [stats.missingCoverArt === 0, stats.missingSongInfo === 0, stats.missingWaveformPeaks === 0, stats.missingTags === 0, stats.missingEditPoints === 0];
  const completeChecks = checks.filter(Boolean).length;
  const progress = songsLoading ? 0 : Math.round((completeChecks / checks.length) * 100);
  const progressColor = getProgressColor(progress);

  return (
    <DashboardCard>
      <CardTitle title="Library Health" description="Cover art, song info, waveform peaks, tags, and edit point completion." action={<HealthStatusIcon status={healthStatus} />} />
      <div className="px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[42px] leading-none tracking-[-0.055em] text-[var(--text-primary)]">{songsLoading ? "—" : `${progress}%`}</div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{songsLoading ? "Checking library metadata..." : `${completeChecks} of ${checks.length} health checks complete.`}</p>
          </div>
          <div className="text-xs text-[var(--text-muted)]">{stats.totalSongs} songs scanned</div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: progressColor }} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">{stats.missingSongInfo} missing info</div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">{stats.missingWaveformPeaks} missing peaks</div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">{stats.missingCoverArt} missing cover art</div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">{stats.missingTags} missing tags</div>
        </div>

        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">{stats.missingEditPoints} missing edit points</div>
      </div>
    </DashboardCard>
  );
}

function NeedsAttentionCard({ stats, songsLoading }: { stats: LibraryStats; songsLoading: boolean }) {
  const hasFailedIssues = stats.missingCoverArt > 0 || stats.missingSongInfo > 0 || stats.missingWaveformPeaks > 0;
  const hasWarningIssues = stats.missingTags > 0;
  const headerTone: StatusTone = hasFailedIssues ? "error" : hasWarningIssues ? "warning" : "success";
  const tasks: { label: string; value: number; helper: string; issueTone: IssueTone }[] = [
    { label: "Cover art", value: stats.missingCoverArt, helper: "missing artwork", issueTone: "error" },
    { label: "Song info", value: stats.missingSongInfo, helper: "metadata fields", issueTone: "error" },
    { label: "Waveform peaks", value: stats.missingWaveformPeaks, helper: "waveform data", issueTone: "error" },
    { label: "Tags", value: stats.missingTags, helper: "filtering metadata", issueTone: "warning" },
    { label: "Edit points", value: stats.missingEditPoints, helper: "markers or ranges", issueTone: "neutral" },
  ];

  return (
    <DashboardCard>
      <CardTitle title="Needs Attention" action={<HealthStatusIcon status={headerTone} />} />
      <div className="grid gap-2 px-4 py-3">
        {tasks.map((task) => {
          const isComplete = !songsLoading && task.value === 0;
          const activeTone = isComplete ? "success" : task.issueTone;
          const issueClass = !isComplete && task.issueTone === "error" ? "admin-attention-item-error" : !isComplete && task.issueTone === "warning" ? "admin-attention-item-warning" : "";

          return (
            <div key={task.label} className={`flex h-11 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 transition ${issueClass}`}>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--text-primary)]">{task.label}</div>
                <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{songsLoading ? "Checking..." : isComplete ? "Complete" : task.helper}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">{songsLoading ? "—" : task.value}</span>
                <TaskStatusIcon tone={activeTone} />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

function NextBestActionCard({ stats, songsLoading }: { stats: LibraryStats; songsLoading: boolean }) {
  const totalIssues = stats.missingCoverArt + stats.missingSongInfo + stats.missingWaveformPeaks + stats.missingTags + stats.missingEditPoints;
  const actionHref = stats.missingCoverArt > 0 ? "/admin/music-library?issue=coverArt" : stats.missingSongInfo > 0 ? "/admin/music-library?issue=songInfo" : stats.missingWaveformPeaks > 0 ? "/admin/music-library?issue=peakData" : stats.missingTags > 0 ? "/admin/music-library?issue=tags" : stats.missingEditPoints > 0 ? "/admin/music-library?issue=editPoints" : "/admin/music-library";
  const actionText = stats.missingCoverArt > 0
    ? `Add cover art to ${stats.missingCoverArt} song${stats.missingCoverArt === 1 ? "" : "s"} to complete library artwork.`
    : stats.missingSongInfo > 0
      ? `Add missing song info to ${stats.missingSongInfo} song${stats.missingSongInfo === 1 ? "" : "s"} to complete library metadata.`
      : stats.missingWaveformPeaks > 0
        ? `Generate waveform peak data for ${stats.missingWaveformPeaks} song${stats.missingWaveformPeaks === 1 ? "" : "s"}.`
        : stats.missingTags > 0
          ? `Add missing tags to ${stats.missingTags} song${stats.missingTags === 1 ? "" : "s"} to improve filtering.`
          : stats.missingEditPoints > 0
            ? `Add edit point data to ${stats.missingEditPoints} song${stats.missingEditPoints === 1 ? "" : "s"} to improve waveform filtering.`
            : totalIssues > 0
              ? `Clean up ${totalIssues} remaining library issue${totalIssues === 1 ? "" : "s"}.`
              : "Your music library is looking clean. Upload the next track when ready.";

  return (
    <DashboardCard>
      <CardTitle title="Next Best Action" />
      <div className="px-4 py-4">
        <h2 className="text-sm font-medium leading-5 tracking-[-0.01em] text-[var(--text-primary)]">{songsLoading ? "Reviewing library status..." : actionText}</h2>
        <Link href={actionHref} className={`mt-4 ${secondaryPillButtonClass}`}>Review Library</Link>
      </div>
    </DashboardCard>
  );
}

function SystemStatusCard({ statuses, loading }: { statuses: SystemHealthItem[]; loading: boolean }) {
  return (
    <DashboardCard>
      <CardTitle title="System Status" action={loading ? <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Checking</span> : null} />
      <div className="grid gap-2 px-4 py-3">
        {statuses.map((status) => (
          <div key={status.key} title={status.message} className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            <StatusIcon tone={status.tone} icon={status.tone === "success" ? "check" : status.tone === "error" ? "failed" : "alert"} />
            <span>{status.label}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function SnapshotCard({ stats, songsLoading }: { stats: LibraryStats; songsLoading: boolean }) {
  return (
    <DashboardCard>
      <CardTitle title="Library Snapshot" description="Fast links into common review filters." />
      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total Songs" value={songsLoading ? "—" : stats.totalSongs} helper="songs in library" href="/admin/music-library" />
        <MetricCard label="Missing Cover" value={songsLoading ? "—" : stats.missingCoverArt} helper="need cover art" href="/admin/music-library?issue=coverArt" issueTone={!songsLoading && stats.missingCoverArt > 0 ? "error" : "neutral"} />
        <MetricCard label="Missing Info" value={songsLoading ? "—" : stats.missingSongInfo} helper="need metadata" href="/admin/music-library?issue=songInfo" issueTone={!songsLoading && stats.missingSongInfo > 0 ? "error" : "neutral"} />
        <MetricCard label="Missing Peaks" value={songsLoading ? "—" : stats.missingWaveformPeaks} helper="need waveform data" href="/admin/music-library?issue=peakData" issueTone={!songsLoading && stats.missingWaveformPeaks > 0 ? "error" : "neutral"} />
        <MetricCard label="Missing Tags" value={songsLoading ? "—" : stats.missingTags} helper="need filtering tags" href="/admin/music-library?issue=tags" issueTone={!songsLoading && stats.missingTags > 0 ? "warning" : "neutral"} />
        <MetricCard label="Missing Edits" value={songsLoading ? "—" : stats.missingEditPoints} helper="need markers" href="/admin/music-library?issue=editPoints" />
      </div>
    </DashboardCard>
  );
}

export default function AdminDashboardPage() {
  const { user, isLoaded } = useUser();
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;
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
    const missingCoverArt = songs.filter((song) => songHasIssue(song, "coverArt")).length;
    const missingSongInfo = songs.filter((song) => songHasIssue(song, "songInfo")).length;
    const missingWaveformPeaks = songs.filter((song) => songHasIssue(song, "waveformPeaks")).length;
    const missingTags = songs.filter((song) => songHasIssue(song, "tags")).length;
    const missingEditPoints = songs.filter((song) => songHasIssue(song, "editPoints")).length;

    return { totalSongs: songs.length, missingCoverArt, missingSongInfo, missingWaveformPeaks, missingTags, missingEditPoints };
  }, [songs]);

  const healthStatus: StatusTone = useMemo(() => {
    if (stats.missingCoverArt > 0 || stats.missingSongInfo > 0 || stats.missingWaveformPeaks > 0) return "error";
    if (stats.missingTags > 0) return "warning";
    return "success";
  }, [stats]);

  const recentSongs = useMemo(() => [...songs].reverse().slice(0, 10), [songs]);
  const completeChecks = [stats.missingCoverArt === 0, stats.missingSongInfo === 0, stats.missingWaveformPeaks === 0, stats.missingTags === 0, stats.missingEditPoints === 0].filter(Boolean).length;
  const healthProgress = songsLoading ? 0 : Math.round((completeChecks / 5) * 100);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
        <div className="px-8 pt-8 text-sm text-[var(--text-secondary)]">Loading...</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
        <div className="px-8 pt-14">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium text-[var(--text-primary)]">Admin</h1>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">You do not have access to this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <style>{`
        .admin-song-row.is-error { background: var(--status-error-faint); }
        .admin-song-row.is-warning { background: var(--status-warning-faint); }
        .admin-song-row.is-error:hover { background: var(--status-error-hover); }
        .admin-song-row.is-warning:hover { background: var(--status-warning-hover); }
        .admin-song-select-wrap { opacity: 0; pointer-events: none; }
        .admin-metric-card-error { background: var(--status-error-faint); }
        .admin-metric-card-warning { background: var(--status-warning-faint); }
        .admin-metric-card-error:hover { background: var(--status-error-hover); }
        .admin-metric-card-warning:hover { background: var(--status-warning-hover); }
        .admin-attention-item-error { background: var(--status-error-faint); }
        .admin-attention-item-warning { background: var(--status-warning-faint); }
        .admin-attention-item-error:hover { background: var(--status-error-hover); }
        .admin-attention-item-warning:hover { background: var(--status-warning-hover); }
      `}</style>

      <section className="min-h-screen px-5 pt-[88px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[1180px]" style={{ paddingBottom: playerVisible ? "104px" : "32px" }}>
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="text-xs text-[var(--text-muted)]">Admin / <span className="text-[var(--text-secondary)]">Dashboard</span></div>
            <Link href="/admin/songs/new" className={`${primaryPillButtonClass} hidden md:flex`}>
              <UploadIcon size={13} />
              <span>Upload Song</span>
            </Link>
          </div>

          <AdminHero totalSongs={stats.totalSongs} progress={healthProgress} healthStatus={healthStatus} systemStatuses={systemStatuses} songsLoading={songsLoading} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-4">
              <DashboardCard>
                <CardTitle title="Admin Operations" description="Common library management actions." />
                <div>{quickActions.map((action) => <ActionRow key={action.href} {...action} />)}</div>
              </DashboardCard>

              <LibraryQualityCard stats={stats} healthStatus={healthStatus} songsLoading={songsLoading} />

              <DashboardCard>
                <CardTitle title="Review Queue" description="Last 10 songs needing review." action={<Link href="/admin/music-library" className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">View Library</Link>} />
                <div className="overflow-x-auto overflow-y-hidden">
                  <div className="min-w-[790px]">
                    <div className="grid h-8 grid-cols-[48px_minmax(160px,1.4fr)_minmax(120px,1fr)_24px_minmax(112px,140px)_64px_76px_64px] items-center gap-3 border-b border-[var(--border)] px-6 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      <div />
                      <div>Song</div>
                      <div>Artist</div>
                      <div />
                      <div>Status</div>
                      <div>Key</div>
                      <div>BPM</div>
                      <div />
                    </div>

                    {songsLoading && (
                      <div className="grid gap-0">
                        {Array.from({ length: 10 }, (_, index) => (
                          <div key={index} className="grid min-h-[46px] grid-cols-[48px_minmax(160px,1.4fr)_minmax(120px,1fr)_24px_minmax(112px,140px)_64px_76px_64px] items-center gap-3 px-6" style={{ borderBottom: index === 9 ? "none" : "1px solid var(--border-subtle)" }}>
                            <div className="h-7 w-7 rounded bg-[var(--bg-tertiary)]" />
                            <div className="h-2 w-[60%] bg-[var(--bg-tertiary)]" />
                            <div className="h-2 w-[50%] bg-[var(--bg-tertiary)]" />
                            <div className="h-2 w-2 rounded-full bg-[var(--bg-tertiary)]" />
                            <div className="h-2 w-[68px] bg-[var(--bg-tertiary)]" />
                            <div className="h-2 w-[32px] bg-[var(--bg-tertiary)]" />
                            <div className="h-2 w-[42px] bg-[var(--bg-tertiary)]" />
                            <div className="h-2 w-[18px] bg-[var(--bg-tertiary)]" />
                          </div>
                        ))}
                      </div>
                    )}

                    {!songsLoading && recentSongs.length === 0 && <div className="flex min-h-[140px] items-center justify-center px-6 text-sm text-[var(--text-secondary)]">No songs uploaded yet.</div>}

                    {!songsLoading && recentSongs.map((song, index) => (
                      <AdminSongRow key={song.id} song={song} isLast={index === recentSongs.length - 1} selected={false} selectionMode={false} showSelectionColumn={false} onSelectedChange={() => {}} onDeleted={(songId) => setSongs((prev) => prev.filter((item) => item.id !== songId))} />
                    ))}
                  </div>
                </div>
              </DashboardCard>
            </div>

            <div className="grid content-start gap-4">
              <NeedsAttentionCard stats={stats} songsLoading={songsLoading} />
              <NextBestActionCard stats={stats} songsLoading={songsLoading} />
              <SystemStatusCard statuses={systemStatuses} loading={systemHealthLoading} />
            </div>
          </div>

          {songsError && <div className="mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">{songsError}</div>}

          <div className="mt-4">
            <SnapshotCard stats={stats} songsLoading={songsLoading} />
          </div>
        </div>
      </section>
    </main>
  );
}
