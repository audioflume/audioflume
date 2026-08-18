"use client";

import SearchIcon from "@/components/icons/SearchIcon";
import XIcon from "@/components/icons/XIcon";

type AdminSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: "page" | "modal";
  clearLabel?: string;
};

export default function AdminSearchBar({
  value,
  onChange,
  placeholder = "Search",
  className = "",
  variant = "page",
  clearLabel = "Clear search",
}: AdminSearchBarProps) {
  const modalVariant = variant === "modal";

  return (
    <div className={`relative${className ? ` ${className}` : ""}`}>
      <span
        className="pointer-events-none absolute left-[14px] top-1/2 flex h-[13px] w-[13px] -translate-y-1/2 items-center justify-center text-[var(--text-muted)]"
        aria-hidden="true"
      >
        <SearchIcon size={13} />
      </span>
      <input
        type="text"
        role="searchbox"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`filmwave-backend-input filmwave-backend-search-input${
          modalVariant ? " focus:border-[var(--text-muted)]" : ""
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`absolute right-0 top-0 flex h-10 w-10 items-center justify-center bg-transparent text-[var(--text-primary)]${
            modalVariant ? " cursor-pointer" : ""
          }`}
          aria-label={clearLabel}
        >
          <XIcon size={12} />
        </button>
      )}
    </div>
  );
}
