import type { ReactNode } from "react";
import type { Project } from "../../lib/mockFilmwaveApi";
import FolderIcon from "../icons/FolderIcon";
import HeartIcon from "../icons/HeartIcon";
import MusicIcon from "../icons/MusicIcon";
import PlaylistIcon from "../icons/PlaylistIcon";
import WaveformIcon from "../icons/WaveformIcon";
import "./DesktopAppShell.css";

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

function SidebarNavButton({
  item,
  activeView,
  onActiveViewChange,
}: {
  item: SidebarNavItem;
  activeView: DesktopAppView;
  onActiveViewChange: (view: DesktopAppView) => void;
}) {
  const isActive = item.active ?? item.view === activeView;

  return (
    <button
      type="button"
      className={`desktop-sidebar-link${isActive ? " is-active" : ""}`}
      onClick={() => {
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

  return (
    <div className="desktop-app-shell">
      {header}

      <aside className="desktop-app-sidebar" data-tauri-drag-region>
        <div className="desktop-app-sidebar-inner">
          <section className="desktop-sidebar-section">
            <h2 className="desktop-sidebar-heading">Library</h2>
            <nav className="desktop-sidebar-nav" aria-label="Library navigation">
              {libraryLinks.map((item) => (
                <SidebarNavButton
                  key={item.label}
                  item={item}
                  activeView={activeView}
                  onActiveViewChange={onActiveViewChange}
                />
              ))}
            </nav>
          </section>

          <section className="desktop-sidebar-section is-projects-section">
            <div className="desktop-sidebar-projects-head">
              <h2 className="desktop-sidebar-heading">Projects</h2>
              <button
                type="button"
                className="desktop-sidebar-add-button"
                aria-label="Create new project"
              >
                +
              </button>
            </div>
            <nav className="desktop-sidebar-nav" aria-label="Projects navigation">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <SidebarNavButton
                    key={project.id}
                    item={{
                      label: project.name,
                      icon: <FolderIcon size={16} />,
                      active: activeView === "projects" && activeProjectId === project.id,
                      onClick: () => {
                        onActiveProjectIdChange(project.id);
                        onActiveViewChange("projects");
                      },
                    }}
                    activeView={activeView}
                    onActiveViewChange={onActiveViewChange}
                  />
                ))
              ) : (
                <div className="desktop-sidebar-empty-projects">No projects</div>
              )}
            </nav>
          </section>
        </div>
      </aside>

      <main className="desktop-app-main">{children}</main>
    </div>
  );
}
