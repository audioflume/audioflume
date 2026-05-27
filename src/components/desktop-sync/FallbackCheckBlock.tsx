type FallbackCheckBlockProps = {
  autoSyncIntervalMinutes: number;
  fallbackSyncDescription: string;
  onChangeAutoSyncInterval: (interval: number) => void;
};

export default function FallbackCheckBlock({
  autoSyncIntervalMinutes,
  fallbackSyncDescription,
  onChangeAutoSyncInterval,
}: FallbackCheckBlockProps) {
  return (
    <div className="section-block settings-block">
      <div>
        <h2>Fallback check</h2>
        <p>{fallbackSyncDescription}</p>
      </div>

      <div className="source-toggle" aria-label="Fallback sync interval">
        {[5, 15, 30].map((interval) => (
          <button
            key={interval}
            type="button"
            className={autoSyncIntervalMinutes === interval ? "is-active" : ""}
            onClick={() => onChangeAutoSyncInterval(interval)}
          >
            {interval}m
          </button>
        ))}
      </div>
    </div>
  );
}
