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
    <div className="section-block sync-folder-block">
      <div>
        <h2>Sync folder</h2>
        <p className="folder-path">{syncFolder ?? "No folder selected"}</p>
      </div>

      <div className="button-group">
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
