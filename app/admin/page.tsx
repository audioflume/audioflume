"use client";

import type { Song } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { usePlayer } from "@/context/PlayerContext";
import {
  iconButtonClass,
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
import AdminSongRow from "@/components/admin/AdminSongRow";
import { songHasIssue } from "@/lib/songHealth";

type QuickAction = {
  label: string;
  href: string;
  description: string;
  icon: "upload" | "music" | "waveform" | "folder";
};

type StatusTone = "success" | "warning" | "error";
type IssueTone = StatusTone | "neutral";

type SystemHealthItem = {
  key: string;
  label: string;
  tone: StatusTone;
  message: string;
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

const DEFAULT_SYSTEM_STATUSES: SystemHealthItem[] = [
  {
    key: "airtable",
    label: "Airtable connected",
    tone: "warning",
    message: "Not checked yet.",
  },
  {
    key: "r2",
    label: "Cloudflare R2 ready",
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

const SYSTEM_HEALTH_FAILED_STATUSES: SystemHealthItem[] = [
  {
    key: "airtable",
    label: "Airtable connected",
    tone: "error",
    message: "System health check failed.",
  },
  {
    key: "r2",
    label: "Cloudflare R2 ready",
    tone: "error",
    message: "System health check failed.",
  },
  {
    key: "analyzer",
    label: "Analyzer ready",
    tone: "error",
    message: "System health check failed.",
  },
];

const quickActions: QuickAction[] = [
  {
    label: "New Song Upload",
    href: "/admin/songs/new",
    description: "Upload music, cover art, stems, and metadata.",
    icon: "upload",
  },
  {
    label: "Music Library",
    href: "/admin/music-library",
    description: "Search, preview, edit, and manage uploaded songs.",
    icon: "music",
  },
  {
    label: "SFX Upload",
    href: "/admin/sfx/new",
    description: "Upload sound effects and metadata.",
    icon: "waveform",
  },
  {
    label: "Asset Manager",
    href: "/admin/assets",
    description: "Manage downloadable visual assets.",
    icon: "folder",
  },
];

function UploadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 16V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7.5 8.5L12 4L16.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 18.5C9 19.8807 7.65685 21 6 21C4.34315 21 3 19.8807 3 18.5C3 17.1193 4.34315 16 6 16C7.65685 16 9 17.1193 9 18.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M21 16.5C21 17.8807 19.6569 19 18 19C16.3431 19 15 17.8807 15 16.5C15 15.1193 16.3431 14 18 14C19.6569 14 21 15.1193 21 16.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M9 18.5V5.5L21 3.5V16.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 9L21 7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QualityScoreIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 19V12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 19V5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 19V9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 13V11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M8 17V7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12 20V4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 16V8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M20 13V11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7.5C4 6.67157 4.67157 6 5.5 6H9.4L11.1 8H18.5C19.3284 8 20 8.67157 20 9.5V17.5C20 18.3284 19.3284 19 18.5 19H5.5C4.67157 19 4 18.3284 4 17.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 17L17 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 7H17V15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4L21 20H3L12 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 9V13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 16.5H12.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FailedIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusIcon({
  tone,
  icon,
}: {
  tone: StatusTone;
  icon: "check" | "alert" | "failed";
}) {
  const color = STATUS_COLORS[tone];

  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full"
      style={{
        backgroundColor: `${color}1f`,
        color,
      }}
    >
      {icon === "check" && <CheckIcon />}
      {icon === "alert" && <AlertIcon />}
      {icon === "failed" && <FailedIcon />}
    </div>
  );
}

function TaskStatusIcon({ tone }: { tone: IssueTone }) {
  if (tone === "neutral") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
        <AlertIcon />
      </div>
    );
  }

  return (
    <StatusIcon
      tone={tone}
      icon={
        tone === "success" ? "check" : tone === "error" ? "failed" : "alert"
      }
    />
  );
}

function HealthStatusIcon({ status }: { status: StatusTone }) {
  const color = STATUS_COLORS[status];

  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-md"
      style={{
        backgroundColor: `${color}1f`,
        color,
      }}
    >
      {status === "success" && <CheckIcon />}
      {status === "warning" && <AlertIcon />}
      {status === "error" && <FailedIcon />}
    </div>
  );
}

