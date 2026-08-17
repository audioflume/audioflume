export default function AdminCheckboxStyles() {
  return (
    <style>{`
      /* Canonical backend checkbox treatment. Keep specialized hidden inputs hidden. */
      .filmwave-admin-content-page
        input[type="checkbox"]:not(.admin-song-select-input):not(.sr-only) {
        position: relative;
        display: grid;
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        appearance: none;
        place-content: center;
        opacity: 1;
        pointer-events: auto;
        cursor: pointer;
        border: 1.5px solid var(--border);
        border-radius: 4px;
        background: var(--bg-secondary);
        color: var(--bg-primary);
        transition:
          border-color 150ms ease,
          background 150ms ease,
          color 150ms ease;
      }

      .filmwave-admin-content-page
        input[type="checkbox"]:not(.admin-song-select-input):not(.sr-only):hover {
        border-color: var(--text-secondary);
      }

      .filmwave-admin-content-page
        input[type="checkbox"]:not(.admin-song-select-input):not(.sr-only)::after {
        content: "";
        width: 11px;
        height: 11px;
        opacity: 0;
        background: var(--bg-primary);
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5L9.5 17L19 7' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5L9.5 17L19 7' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
        transition: opacity 150ms ease;
      }

      .filmwave-admin-content-page
        input[type="checkbox"]:not(.admin-song-select-input):not(.sr-only):checked {
        border-color: var(--text-primary);
        background: var(--text-primary);
        color: var(--bg-primary);
      }

      .filmwave-admin-content-page
        input[type="checkbox"]:not(.admin-song-select-input):not(.sr-only):checked::after {
        opacity: 1;
      }

      /* Hidden-input checkbox controls use the same box dimensions. */
      .filmwave-admin-content-page input[type="checkbox"].peer.sr-only + span {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        border-width: 1.5px;
        border-radius: 4px;
      }
    `}</style>
  );
}
