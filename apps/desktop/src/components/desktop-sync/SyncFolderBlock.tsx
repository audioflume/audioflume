type SyncFolderBlockProps = {
  lastSyncedFolder: string | null;
  openingFolder: boolean;
  syncFolder: string | null;
  syncing: boolean;
  onChooseSyncFolder: () => void;
  onOpenLastSyncedFolder: () => void;
};

export default function SyncFolderBlock({
  lastSyncedFolder,
  openingFolder,
  syncFolder,
  syncing,
  onChooseSyncFolder,
  onOpenLastSyncedFolder,
}: SyncFolderBlockProps) {
  return (
    <div className="settings-row">
      <div className="settings-row-label">
        <h2>Sync folder</h2>
        <p className="folder-path">{syncFolder ?? "No folder selected"}</p>
      </div>

      <div className="settings-row-control">
        <button
          type="button"
          className="secondary-button"
          onClick={onChooseSyncFolder}
          disabled={syncing}
        >
          Choose folder
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onOpenLastSyncedFolder}
          disabled={!lastSyncedFolder || syncing || openingFolder}
        >
          {openingFolder ? "Opening..." : "Open folder"}
        </button>
      </div>
    </div>
  );
}
