type SyncActivityLogEntry = {
  id: string;
  createdAt: string;
  mode: "manual" | "auto" | "local" | "system";
  status: "success" | "error" | "info";
  title: string;
  detail: string;
  projectNames: string[];
};

type SyncActivityBlockProps = {
  maxEntries: number;
  syncActivityLog: SyncActivityLogEntry[];
  onClearSyncActivityLog: () => void;
};

function formatLogTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SyncActivityBlock({
  maxEntries,
  syncActivityLog,
  onClearSyncActivityLog,
}: SyncActivityBlockProps) {
  return (
    <div className="projects-panel">
      <div className="projects-header">
        <div>
          <h2>Sync activity</h2>
          <p>Last {maxEntries} sync events, local removals, and errors.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={syncActivityLog.length === 0}
          onClick={onClearSyncActivityLog}
        >
          Clear log
        </button>
      </div>

      <div className="project-list">
        {syncActivityLog.length === 0 ? (
          <div className="project-row is-loading">
            <span className="project-check" aria-hidden="true" />
            <span className="project-main">
              <span className="project-name">No sync activity yet</span>
              <span className="project-description">
                Manual syncs, auto-syncs, local removals, and errors will appear here.
              </span>
            </span>
          </div>
        ) : (
          syncActivityLog.map((entry) => (
            <div key={entry.id} className="project-row is-loading">
              <span className="project-check" aria-hidden="true">
                {entry.status === "success" ? "✓" : entry.status === "error" ? "!" : "·"}
              </span>
              <span className="project-main">
                <span className="project-name">
                  {entry.title} · {formatLogTime(entry.createdAt)}
                </span>
                <span className="project-description">{entry.detail}</span>
                {entry.projectNames.length > 0 && (
                  <span className="project-description">Projects: {entry.projectNames.join(", ")}</span>
                )}
              </span>
              <span className="project-meta">
                <span>{entry.mode}</span>
                <span>{entry.status}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
