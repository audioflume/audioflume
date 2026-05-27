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

      <button
        type="button"
        className={`realtime-toggle ${autoSyncEnabled ? "is-on" : "is-off"}`}
        role="switch"
        aria-checked={autoSyncEnabled}
        aria-label="Realtime sync setting"
        onClick={() => onChangeAutoSyncEnabled(!autoSyncEnabled)}
      >
        <span className="realtime-toggle-knob" aria-hidden="true" />
      </button>
    </div>
  );
}
