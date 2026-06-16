import {
  SidebarCollapseControl,
  SidebarEmptyState,
  SidebarInner,
  SidebarLinkRow,
  SidebarNav,
  SidebarProjectsHeader,
  SidebarSection,
  SidebarShell,
  SideFilterPanelBehavior,
  type SidebarTooltipState,
} from "@filmwave/shared";
import { useEffect, useState, type ReactNode } from "react";
import type { Project } from "../../lib/mockFilmwaveApi";
import DashboardIcon from "../icons/DashboardIcon";
import FolderIcon from "../icons/FolderIcon";
import HeartIcon from "../icons/HeartIcon";
import MusicIcon from "../icons/MusicIcon";
import PlaylistIcon from "../icons/PlaylistIcon";
import WaveformIcon from "../icons/WaveformIcon";
import DesktopMusicLibraryView from "./music-library/DesktopMusicLibraryView";
import "./DesktopAppShell.css";
import "./DesktopScrollLock.css";
import "../../../../../packages/shared/styles/sidebar.css";

export type DesktopAppView =
  | "projects"
  | "music"
  | "playlists"
  | "discover"
  | "curated"
  | "settings";

const LAST_DESKTOP_VIEW_KEY = "filmwave.desktop.activeView";

function isDesktopAppView(value: string | null): value is DesktopAppView {
  return (
    value === "projects" ||
    value === "music" ||
    value === "playlists" ||
    value === "discover" ||
    value === "curated" ||
    value === "settings"
  );
}

type DesktopAppShellProps = {
  activeProjectId: string | null;
  activeView: DesktopAppView;
  header: ReactNode;
  children: ReactNode;
  musicApiBaseUrl?: string | null;
  projects: Project[];
  syncFolder?: string | null;
  onActiveProjectIdChange: (projectId: string | null) => void;
  onActiveViewChange: (view: DesktopAppView) => void;
};

type SidebarNavItem = {
  view?: DesktopAppView;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
};

function PlusIcon() {
  return (
    <span className="desktop-sidebar-plus-icon" aria-hidden="true">
      +
    </span>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="6"
      height="9"
      viewBox="0 0 7 10"
      fill="none"
      aria-hidden="true"
      className={collapsed ? "desktop-sidebar-collapse-icon is-collapsed" : "desktop-sidebar-collapse-icon"}
    >
      <path d="M6.2 1L1.8 5L6.2 9V1Z" fill="currentColor" />
    </svg>
  );
}

function CuratedIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <g transform="translate(7 7) scale(1.16) translate(-7 -7)">
        <path
          d="M4.15 3.1H9.2C9.9 3.1 10.45 3.65 10.45 4.35V9.4C10.45 10.1 9.9 10.65 9.2 10.65H4.15C3.45 10.65 2.9 10.1 2.9 9.4V4.35C2.9 3.65 3.45 3.1 4.15 3.1Z"
          stroke="currentColor"
          strokeWidth="1.45"
        />
        <path
          d="M4.35 1.75H9.85C11.15 1.75 12.25 2.85 12.25 4.15V8.95"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M6.65 5.05L7.05 5.9C7.14 6.1 7.3 6.26 7.5 6.35L8.35 6.75L7.5 7.15C7.3 7.24 7.14 7.4 7.05 7.6L6.65 8.45L6.25 7.6C6.16 7.4 6 7.24 5.8 7.15L4.95 6.75L5.8 6.35C6 6.26 6.16 6.1 6.25 5.9L6.65 5.05Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

