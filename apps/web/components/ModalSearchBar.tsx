"use client";

import SearchIcon from "@/components/icons/SearchIcon";
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
      className={`flex h-12 flex-shrink-0 items-center gap-3 bg-[var(--bg-hover)] px-4 text-[var(--text-muted)]${className ? ` ${className}` : ""}`}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
        <SearchIcon size={16} />
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 !rounded-none !border-0 !bg-transparent p-0 text-sm text-[var(--text-primary)] !outline-none placeholder:text-[var(--text-muted)] focus:!border-0"
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex h-8 w-8 shrink-0 items-center justify-center bg-transparent p-0 text-[var(--text-primary)] transition hover:text-[var(--text-secondary)]"
          aria-label={clearLabel}
        >
          <XIcon size={14} />
        </button>
      ) : null}
    </label>
  );
}
