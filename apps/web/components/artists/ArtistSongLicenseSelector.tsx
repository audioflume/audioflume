"use client";

export type ArtistSongLicenseType = "standard" | "premium";

const LICENSE_OPTIONS: Array<{
  value: ArtistSongLicenseType;
  title: string;
  description: string;
}> = [
  {
    value: "standard",
    title: "Standard License",
    description:
      "Included in the subscription library under the standard license.",
  },
  {
    value: "premium",
    title: "Artist Premium",
    description:
      "Licensed individually through the premium artist catalogue.",
  },
];

export default function ArtistSongLicenseSelector({
  value,
  onChange,
  disabled = false,
  error = "",
}: {
  value: ArtistSongLicenseType;
  onChange: (value: ArtistSongLicenseType) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <section className="filmwave-backend-section">
      <div className="filmwave-backend-section-header">
        <h2 className="filmwave-backend-section-title">License</h2>
      </div>

      <div className="grid gap-3 px-5 pb-5 md:grid-cols-2">
        {LICENSE_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`flex min-h-[92px] items-start justify-between gap-4 rounded-[7px] border bg-[var(--bg-primary)] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-[var(--text-primary)]"
                  : "border-[var(--border)] hover:border-[var(--text-secondary)]"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-xs font-[320] text-[var(--text-primary)]">
                  {option.title}
                </span>
                <span className="mt-1.5 block text-[11px] font-[320] leading-5 text-[var(--text-muted)]">
                  {option.description}
                </span>
              </span>

              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? "border-[var(--text-primary)]"
                    : "border-[var(--border)]"
                }`}
              >
                {selected ? (
                  <span className="h-2 w-2 rounded-full bg-[var(--text-primary)]" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="-mt-2 px-5 pb-5 text-[10px] font-[320] leading-4 text-[var(--status-error,#dc584f)]">
          {error}
        </div>
      ) : null}
    </section>
  );
}
