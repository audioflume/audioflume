type ApiEndpointBlockProps = {
  apiBaseUrlDraft: string;
  normalizedApiBaseUrl: string;
  onApiBaseUrlDraftChange: (value: string) => void;
  onResetApiBaseUrl: () => void;
  onSaveApiBaseUrl: () => void;
};

export default function ApiEndpointBlock({
  apiBaseUrlDraft,
  normalizedApiBaseUrl,
  onApiBaseUrlDraftChange,
  onResetApiBaseUrl,
  onSaveApiBaseUrl,
}: ApiEndpointBlockProps) {
  return (
    <div className="settings-row">
      <div className="settings-row-label">
        <h2>API endpoint</h2>
        <p className="folder-path">{normalizedApiBaseUrl}</p>
      </div>

      <div className="settings-row-control api-endpoint-control">
        <input
          type="url"
          value={apiBaseUrlDraft}
          onChange={(event) => onApiBaseUrlDraftChange(event.target.value)}
          placeholder="https://your-filmwave-domain.com"
          autoComplete="off"
        />
        <div className="api-endpoint-buttons">
          <button
            type="button"
            className="secondary-button"
            onClick={onSaveApiBaseUrl}
          >
            Save
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onResetApiBaseUrl}
          >
            Local
          </button>
        </div>
      </div>
    </div>
  );
}
