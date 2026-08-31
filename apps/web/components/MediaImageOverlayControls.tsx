"use client";

import UploadIcon from "@/components/icons/UploadIcon";

type MediaImageChangeOverlayProps = {
  label?: string;
};

type MediaImageRemoveButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
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

export function MediaImageUploadOverlay() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-transparent p-2 opacity-0 transition group-hover:bg-[var(--media-overlay-preview)] group-hover:opacity-100">
      <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[rgba(0,0,0,0.58)] text-white shadow-[var(--shadow-ui)] backdrop-blur-[2px]">
        <UploadIcon size={14} />
      </span>
    </span>
  );
}

export function MediaImageRemoveButton({
  onClick,
  disabled = false,
  ariaLabel,
}: MediaImageRemoveButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[rgba(0,0,0,0.58)] text-[13px] font-medium leading-none text-white backdrop-blur-[2px] transition hover:bg-[rgba(0,0,0,0.75)] disabled:cursor-default disabled:opacity-70"
      aria-label={ariaLabel}
    >
      ×
    </button>
  );
}
