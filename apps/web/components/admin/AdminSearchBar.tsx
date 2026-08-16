"use client";

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
      <input
        type="text"
        role="searchbox"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-10 w-full rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 pr-10 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]${
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
