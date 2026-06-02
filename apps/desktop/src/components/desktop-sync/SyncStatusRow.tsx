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

  // Fallback only (realtime off but signed in)
  if (!autoSyncEnabled && autoSyncIntervalMinutes > 0 && isSignedIn) {
    return { dot: "yellow", label: `Fallback every ${autoSyncIntervalMinutes}m` };
  }

  // Signed in, no auto sync
  return { dot: "grey", label: syncStatus };
}

export default function SyncStatusRow({
  syncStatus,
  syncing,
  autoSyncEnabled,
  autoSyncIntervalMinutes,
  isSignedIn,
}: SyncStatusRowProps) {
  const { dot, label } = getStatusState(
    syncing,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isSignedIn,
    syncStatus,
  );

  return (
    <div className="settings-row is-status">
      <span className="status-row-label">Sync status</span>

      <div className={`status-pill${syncing ? " is-syncing" : ""}`}>
        <span className={`status-dot is-${dot}`} />
        {label}
      </div>
    </div>
  );
}
