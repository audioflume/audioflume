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
      aria-expanded={open}
      aria-pressed={hideChevron ? active : undefined}
    >
      {icon && <span className="filmwave-filter-trigger-icon">{icon}</span>}
      <span>{label}</span>
      {active && typeof count === "number" && (
        <span className="filmwave-filter-count">{count}</span>
      )}
    </button>
  );
}
