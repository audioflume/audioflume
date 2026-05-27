type SyncStatusRowProps = {
  syncStatus: string;
  syncing: boolean;
};

export default function SyncStatusRow({
  syncStatus,
  syncing,
}: SyncStatusRowProps) {
  return (
    <div className="status-row">
      <span className="status-row-label">Sync status</span>

      <div className={`status-pill ${syncing ? "is-syncing" : ""}`}>
        <span className="status-dot" />
        {syncStatus}
      </div>
    </div>
  );
}
