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
  header: React.ReactNode;
  children: React.ReactNode;
  onActiveViewChange: (view: DesktopAppView) => void;
};

const navItems: Array<{
  view: DesktopAppView;
  label: string;
  description: string;
}> = [
  {
    view: "projects",
    label: "Projects",
    description: "Synced project files",
  },
  {
    view: "music",
    label: "Music",
    description: "Search and filter tracks",
  },
  {
    view: "playlists",
    label: "Playlists",
    description: "Saved user playlists",
  },
  {
    view: "discover",
    label: "Discover",
    description: "Editorial browsing",
  },
  {
    view: "curated",
    label: "Curated",
    description: "Filmwave collections",
  },
  {
    view: "settings",
    label: "Settings",
    description: "Desktop sync controls",
  },
];

function getNavIcon(label: string) {
  return label.slice(0, 1);
}

export default function DesktopAppShell({
  activeView,
  header,
  children,
  onActiveViewChange,
}: DesktopAppShellProps) {
  return (
    <div className="desktop-app-shell">
      {header}

      <aside className="desktop-app-sidebar" data-tauri-drag-region>
        <div className="desktop-app-sidebar-inner">
          <div className="desktop-app-sidebar-kicker">Filmwave</div>

          <nav className="desktop-app-nav" aria-label="Filmwave Desktop navigation">
            {navItems.map((item) => {
              const isActive = item.view === activeView;

              return (
                <button
                  key={item.view}
                  type="button"
                  className={`desktop-app-nav-item${isActive ? " is-active" : ""}`}
                  onClick={() => onActiveViewChange(item.view)}
                >
                  <span className="desktop-app-nav-icon" aria-hidden="true">
                    {getNavIcon(item.label)}
                  </span>
                  <span className="desktop-app-nav-copy">
                    <span className="desktop-app-nav-label">{item.label}</span>
                    <span className="desktop-app-nav-description">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="desktop-app-main">{children}</main>
    </div>
  );
}
