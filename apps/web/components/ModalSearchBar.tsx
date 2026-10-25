"use client";

import XIcon from "@/components/icons/XIcon";

type ModalSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
  className?: string;
};

export default function ModalSearchBar({
  value,
  onChange,
  placeholder = "Search",
  clearLabel = "Clear search",
  className = "",
}: ModalSearchBarProps) {
  return (
    <label
      className={`flex h-12 flex-shrink-0 items-center gap-3 rounded-[4px] bg-[var(--bg-hover)] px-4 text-[var(--text-muted)]${className ? ` ${className}` : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[22px] w-[22px] shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-width:1.4]"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 !rounded-none !border-0 !bg-transparent p-0 text-[16px] font-light text-[var(--text-primary)] !outline-none placeholder:text-[16px] placeholder:text-[#a3a3a3] focus:!border-0"
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center border-0 bg-transparent p-0 text-[#a3a3a3] transition-colors duration-150 hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)]"
          aria-label={clearLabel}
        >
          <XIcon size={8} strokeWidth={1.4} className="h-[21px] w-[21px]" />
        </button>
      ) : null}
    </label>
  );
}
