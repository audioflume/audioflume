import "./DesktopSyncLayout.css";

type SyncStatusRowProps = {
  syncStatus: string;
  syncing: boolean;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  isSignedIn: boolean;
};

function getStatusState(
  syncing: boolean,
  autoSyncEnabled: boolean,
  autoSyncIntervalMinutes: number,
  isSignedIn: boolean,
  syncStatus: string,
): { dot: "green" | "yellow" | "red" | "grey"; label: string } {
  // Active sync in progress
  if (syncing) {
    return { dot: "green", label: "Syncing..." };
  }

  // Error states
  const isError =
    syncStatus.toLowerCase().includes("failed") ||
    syncStatus.toLowerCase().includes("error") ||
    syncStatus.toLowerCase().includes("could not");
  if (isError) {
    return { dot: "red", label: syncStatus };
  }

  // Not signed in
  if (!isSignedIn) {
    return { dot: "red", label: "Not connected" };
  }

  // Realtime sync on
  if (autoSyncEnabled) {
    return { dot: "green", label: "Realtime sync on" };
  }

  // Signed in but realtime sync off
  return { dot: "yellow", label: `Connected · Fallback every ${autoSyncIntervalMinutes} min` };
}

export default function SyncStatusRow({
  syncStatus,
  syncing,
  autoSyncEnabled,
  autoSyncIntervalMinutes,
  isSignedIn,
}: SyncStatusRowProps) {
  const status = getStatusState(
    syncing,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isSignedIn,
    syncStatus,
  );

  return (
    <div className="settings-row is-status">
      <div className="status-row-label">Sync status</div>
      <div className={`status-pill is-${status.dot}${syncing ? " is-syncing" : ""}`}>
        <span className={`status-dot is-${status.dot}`} />
        <span>{status.label}</span>
      </div>
    </div>
  );
}
