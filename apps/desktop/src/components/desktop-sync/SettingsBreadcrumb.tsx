const settingsItems = [
  { label: "General", active: true },
  { label: "Account" },
  { label: "Project Source" },
  { label: "API Endpoint" },
  { label: "Realtime Sync" },
  { label: "Fallback Check" },
  { label: "Sync Folder" },
  { label: "Projects" },
  { label: "Sync Activity" },
];

export default function SettingsBreadcrumb() {
  return (
    <>
      <aside className="desktop-sync-settings-sidebar" aria-label="Settings navigation">
        <nav className="desktop-sync-settings-nav">
          {settingsItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`desktop-sync-settings-nav-item${item.active ? " is-active" : ""}`}
            >
              <span className="desktop-sync-settings-nav-icon" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="desktop-sync-settings-header">
        <h1 className="desktop-sync-settings-title">Desktop Sync</h1>
      </div>
    </>
  );
}
