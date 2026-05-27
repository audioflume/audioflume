import { useState, type ReactNode } from "react";
import type { Project } from "../../lib/mockFilmwaveApi";
import FolderIcon from "../icons/FolderIcon";
import HeartIcon from "../icons/HeartIcon";
import MusicIcon from "../icons/MusicIcon";
import PlaylistIcon from "../icons/PlaylistIcon";
import WaveformIcon from "../icons/WaveformIcon";
import "./DesktopAppShell.css";
import "./DesktopAppShellResponsive.css";
import "./DesktopScrollLock.css";

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

type SidebarTooltip = {
  label: string;
  top: number;
} | null;

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

function SidebarTooltipEl({ label, top }: { label: string; top: number }) {
  return (
    <div className="desktop-sidebar-tooltip" style={{ top }}>
      <div className="desktop-sidebar-tooltip-border">
        <div className="desktop-sidebar-tooltip-inner">{label}</div>
      </div>
    </div>
  );
}

function SidebarNavButton({
  collapsed,
  item,
  activeView,
  onActiveViewChange,
  onTooltipChange,
}: {
  collapsed: boolean;
  item: SidebarNavItem;
  activeView: DesktopAppView;
  onActiveViewChange: (view: DesktopAppView) => void;
  onTooltipChange: (tooltip: SidebarTooltip) => void;
}) {
  const isActive = item.active ?? item.view === activeView;

  function showTooltip(element: HTMLElement) {
    if (!collapsed) return;
    const rect = element.getBoundingClientRect();
    onTooltipChange({ label: item.label, top: rect.top + rect.height / 2 });
  }

  return (
    <button
      type="button"
      className={`desktop-sidebar-link${isActive ? " is-active" : ""}`}
      aria-label={item.label}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={() => onTooltipChange(null)}
      onFocus={(event) => showTooltip(event.currentTarget)}
      onBlur={() => onTooltipChange(null)}
      onClick={() => {
        onTooltipChange(null);
        if (item.onClick) {
          item.onClick();
          return;
        }
        if (item.view) onActiveViewChange(item.view);
      }}
    >
      <span className="desktop-sidebar-link-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span className="desktop-sidebar-link-label">{item.label}</span>
    </button>
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
  const [collapsed, setCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<SidebarTooltip>(null);

  const libraryLinks: SidebarNavItem[] = [
    { view: "music", label: "Music Library", icon: <MusicIcon size={16} /> },
    { view: "playlists", label: "My Playlists", icon: <PlaylistIcon size={16} /> },
    {
      view: "projects",
      label: "Projects",
      icon: <FolderIcon size={16} />,
      active: activeView === "projects" && !activeProjectId,
      onClick: () => {
        onActiveProjectIdChange(null);
        onActiveViewChange("projects");
      },
    },
    { label: "Favorites", icon: <HeartIcon size={16} /> },
    { label: "Sound FX", icon: <WaveformIcon size={16} /> },
  ];

  const projectLinks: SidebarNavItem[] = [
    {
      label: "New Project",
      icon: <PlusIcon />,
      onClick: () => {
        // Create-project flow will be wired up when the desktop project create API is added.
      },
    },
    ...projects.map((project) => ({
      label: project.name,
      icon: <FolderIcon size={16} />,
      active: activeView === "projects" && activeProjectId === project.id,
      onClick: () => {
        onActiveProjectIdChange(project.id);
        onActiveViewChange("projects");
      },
    })),
  ];

  return (
    <div className={`desktop-app-shell${collapsed ? " is-sidebar-collapsed" : ""}`}>
      {header}

      <aside className="desktop-app-sidebar" data-tauri-drag-region>
        <div className="desktop-sidebar-collapse-zone">
          <button
            type="button"
            className="desktop-sidebar-collapse-button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              setCollapsed((value) => !value);
              setTooltip(null);
            }}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        <div className="desktop-app-sidebar-inner">
          <section className="desktop-sidebar-section">
            <h2 className="desktop-sidebar-heading">Library</h2>
            <nav className="desktop-sidebar-nav" aria-label="Library navigation">
              {libraryLinks.map((item) => (
                <SidebarNavButton
                  key={item.label}
                  collapsed={collapsed}
                  item={item}
                  activeView={activeView}
                  onActiveViewChange={onActiveViewChange}
                  onTooltipChange={setTooltip}
                />
              ))}
            </nav>
          </section>

          <section className="desktop-sidebar-section is-projects-section">
            <div className="desktop-sidebar-projects-head">
              <h2 className="desktop-sidebar-heading">Projects</h2>
            </div>
            <nav className="desktop-sidebar-nav" aria-label="Projects navigation">
              {projectLinks.map((item) => (
                <SidebarNavButton
                  key={item.label}
                  collapsed={collapsed}
                  item={item}
                  activeView={activeView}
                  onActiveViewChange={onActiveViewChange}
                  onTooltipChange={setTooltip}
                />
              ))}
              {projects.length === 0 && (
                <div className="desktop-sidebar-empty-projects">No projects yet</div>
              )}
            </nav>
          </section>
        </div>
      </aside>

      {tooltip && collapsed && <SidebarTooltipEl label={tooltip.label} top={tooltip.top} />}

      <main className="desktop-app-main">{children}</main>
    </div>
  );
}
