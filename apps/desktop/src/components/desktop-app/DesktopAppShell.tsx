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
import DesktopSideFilterBehavior from "./music-library/DesktopSideFilterBehavior";
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

function CuratedIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7H13.25"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M5 17H11.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M17.4 4.9L18.18 6.74C18.32 7.07 18.58 7.33 18.91 7.47L20.75 8.25L18.91 9.03C18.58 9.17 18.32 9.43 18.18 9.76L17.4 11.6L16.62 9.76C16.48 9.43 16.22 9.17 15.89 9.03L14.05 8.25L15.89 7.47C16.22 7.33 16.48 7.07 16.62 6.74L17.4 4.9Z"
        fill="currentColor"
      />
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
      <DesktopSideFilterBehavior />
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
