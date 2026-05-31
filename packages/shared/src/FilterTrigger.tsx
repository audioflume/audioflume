import type { ReactNode, Ref } from "react";

export type FilterTriggerProps = {
  label: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  open?: boolean;
  count?: number;
  hideChevron?: boolean;
  disabled?: boolean;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  onClick: () => void;
};

function FilterChevron() {
  return (
    <svg
      className="filmwave-filter-trigger-chevron"
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1.5 3L4 5.5L6.5 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FilterTrigger({
  label,
  icon,
  active = false,
  open = false,
  count,
  hideChevron = false,
  disabled = false,
  className = "",
  buttonRef,
  onClick,
}: FilterTriggerProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`filmwave-filter-trigger${active ? " is-active" : ""}${open ? " is-open" : ""}${hideChevron ? " no-chevron" : ""}${className ? ` ${className}` : ""}`}
      aria-expanded={hideChevron ? undefined : open}
      aria-pressed={hideChevron ? active : undefined}
    >
      {icon && <span className="filmwave-filter-trigger-icon">{icon}</span>}
      <span>{label}</span>
      {active && typeof count === "number" && (
        <span className="filmwave-filter-count">{count}</span>
      )}
      {!hideChevron && <FilterChevron />}
    </button>
  );
}
