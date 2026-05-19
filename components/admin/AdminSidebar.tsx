"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DashboardIcon from "@/components/icons/DashboardIcon";
import EngagementIcon from "@/components/icons/EngagementIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import { usePlayer } from "@/context/PlayerContext";

type AdminNavItem = {
  label: string;
  href: string;
  status?: "soon";
};

type PrimaryNavItem = AdminNavItem & {
  icon: "dashboard" | "engagement";
};

type AdminNavGroup = {
  title: string;
  links: AdminNavItem[];
};

type StatusTone = "success" | "warning" | "error";

type SystemHealthItem = {
  key: string;
  label: string;
  tone: StatusTone;
  message: string;
};

type ConsoleStatus = {
  key: string;
  label: string;
  value: string;
  tone: StatusTone;
};

const primaryLinks: PrimaryNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Engagement", href: "/admin/engagement", icon: "engagement" },
];

const navGroups: AdminNavGroup[] = [
  {
    title: "Upload",
    links: [
      { label: "Song Upload", href: "/admin/songs/new" },
      { label: "Upload Queue", href: "/admin/queue", status: "soon" },
    ],
  },
  {
    title: "Database",
    links: [
      { label: "Music Library", href: "/admin/music-library" },
      { label: "Playlist Manager", href: "/admin/playlist-manager" },
      { label: "Edit Points", href: "/admin/edit-points", status: "soon" },
    ],
  },
  {
    title: "System",
    links: [
      { label: "Storage Health", href: "/admin/storage", status: "soon" },
      { label: "Settings", href: "/admin/settings", status: "soon" },
    ],
  },
];

const STATUS_COLORS = {
  success: "var(--status-success, #48b571)",
  warning: "var(--status-warning, #d9a441)",
  error: "var(--status-error, #dc584f)",
};

const DEFAULT_CONSOLE_STATUSES: ConsoleStatus[] = [
  { key: "supabase", label: "SUPABASE", value: "CHECKING", tone: "warning" },
  { key: "r2_music", label: "MUSIC_LIB", value: "CHECKING", tone: "warning" },
  { key: "r2_images", label: "IMG_STORE", value: "CHECKING", tone: "warning" },
  { key: "analyzer", label: "ANALYZER", value: "CHECKING", tone: "warning" },
];

function getConsoleValue(tone: StatusTone) {
  if (tone === "success") return "READY";
  if (tone === "warning") return "WARN";
  return "ERROR";
}

function mapSystemHealthToConsole(statuses: SystemHealthItem[]): ConsoleStatus[] {
  return DEFAULT_CONSOLE_STATUSES.map((def) => {
    const match = statuses.find((s) => s.key === def.key);
    return match
      ? { ...def, value: getConsoleValue(match.tone), tone: match.tone }
      : { ...def, value: "UNKNOWN" };
  });
}

function PrimaryIcon({ icon }: { icon: PrimaryNavItem["icon"] }) {
  if (icon === "dashboard") return <DashboardIcon size={14} />;
  return <EngagementIcon size={14} />;
}

function AdminNavLink({ label, href, status }: AdminNavItem) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`group flex h-7 items-center justify-between gap-3 rounded-md px-2.5 text-[13px] font-medium transition ${
        active
          ? "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
      }`}
    >
      <span className="truncate">{label}</span>
      {status && (
        <span className="ml-auto rounded-full bg-[var(--bg-tertiary)] px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
          Soon
        </span>
      )}
    </Link>
  );
}

function PrimaryNavLink({ label, href, icon }: PrimaryNavItem) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition ${
        active
          ? "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center transition ${
        active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
      }`}>
        <PrimaryIcon icon={icon} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function AdminNavSection({ title, links }: AdminNavGroup) {
  return (
    <div className="shrink-0">
      <div className="mb-2 px-2.5 text-[11px] font-medium text-[var(--text-muted)]">{title}</div>
      <div className="space-y-[2px]">
        {links.map((link) => (
          <AdminNavLink key={link.href} label={link.label} href={link.href} status={link.status} />
        ))}
      </div>
    </div>
  );
}

function SystemStatusConsole({
  statuses,
  loading,
  lastChecked,
}: {
  statuses: ConsoleStatus[];
  loading: boolean;
  lastChecked: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
        <span>Console</span>
        <span>{loading ? "Check" : "Live"}</span>
      </div>

      <div className="space-y-1.5 font-mono text-[9px]">
        {statuses.map((status) => (
          <div key={status.key} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[var(--text-secondary)]">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status.tone] }}
              />
              <span className="truncate">{status.label}</span>
            </div>
            <span
              className="shrink-0 text-[9px]"
              style={{ color: status.tone === "success" ? "var(--text-primary)" : STATUS_COLORS[status.tone] }}
            >
              {status.value}
            </span>
          </div>
        ))}

        <div className="border-t border-[var(--border)] pt-1.5 font-mono text-[8px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Check: {lastChecked}
        </div>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  const [consoleStatuses, setConsoleStatuses] = useState<ConsoleStatus[]>(DEFAULT_CONSOLE_STATUSES);
  const [systemHealthLoading, setSystemHealthLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState("pending");

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        setSystemHealthLoading(true);
        const res = await fetch("/api/admin/system-health", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load system health.");
        const data = await res.json();
        setConsoleStatuses(mapSystemHealthToConsole(data.statuses || []));
        setLastChecked("just now");
      } catch {
        setConsoleStatuses(
          DEFAULT_CONSOLE_STATUSES.map((s) => ({ ...s, value: "ERROR", tone: "error" as StatusTone })),
        );
        setLastChecked("failed");
      } finally {
        setSystemHealthLoading(false);
      }
    };
    fetchSystemHealth();
  }, []);

  return (
    <aside
      className="fixed left-0 z-30 hidden w-[var(--admin-sidebar-width)] border-r border-[var(--border)] bg-[var(--bg-primary)] md:flex md:flex-col"
      style={{ top: "56px", bottom: playerVisible ? "64px" : "0px" }}
    >
      <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-6 pb-6">
        <div className="shrink-0">
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-left text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
          >
            <SearchIcon size={14} />
            <span className="min-w-0 flex-1 truncate">Quick search...</span>
            <span className="text-[11px] text-[var(--text-muted)]">⌘K</span>
          </button>
        </div>

        <div className="mt-5 border-b border-[var(--border)] pb-5">
          <div className="space-y-[2px]">
            {primaryLinks.map((link) => (
              <PrimaryNavLink key={link.href} label={link.label} href={link.href} icon={link.icon} status={link.status} />
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          {navGroups.map((section) => (
            <AdminNavSection key={section.title} title={section.title} links={section.links} />
          ))}
        </div>

        <div className="mt-auto pt-6">
          <SystemStatusConsole
            statuses={consoleStatuses}
            loading={systemHealthLoading}
            lastChecked={lastChecked}
          />
        </div>
      </div>
    </aside>
  );
}
