import "./RealtimeSyncBlock.css";

type RealtimeSyncBlockProps = {
  autoSyncDescription: string;
  autoSyncEnabled: boolean;
  lastAutoSyncedAt: Date | null;
  onChangeAutoSyncEnabled: (enabled: boolean) => void;
};

function formatFallbackSyncTime(date: Date | null) {
  if (!date) return "No fallback sync has run yet";

  return `Last fallback sync ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export default function RealtimeSyncBlock({
  autoSyncDescription,
  autoSyncEnabled,
  lastAutoSyncedAt,
  onChangeAutoSyncEnabled,
}: RealtimeSyncBlockProps) {
  return (
    <div className="section-block settings-block">
      <div>
        <h2>Realtime sync</h2>
        <p>{autoSyncDescription}</p>
        <p className="refresh-meta">
          {formatFallbackSyncTime(lastAutoSyncedAt)}
        </p>
      </div>

      <div
        className={`source-toggle realtime-toggle ${autoSyncEnabled ? "is-on" : "is-off"}`}
        aria-label="Realtime sync setting"
      >
        <button
          type="button"
          className={!autoSyncEnabled ? "is-active" : ""}
          onClick={() => onChangeAutoSyncEnabled(false)}
        >
          Off
        </button>
        <button
          type="button"
          className={autoSyncEnabled ? "is-active" : ""}
          onClick={() => onChangeAutoSyncEnabled(true)}
        >
          On
        </button>
      </div>
    </div>
  );
}
