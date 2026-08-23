"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BackendSidebarGroup,
  BackendSidebarHeading,
  BackendSidebarNavItem,
  BackendSidebarScrollArea,
  BackendSidebarShell,
} from "@/components/backend/BackendSidebar";
import DashboardIcon from "@/components/icons/DashboardIcon";
import EngagementIcon from "@/components/icons/EngagementIcon";
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
      { label: "Music Review", href: "/admin/music-review" },
      { label: "Artists", href: "/admin/artists" },
      { label: "Playlist Manager", href: "/admin/playlist-manager" },
      { label: "Cue Points", href: "/admin/edit-points" },
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
    const match = statuses.find((status) => status.key === def.key);
    return match
      ? { ...def, value: getConsoleValue(match.tone), tone: match.tone }
      : { ...def, value: "UNKNOWN" };
  });
}

function PrimaryIcon({ icon }: { icon: PrimaryNavItem["icon"] }) {
  if (icon === "dashboard") return <DashboardIcon size={14} />;
  return <EngagementIcon size={14} />;
}

function SoonBadge() {
  return (
    <span className="bg-[var(--bg-tertiary)] px-1.5 py-[1px] text-[8px] font-[320] uppercase tracking-[0.04em] text-[var(--text-muted)]">
      Soon
    </span>
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
    <div className="border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5">
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
              className="shrink-0 text-[9px] font-[320]"
              style={{
                color:
                  status.tone === "success"
                    ? "var(--text-primary)"
                    : STATUS_COLORS[status.tone],
              }}
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
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  const [consoleStatuses, setConsoleStatuses] = useState<ConsoleStatus[]>(
    DEFAULT_CONSOLE_STATUSES,
  );
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
          DEFAULT_CONSOLE_STATUSES.map((status) => ({
            ...status,
            value: "ERROR",
            tone: "error" as StatusTone,
          })),
        );
        setLastChecked("failed");
      } finally {
        setSystemHealthLoading(false);
      }
    };
    void fetchSystemHealth();
  }, []);

  return (
    <BackendSidebarShell bottom={playerVisible ? "64px" : "0px"}>
      <BackendSidebarScrollArea>
        <div className="border-b border-[var(--border)] pb-8">
          <BackendSidebarHeading>Admin</BackendSidebarHeading>
          <div className="flex flex-col gap-px">
            {primaryLinks.map((link) => (
              <BackendSidebarNavItem
                key={link.href}
                href={link.href}
                active={pathname === link.href}
                leading={<PrimaryIcon icon={link.icon} />}
                trailing={link.status ? <SoonBadge /> : null}
              >
                {link.label}
              </BackendSidebarNavItem>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8">
          {navGroups.map((group) => (
            <BackendSidebarGroup key={group.title} title={group.title}>
              {group.links.map((link) => (
                <BackendSidebarNavItem
                  key={link.href}
                  href={link.href}
                  active={pathname === link.href}
                  trailing={link.status ? <SoonBadge /> : null}
                >
                  {link.label}
                </BackendSidebarNavItem>
              ))}
            </BackendSidebarGroup>
          ))}
        </div>

        <div className="mt-auto pt-8">
          <SystemStatusConsole
            statuses={consoleStatuses}
            loading={systemHealthLoading}
            lastChecked={lastChecked}
          />
        </div>
      </BackendSidebarScrollArea>
    </BackendSidebarShell>
  );
}