function ActionIcon({ icon }: { icon: QuickAction["icon"] }) {
  if (icon === "upload") return <UploadIcon />;
  if (icon === "music") return <MusicIcon />;
  if (icon === "waveform") return <WaveformIcon />;
  return <FolderIcon />;
}

function getProgressColor(progress: number) {
  if (progress <= 0) return HEALTH_PROGRESS_COLORS.error;
  if (progress >= 100) return HEALTH_PROGRESS_COLORS.success;

  if (progress < 50) {
    const ratio = progress / 50;
    return interpolateHexColor(
      HEALTH_PROGRESS_COLORS.error,
      HEALTH_PROGRESS_COLORS.warning,
      ratio,
    );
  }

  const ratio = (progress - 50) / 50;
  return interpolateHexColor(
    HEALTH_PROGRESS_COLORS.warning,
    HEALTH_PROGRESS_COLORS.success,
    ratio,
  );
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

function MetricCard({
  label,
  value,
  helper,
  href,
  issueTone = "neutral",
}: {
  label: string;
  value: number | string;
  helper: string;
  href?: string;
  issueTone?: "neutral" | "warning" | "error";
}) {
  const issueClass =
    issueTone === "error"
      ? "admin-metric-card-error"
      : issueTone === "warning"
        ? "admin-metric-card-warning"
        : "";

  const content = (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] transition hover:bg-[var(--bg-hover)] ${issueClass}`}
    >
      <div className="px-4 pt-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="mt-2 text-[30px] leading-none tracking-[-0.04em] text-[var(--text-primary)]">
          {value}
        </div>

        <div className="mt-2 text-xs text-[var(--text-secondary)]">
          {helper}
        </div>
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

function ActionCard({ label, href, description, icon }: QuickAction) {
  return (
    <Link
      href={href}
      className="admin-action-card group relative block rounded-xl bg-[var(--bg-tertiary)] p-5 transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition group-hover:text-[var(--text-primary)]">
          <ActionIcon icon={icon} />
        </div>

        <div
          className={`${iconButtonClass} group-hover:bg-[var(--icon-button-hover)] group-hover:text-[var(--text-primary)]`}
        >
          <ArrowIcon />
        </div>
      </div>

      <div className="mt-5 font-[family-name:var(--font-instrument-sans)] text-sm font-medium text-[var(--text-primary)]">
        {label}
      </div>

      <p className="mt-2 max-w-[240px] text-xs leading-5 text-[var(--text-secondary)]">
        {description}
      </p>
    </Link>
  );
}

function LibraryQualityCard({
  totalSongs,
  missingCoverArt,
  missingSongInfo,
  missingWaveformPeaks,
  missingTags,
  missingEditPoints,
  healthStatus,
  songsLoading,
}: {
  totalSongs: number;
  missingCoverArt: number;
  missingSongInfo: number;
  missingWaveformPeaks: number;
  missingTags: number;
  missingEditPoints: number;
  healthStatus: StatusTone;
  songsLoading: boolean;
}) {
  const checks = [
    missingCoverArt === 0,
    missingSongInfo === 0,
    missingWaveformPeaks === 0,
    missingTags === 0,
    missingEditPoints === 0,
  ];

  const completeChecks = checks.filter(Boolean).length;
  const progress = songsLoading
    ? 0
    : Math.round((completeChecks / checks.length) * 100);
  const progressColor = getProgressColor(progress);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Library Health
        </div>

        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          <QualityScoreIcon />
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="text-[36px] leading-none tracking-[-0.05em] text-[var(--text-primary)]">
          {songsLoading ? "—" : `${progress}%`}
        </div>

        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
          {songsLoading
            ? "Checking library metadata..."
            : "Based on cover art, song info, waveform peaks, tags, and edit point completion."}
        </p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>

        <div className="mt-4 grid gap-x-8 gap-y-3 pb-1.5 text-xs text-[var(--text-secondary)] md:grid-cols-[1fr_1fr_1fr_1fr]">
          <div className="flex items-start gap-2">
            <div className="translate-y-[-2px]">
              <HealthStatusIcon status={healthStatus} />
            </div>

            <span>
              {completeChecks} of {checks.length} checks complete
            </span>
          </div>

          <div className="grid gap-3">
            <div>{missingSongInfo} missing info</div>
            <div>{missingEditPoints} missing edit points</div>
          </div>

          <div className="grid gap-3">
            <div>{totalSongs} songs scanned</div>
            <div>{missingWaveformPeaks} missing peaks</div>
          </div>

          <div className="grid gap-3">
            <div>{missingCoverArt} missing cover art</div>
            <div>{missingTags} missing tags</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeedsAttentionCard({
  missingCoverArt,
  missingSongInfo,
  missingWaveformPeaks,
  missingTags,
  missingEditPoints,
  songsLoading,
}: {
  missingCoverArt: number;
  missingSongInfo: number;
  missingWaveformPeaks: number;
  missingTags: number;
  missingEditPoints: number;
  songsLoading: boolean;
}) {
  const hasFailedIssues =
    missingCoverArt > 0 || missingSongInfo > 0 || missingWaveformPeaks > 0;

  const hasWarningIssues = missingTags > 0;

  const headerTone: StatusTone = hasFailedIssues
    ? "error"
    : hasWarningIssues
      ? "warning"
      : "success";

  const tasks: {
    label: string;
    value: number;
    helper: string;
    issueTone: IssueTone;
  }[] = [
    {
      label: "Cover art",
      value: missingCoverArt,
      helper: "missing artwork",
      issueTone: "error",
    },
    {
      label: "Song info",
      value: missingSongInfo,
      helper: "metadata fields",
      issueTone: "error",
    },
    {
      label: "Waveform peaks",
      value: missingWaveformPeaks,
      helper: "waveform data",
      issueTone: "error",
    },
    {
      label: "Tags",
      value: missingTags,
      helper: "filtering metadata",
      issueTone: "warning",
    },
    {
      label: "Edit points",
      value: missingEditPoints,
      helper: "markers or ranges",
      issueTone: "neutral",
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Needs Attention
        </div>

        <HealthStatusIcon status={headerTone} />
      </div>

      <div className="grid gap-2 px-4 py-3">
        {tasks.map((task) => {
          const isComplete = !songsLoading && task.value === 0;
          const activeTone = isComplete ? "success" : task.issueTone;
          const issueClass =
            !isComplete && task.issueTone === "error"
              ? "admin-attention-item-error"
              : !isComplete && task.issueTone === "warning"
                ? "admin-attention-item-warning"
                : "";

          return (
            <div
              key={task.label}
              className={`flex h-10 items-center justify-between gap-3 rounded-lg bg-[var(--bg-tertiary)] px-3 transition ${issueClass}`}
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  {task.label}
                </div>

                <div className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                  {songsLoading
                    ? "Checking..."
                    : isComplete
                      ? "Complete"
                      : task.helper}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {songsLoading ? "—" : task.value}
                </span>

                <TaskStatusIcon tone={activeTone} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NextBestActionCard({
  missingCoverArt,
  missingSongInfo,
  missingWaveformPeaks,
  missingTags,
  missingEditPoints,
  songsLoading,
}: {
  missingCoverArt: number;
  missingSongInfo: number;
  missingWaveformPeaks: number;
  missingTags: number;
  missingEditPoints: number;
  songsLoading: boolean;
}) {
  const totalIssues =
    missingCoverArt +
    missingSongInfo +
    missingWaveformPeaks +
    missingTags +
    missingEditPoints;

  const actionHref =
    missingCoverArt > 0
      ? "/admin/music-library?issue=coverArt"
      : missingSongInfo > 0
        ? "/admin/music-library?issue=songInfo"
        : missingWaveformPeaks > 0
          ? "/admin/music-library?issue=peakData"
          : missingTags > 0
            ? "/admin/music-library?issue=tags"
            : missingEditPoints > 0
              ? "/admin/music-library?issue=editPoints"
              : "/admin/music-library";

  const actionText =
    missingCoverArt > 0
      ? `Add cover art to ${missingCoverArt} song${missingCoverArt === 1 ? "" : "s"} to complete library artwork.`
      : missingSongInfo > 0
        ? `Add missing song info to ${missingSongInfo} song${missingSongInfo === 1 ? "" : "s"} to complete library metadata.`
        : missingWaveformPeaks > 0
          ? `Generate waveform peak data for ${missingWaveformPeaks} song${missingWaveformPeaks === 1 ? "" : "s"}.`
          : missingTags > 0
            ? `Add missing tags to ${missingTags} song${missingTags === 1 ? "" : "s"} to improve filtering.`
            : missingEditPoints > 0
              ? `Add edit point data to ${missingEditPoints} song${missingEditPoints === 1 ? "" : "s"} to improve waveform filtering.`
              : totalIssues > 0
                ? `Clean up ${totalIssues} remaining library issue${totalIssues === 1 ? "" : "s"}.`
                : "Your music library is looking clean. Upload the next track when ready.";

  return (
    <div className="rounded-xl bg-[var(--bg-tertiary)]">
      <div className="px-4 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Next Best Action
      </div>

      <div className="px-4 pb-4">
        <h2 className="mt-2 text-sm font-medium leading-5 tracking-[-0.01em] text-[var(--text-primary)]">
          {songsLoading ? "Reviewing library status..." : actionText}
        </h2>

        <Link href={actionHref} className={`mt-3 ${secondaryPillButtonClass}`}>
          Review Library
        </Link>
      </div>
    </div>
  );
}

function SystemStatusCard({
  statuses,
  loading,
}: {
  statuses: SystemHealthItem[];
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          System Status
        </div>

        {loading && (
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Checking
          </div>
        )}
      </div>

      <div className="grid gap-2 px-4 py-3">
        {statuses.map((status) => (
          <div
            key={status.key}
            title={status.message}
            className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]"
          >
            <StatusIcon
              tone={status.tone}
              icon={
                status.tone === "success"
                  ? "check"
                  : status.tone === "error"
                    ? "failed"
                    : "alert"
              }
            />

            <span>{status.label}</span>
          </div>
        ))}
      </div>
    </div>
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
  const [systemStatuses, setSystemStatuses] = useState<SystemHealthItem[]>(
    DEFAULT_SYSTEM_STATUSES,
  );
  const [systemHealthLoading, setSystemHealthLoading] = useState(true);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setSongsLoading(true);
        setSongsError("");

        const res = await fetch("/api/songs");

        if (!res.ok) {
          throw new Error("Failed to load songs.");
        }

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

    if (isLoaded && isAdmin) {
      fetchSongs();
    }
  }, [isLoaded, isAdmin]);

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        setSystemHealthLoading(true);

        const res = await fetch("/api/admin/system-health", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load system health.");
        }

        const data = await res.json();

        setSystemStatuses(data.statuses || DEFAULT_SYSTEM_STATUSES);
      } catch {
        setSystemStatuses(SYSTEM_HEALTH_FAILED_STATUSES);
      } finally {
        setSystemHealthLoading(false);
      }
    };

    if (isLoaded && isAdmin) {
      fetchSystemHealth();
    }
  }, [isLoaded, isAdmin]);

  const stats = useMemo(() => {
    const missingCoverArt = songs.filter((song) =>
      songHasIssue(song, "coverArt"),
    ).length;
    const missingSongInfo = songs.filter((song) =>
      songHasIssue(song, "songInfo"),
    ).length;
    const missingWaveformPeaks = songs.filter((song) =>
      songHasIssue(song, "waveformPeaks"),
    ).length;
    const missingTags = songs.filter((song) =>
      songHasIssue(song, "tags"),
    ).length;
    const missingEditPoints = songs.filter((song) =>
      songHasIssue(song, "editPoints"),
    ).length;

    return {
      totalSongs: songs.length,
      missingCoverArt,
      missingSongInfo,
      missingWaveformPeaks,
      missingTags,
      missingEditPoints,
    };
  }, [songs]);

  const healthStatus: StatusTone = useMemo(() => {
    const hasFailedIssues =
      stats.missingCoverArt > 0 ||
      stats.missingSongInfo > 0 ||
      stats.missingWaveformPeaks > 0;

    if (hasFailedIssues) return "error";
    if (stats.missingTags > 0) return "warning";

    return "success";
  }, [stats]);

  const recentSongs = useMemo(() => {
    return [...songs].reverse().slice(0, 10);
  }, [songs]);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[280px]">
        <div className="px-8 pt-8 text-sm text-[var(--text-secondary)]">
          Loading...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[280px]">
        <div className="px-8 pt-14">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium text-[var(--text-primary)]">
            Admin
          </h1>

          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            You do not have access to this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[280px]">
      <style>{`
        .admin-action-card:hover {
          background: var(--bg-hover);
        }

        .light .admin-action-card:hover {
          background: color-mix(in srgb, var(--bg-tertiary) 94%, #000 2%);
        }

        .admin-song-row.is-error {
          background: var(--status-error-faint);
        }

        .admin-song-row.is-warning {
          background: var(--status-warning-faint);
        }

        .admin-song-row.is-error:hover {
          background: var(--status-error-hover);
        }

        .admin-song-row.is-warning:hover {
          background: var(--status-warning-hover);
        }

        .admin-song-select-wrap {
          opacity: 0;
          pointer-events: none;
        }

        .admin-metric-card-error {
          background: var(--status-error-faint);
        }

        .admin-metric-card-warning {
          background: var(--status-warning-faint);
        }

        .admin-metric-card-error:hover {
          background: var(--status-error-hover);
        }

        .admin-metric-card-warning:hover {
          background: var(--status-warning-hover);
        }

        .admin-attention-item-error {
          background: var(--status-error-faint);
        }

        .admin-attention-item-warning {
          background: var(--status-warning-faint);
        }

        .admin-attention-item-error:hover {
          background: var(--status-error-hover);
        }

        .admin-attention-item-warning:hover {
          background: var(--status-warning-hover);
        }
      `}</style>

      <section className="min-h-screen">
        <div className="flex items-end justify-between gap-4 px-8 pt-14 pb-8">
          <div>
            <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Upload, review, and manage Filmwave library content.
            </p>
          </div>

          <Link
            href="/admin/songs/new"
            className={`${primaryPillButtonClass} hidden md:flex`}
          >
            <UploadIcon />
            <span>Upload Song</span>
          </Link>
        </div>

        <div
          className="px-8"
          style={{
            paddingBottom: playerVisible ? "104px" : "32px",
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <ActionCard
                key={action.href}
                label={action.label}
                href={action.href}
                description={action.description}
                icon={action.icon}
              />
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid gap-3">
              <LibraryQualityCard
                totalSongs={stats.totalSongs}
                missingCoverArt={stats.missingCoverArt}
                missingSongInfo={stats.missingSongInfo}
                missingWaveformPeaks={stats.missingWaveformPeaks}
                missingTags={stats.missingTags}
                missingEditPoints={stats.missingEditPoints}
                healthStatus={healthStatus}
                songsLoading={songsLoading}
              />

              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
                <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
                  <div>
                    <h2 className="text-sm font-medium text-[var(--text-primary)]">
                      Review Queue
                    </h2>

                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Last 10 songs needing review.
                    </p>
                  </div>

                  <Link
                    href="/admin/music-library"
                    className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                  >
                    View Library
                  </Link>
                </div>

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
                          <div
                            key={index}
                            className="grid min-h-[46px] grid-cols-[48px_minmax(160px,1.4fr)_minmax(120px,1fr)_24px_minmax(112px,140px)_64px_76px_64px] items-center gap-3 px-6"
                            style={{
                              borderBottom:
                                index === 9
                                  ? "none"
                                  : "1px solid var(--border-subtle)",
                            }}
                          >
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

                    {!songsLoading && recentSongs.length === 0 && (
                      <div className="flex min-h-[140px] items-center justify-center px-6 text-sm text-[var(--text-secondary)]">
                        No songs uploaded yet.
                      </div>
                    )}

                    {!songsLoading &&
                      recentSongs.map((song, index) => (
                        <AdminSongRow
                          key={song.id}
                          song={song}
                          isLast={index === recentSongs.length - 1}
                          selected={false}
                          selectionMode={false}
                          showSelectionColumn={false}
                          onSelectedChange={() => {}}
                          onDeleted={(songId) => {
                            setSongs((prev) =>
                              prev.filter((item) => item.id !== songId),
                            );
                          }}
                        />
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <NeedsAttentionCard
                missingCoverArt={stats.missingCoverArt}
                missingSongInfo={stats.missingSongInfo}
                missingWaveformPeaks={stats.missingWaveformPeaks}
                missingTags={stats.missingTags}
                missingEditPoints={stats.missingEditPoints}
                songsLoading={songsLoading}
              />

              <NextBestActionCard
                missingCoverArt={stats.missingCoverArt}
                missingSongInfo={stats.missingSongInfo}
                missingWaveformPeaks={stats.missingWaveformPeaks}
                missingTags={stats.missingTags}
                missingEditPoints={stats.missingEditPoints}
                songsLoading={songsLoading}
              />

              <SystemStatusCard
                statuses={systemStatuses}
                loading={systemHealthLoading}
              />
            </div>
          </div>

          {songsError && (
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
              {songsError}
            </div>
          )}

          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Total Songs"
              value={songsLoading ? "—" : stats.totalSongs}
              helper="songs in library"
              href="/admin/music-library"
            />

            <MetricCard
              label="Missing Cover"
              value={songsLoading ? "—" : stats.missingCoverArt}
              helper="need cover art"
              href="/admin/music-library?issue=coverArt"
              issueTone={
                !songsLoading && stats.missingCoverArt > 0 ? "error" : "neutral"
              }
            />

            <MetricCard
              label="Missing Info"
              value={songsLoading ? "—" : stats.missingSongInfo}
              helper="need metadata"
              href="/admin/music-library?issue=songInfo"
              issueTone={
                !songsLoading && stats.missingSongInfo > 0 ? "error" : "neutral"
              }
            />

            <MetricCard
              label="Missing Peaks"
              value={songsLoading ? "—" : stats.missingWaveformPeaks}
              helper="need waveform data"
              href="/admin/music-library?issue=peakData"
              issueTone={
                !songsLoading && stats.missingWaveformPeaks > 0
                  ? "error"
                  : "neutral"
              }
            />

            <MetricCard
              label="Missing Tags"
              value={songsLoading ? "—" : stats.missingTags}
              helper="need filtering tags"
              href="/admin/music-library?issue=tags"
              issueTone={
                !songsLoading && stats.missingTags > 0 ? "warning" : "neutral"
              }
            />

            <MetricCard
              label="Missing Edit Points"
              value={songsLoading ? "—" : stats.missingEditPoints}
              helper="need markers/ranges"
              href="/admin/music-library?issue=editPoints"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
