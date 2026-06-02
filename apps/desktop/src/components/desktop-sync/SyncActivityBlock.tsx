import "./SyncProjectsBlock.css";

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
    <div className="dss-projects">
      <div className="dss-projects-header">
        <div className="dss-projects-header-label">
          <h2 className="dss-projects-title">Sync activity</h2>
          <p className="dss-projects-meta">Last {maxEntries} sync events, local removals, and errors.</p>
        </div>
        <div className="dss-projects-actions">
          <button
            type="button"
            className="dss-btn"
            disabled={syncActivityLog.length === 0}
            onClick={onClearSyncActivityLog}
          >
            Clear log
          </button>
        </div>
      </div>

      <div className="dss-project-list">
        {syncActivityLog.length === 0 ? (
          <div className="dss-project-row">
            <span className="dss-project-check">·</span>
            <span className="dss-project-name">No sync activity yet</span>
          </div>
        ) : (
          syncActivityLog.map((entry) => (
            <div key={entry.id} className="dss-project-row">
              <span className="dss-project-check">
                {entry.status === "success" ? "✓" : entry.status === "error" ? "!" : "·"}
              </span>
              <span className="dss-project-info">
                <span className="dss-project-name">
                  {entry.title} · {formatLogTime(entry.createdAt)}
                </span>
                <span className="dss-project-desc">{entry.detail}</span>
                {entry.projectNames.length > 0 && (
                  <span className="dss-project-desc">Projects: {entry.projectNames.join(", ")}</span>
                )}
              </span>
              <span className="dss-project-tags">
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
