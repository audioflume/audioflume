import { SettingsSideNav } from "@filmwave/shared";

export default function SettingsBreadcrumb() {
  const items = [
    {
      label: "Desktop Sync",
      helper: "Local folders and project syncing",
      active: true,
    },
  ];

  return (
    <>
      <SettingsSideNav
        kicker="Settings"
        title="Filmwave"
        ariaLabel="Settings navigation"
        className="desktop-sync-settings-sidebar"
        items={items}
      />

      <div className="desktop-sync-settings-header">
        <h1 className="desktop-sync-settings-title">Desktop Sync</h1>
      </div>
    </>
  );
}
