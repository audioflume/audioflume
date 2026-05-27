import type { ReactNode } from "react";
import EditPointsIcon from "../icons/EditPointsIcon";
import FolderIcon from "../icons/FolderIcon";
import HeartIcon from "../icons/HeartIcon";
import MusicIcon from "../icons/MusicIcon";
import PlaylistIcon from "../icons/PlaylistIcon";
import SongMatchIcon from "../icons/SongMatchIcon";
import StoryMatchIcon from "../icons/StoryMatchIcon";
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
  activeView: DesktopAppView;
  header: ReactNode;
  children: ReactNode;
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
  activeView,
  header,
  children,
  onActiveViewChange,
}: DesktopAppShellProps) {
  const libraryLinks: SidebarNavItem[] = [
    { view: "music", label: "Music Library", icon: <MusicIcon size={16} /> },
    { view: "playlists", label: "My Playlists", icon: <PlaylistIcon size={16} /> },
    { label: "Favorites", icon: <HeartIcon size={16} /> },
    { label: "Sound FX", icon: <WaveformIcon size={16} /> },
  ];

  const aiLinks: SidebarNavItem[] = [
    { label: "AI Song Match", icon: <SongMatchIcon size={16} /> },
    { label: "Edit Points", icon: <EditPointsIcon size={16} /> },
    { label: "Story Match", icon: <StoryMatchIcon size={16} /> },
  ];

  const projectLinks: SidebarNavItem[] = [
    {
      view: "projects",
      label: "Projects",
      icon: <FolderIcon size={16} />,
      active: activeView === "projects",
    },
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

          <section className="desktop-sidebar-section">
            <h2 className="desktop-sidebar-heading">AI Tools</h2>
            <nav className="desktop-sidebar-nav" aria-label="AI tools navigation">
              {aiLinks.map((item) => (
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
              {projectLinks.map((item) => (
                <SidebarNavButton
                  key={item.label}
                  item={item}
                  activeView={activeView}
                  onActiveViewChange={onActiveViewChange}
                />
              ))}
            </nav>
          </section>
        </div>
      </aside>

      <main className="desktop-app-main">{children}</main>
    </div>
  );
}