export default function DesktopAppShell({
  activeProjectId,
  activeView,
  header,
  children,
  musicApiBaseUrl,
  projects,
  syncFolder,
  onActiveProjectIdChange,
  onActiveViewChange,
}: DesktopAppShellProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<SidebarTooltipState>(null);
  const effectivelyCollapsed = collapsed || autoCollapsed;

  useEffect(() => {
    const savedView = window.sessionStorage.getItem(LAST_DESKTOP_VIEW_KEY);
    if (isDesktopAppView(savedView)) {
      if (savedView !== activeView) onActiveViewChange(savedView);
      return;
    }

    if (activeView !== "music") {
      window.sessionStorage.setItem(LAST_DESKTOP_VIEW_KEY, "music");
      onActiveViewChange("music");
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");

    function syncAutoCollapsed() {
      setAutoCollapsed(mediaQuery.matches);
      if (mediaQuery.matches) setTooltip(null);
    }

    syncAutoCollapsed();
    mediaQuery.addEventListener("change", syncAutoCollapsed);

    return () => mediaQuery.removeEventListener("change", syncAutoCollapsed);
  }, []);

  function selectView(view: DesktopAppView) {
    window.sessionStorage.setItem(LAST_DESKTOP_VIEW_KEY, view);
    onActiveViewChange(view);
  }

  const libraryLinks: SidebarNavItem[] = [
    { view: "discover", label: "Discover", icon: <DashboardIcon size={12} /> },
    { view: "music", label: "Music Library", icon: <MusicIcon /> },
    { view: "playlists", label: "My Playlists", icon: <PlaylistIcon size={14} /> },
    {
      view: "projects",
      label: "Projects",
      icon: <FolderIcon />,
      active: activeView === "projects" && !activeProjectId,
      onClick: () => {
        onActiveProjectIdChange(null);
        selectView("projects");
      },
    },
    { label: "Favorites", icon: <HeartIcon /> },
    { label: "Sound FX", icon: <WaveformIcon /> },
    { view: "curated", label: "Curated Playlists", icon: <CuratedIcon /> },
  ];

  const projectLinks: SidebarNavItem[] = projects.map((project) => ({
    label: project.name,
    icon: <FolderIcon />,
    active: activeView === "projects" && activeProjectId === project.id,
    onClick: () => {
      onActiveProjectIdChange(project.id);
      selectView("projects");
    },
  }));

  function handleCreateProject() {
    // Create-project flow will be wired up when the desktop project create API is added.
  }

  const main = (
    <>
      <SideFilterPanelBehavior />
      {activeView !== "music" && children}
      <div
        className={`desktop-persistent-music-view${
          activeView === "music" ? " is-active" : " is-background"
        }`}
      >
        <DesktopMusicLibraryView apiBaseUrl={musicApiBaseUrl} syncFolder={syncFolder} />
      </div>
    </>
  );

  return (
    <SidebarShell collapsed={effectivelyCollapsed} header={header} tooltip={tooltip} main={main}>
      <SidebarCollapseControl
        collapsed={effectivelyCollapsed}
        icon={<CollapseIcon collapsed={effectivelyCollapsed} />}
        onToggle={() => {
          if (!autoCollapsed) setCollapsed((value) => !value);
          setTooltip(null);
        }}
      />

      <SidebarInner>
        <SidebarSection>
          <SidebarNav label="Library navigation">
            {libraryLinks.map((item) => (
              <SidebarLinkRow
                key={item.label}
                collapsed={effectivelyCollapsed}
                label={item.label}
                icon={item.icon}
                active={item.active ?? item.view === activeView}
                onTooltipChange={setTooltip}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                    return;
                  }
                  if (item.view) selectView(item.view);
                }}
              />
            ))}
          </SidebarNav>
        </SidebarSection>

        <div className="desktop-sidebar-nav-divider" aria-hidden="true" />

        <SidebarSection projects>
          <SidebarProjectsHeader
            label="Projects"
            collapsed={effectivelyCollapsed}
            actionLabel="New Project"
            actionIcon={<PlusIcon />}
            onActionClick={handleCreateProject}
            onTooltipChange={setTooltip}
          />
          <SidebarNav label="Projects navigation">
            {projectLinks.map((item) => (
              <SidebarLinkRow
                key={item.label}
                collapsed={effectivelyCollapsed}
                label={item.label}
                icon={item.icon}
                active={item.active ?? item.view === activeView}
                onTooltipChange={setTooltip}
                onClick={item.onClick}
              />
            ))}
            {projects.length === 0 && <SidebarEmptyState>No projects yet</SidebarEmptyState>}
          </SidebarNav>
        </SidebarSection>
      </SidebarInner>
    </SidebarShell>
  );
}
