import {
  SidebarCollapseControl,
  SidebarEmptyState,
  SidebarInner,
  SidebarLinkRow,
  SidebarNav,
  SidebarProjectsHeader,
  SidebarSection,
  SidebarSectionHeading,
  SidebarShell,
  type SidebarTooltipState,
} from "@filmwave/shared";
import { useEffect, useState, type ReactNode } from "react";
import type { Project } from "../../lib/mockFilmwaveApi";
import FolderIcon from "../icons/FolderIcon";
import HeartIcon from "../icons/HeartIcon";
import LibraryIcon from "../icons/LibraryIcon";
import MusicIcon from "../icons/MusicIcon";
import PlaylistIcon from "../icons/PlaylistIcon";
import WaveformIcon from "../icons/WaveformIcon";
import DesktopMusicLibraryView from "./music-library/DesktopMusicLibraryView";
import "./DesktopAppShell.css";
import "./DesktopAppShellResponsive.css";
import "./DesktopScrollLock.css";
import "../../../../../packages/shared/styles/sidebar.css";

export type DesktopAppView =
  | "projects"
  | "music"
  | "playlists"
  | "discover"
  | "curated"
  | "settings";

type DesktopAppShellProps = {
  activeProjectId: string | null;
  activeView: DesktopAppView;
  header: ReactNode;
  children: ReactNode;
  projects: Project[];
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

export default function DesktopAppShell({
  activeProjectId,
  activeView,
  header,
  children,
  projects,
  onActiveProjectIdChange,
  onActiveViewChange,
}: DesktopAppShellProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<SidebarTooltipState>(null);
  const effectivelyCollapsed = collapsed || autoCollapsed;

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

  const libraryLinks: SidebarNavItem[] = [
    { view: "music", label: "Music Library", icon: <MusicIcon /> },
    { view: "playlists", label: "My Playlists", icon: <PlaylistIcon size={14} /> },
    {
      view: "projects",
      label: "Projects",
      icon: <FolderIcon />,
      active: activeView === "projects" && !activeProjectId,
      onClick: () => {
        onActiveProjectIdChange(null);
        onActiveViewChange("projects");
      },
    },
    { label: "Favorites", icon: <HeartIcon /> },
    { label: "Sound FX", icon: <WaveformIcon /> },
  ];

  const projectLinks: SidebarNavItem[] = projects.map((project) => ({
    label: project.name,
    icon: <FolderIcon />,
    active: activeView === "projects" && activeProjectId === project.id,
    onClick: () => {
      onActiveProjectIdChange(project.id);
      onActiveViewChange("projects");
    },
  }));

  function handleCreateProject() {
    // Create-project flow will be wired up when the desktop project create API is added.
  }

  const main = (
    <>
      {activeView !== "music" && children}
      <div
        className={`desktop-persistent-music-view${
          activeView === "music" ? " is-active" : " is-background"
        }`}
      >
        <DesktopMusicLibraryView />
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
          <SidebarSectionHeading
            label="Library"
            collapsed={effectivelyCollapsed}
            icon={<LibraryIcon size={16} />}
          />
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
                  if (item.view) onActiveViewChange(item.view);
                }}
              />
            ))}
          </SidebarNav>
        </SidebarSection>

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
