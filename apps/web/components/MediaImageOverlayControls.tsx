"use client";

type MediaImageChangeOverlayProps = {
  label?: string;
};

type MediaImageRemoveButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  small?: boolean;
};

export function MediaImageChangeOverlay({
  label = "Change image",
}: MediaImageChangeOverlayProps) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-transparent p-2 opacity-0 transition group-hover:bg-[var(--media-overlay-preview)] group-hover:opacity-100">
      <span className="whitespace-nowrap rounded-full bg-[rgba(0,0,0,0.58)] px-3 py-1.5 text-[10px] font-medium leading-none text-white shadow-[var(--shadow-ui)] backdrop-blur-[2px]">
        {label}
      </span>
    </span>
  );
}

export function MediaImageRemoveButton({
  onClick,
  disabled = false,
  ariaLabel,
  small = false,
}: MediaImageRemoveButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute right-1.5 top-1.5 z-20 flex ${
        small ? "h-5 w-5" : "h-6 w-6"
      } cursor-pointer items-center justify-center rounded-full bg-[rgba(0,0,0,0.58)] text-[13px] font-medium leading-none text-white backdrop-blur-[2px] transition hover:bg-[rgba(0,0,0,0.75)] disabled:cursor-default disabled:opacity-70`}
      aria-label={ariaLabel}
    >
      {small ? (
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="h-[9px] w-[9px]"
          fill="none"
        >
          <path
            d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        "×"
      )}
    </button>
  );
}
