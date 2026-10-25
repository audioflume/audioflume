"use client";

import ModalSearchBar from "@/components/ModalSearchBar";
import XIcon from "@/components/icons/XIcon";

type BackendSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: "page" | "modal";
  clearLabel?: string;
};

export default function BackendSearchBar({
  value,
  onChange,
  placeholder = "Search",
  className = "",
  variant = "page",
  clearLabel = "Clear search",
}: BackendSearchBarProps) {
  const modalVariant = variant === "modal";

  if (modalVariant) {
    return (
      <ModalSearchBar
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        clearLabel={clearLabel}
        className={className}
      />
    );
  }

  return (
    <div className={`relative${className ? ` ${className}` : ""}`}>
      <span
        className="pointer-events-none absolute left-[14px] top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-[#a3a3a3]"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-none stroke-current [stroke-linecap:round] [stroke-width:1.4]"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      </span>
      <input
        type="text"
        role="searchbox"
        value={value}
        onInput={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className="filmwave-backend-input filmwave-backend-search-input"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-[10px] top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-[#a3a3a3] transition-colors duration-150 hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)]"
          aria-label={clearLabel}
        >
          <XIcon size={8} strokeWidth={1.4} className="h-[21px] w-[21px]" />
        </button>
      ) : null}
    </div>
  );
}
