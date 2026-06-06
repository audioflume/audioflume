import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";

export type FilterTriggerProps = {
  label: ReactNode;
  activeLabel?: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  open?: boolean;
  count?: number;
  showActiveDot?: boolean;
  hideChevron?: boolean;
  disabled?: boolean;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  onClick: () => void;
  onClear?: () => void;
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
  activeLabel,
  icon,
  active = false,
  open = false,
  count,
  showActiveDot = false,
  hideChevron = false,
  disabled = false,
  className = "",
  buttonRef,
  onClick,
  onClear,
}: FilterTriggerProps) {
  const [activeLabelHovered, setActiveLabelHovered] = useState(false);
  const activeLabelRef = useRef<HTMLSpanElement>(null);
  const [activeLabelWidth, setActiveLabelWidth] = useState<number | undefined>(undefined);

  const activeLabelIsClearable = active && activeLabel != null && !!onClear;

  // Measure the natural width of the pill when not hovered, so we can lock it
  // and prevent the pill from resizing when the text swaps to "×".
  useLayoutEffect(() => {
    if (!activeLabelIsClearable || !activeLabelRef.current) return;
    if (activeLabelHovered) return; // don't re-measure while showing ×
    setActiveLabelWidth(activeLabelRef.current.offsetWidth);
  }, [activeLabelIsClearable, activeLabel, activeLabelHovered]);

  function handleCountClear(event: MouseEvent<HTMLSpanElement>) {
    if (!onClear) return;
    event.preventDefault();
    event.stopPropagation();
    onClear();
  }

  function handleCountKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (!onClear || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.stopPropagation();
    onClear();
  }

  function handleActiveLabelClear(event: MouseEvent<HTMLSpanElement>) {
    if (!onClear) return;
    event.preventDefault();
    event.stopPropagation();
    onClear();
  }

  function handleActiveLabelKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (!onClear || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.stopPropagation();
    onClear();
  }

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
      {active && activeLabel != null && (
        <span
          ref={activeLabelRef}
          className={`filmwave-filter-trigger-active-label${activeLabelIsClearable ? " is-clearable" : ""}`}
          role={activeLabelIsClearable ? "button" : undefined}
          tabIndex={activeLabelIsClearable ? 0 : undefined}
          aria-label={activeLabelIsClearable ? `Clear ${typeof label === "string" ? label : "filter"}` : undefined}
          onMouseEnter={activeLabelIsClearable ? () => setActiveLabelHovered(true) : undefined}
          onMouseLeave={activeLabelIsClearable ? () => setActiveLabelHovered(false) : undefined}
          onClick={activeLabelIsClearable ? handleActiveLabelClear : undefined}
          onKeyDown={activeLabelIsClearable ? handleActiveLabelKeyDown : undefined}
          style={
            activeLabelIsClearable
              ? {
                  width: activeLabelWidth !== undefined ? `${activeLabelWidth}px` : undefined,
                  textAlign: "center",
                  display: "inline-flex",
                  justifyContent: "center",
                  overflow: "hidden",
                }
              : undefined
          }
        >
          {activeLabelIsClearable && activeLabelHovered ? "×" : activeLabel}
        </span>
      )}
      {active && typeof count === "number" && !activeLabelIsClearable && (
        <span
          className={`filmwave-filter-count${onClear ? " is-clearable" : ""}`}
          role={onClear ? "button" : undefined}
          tabIndex={onClear ? 0 : undefined}
          aria-label={onClear ? `Clear ${typeof label === "string" ? label : "filter"}` : undefined}
          onClick={handleCountClear}
          onKeyDown={handleCountKeyDown}
        >
          <span className="filmwave-filter-count-value">{count}</span>
          {onClear && <span className="filmwave-filter-count-clear" aria-hidden="true">×</span>}
        </span>
      )}
      {active && showActiveDot && <span className="filmwave-filter-dot" />}
      {!hideChevron && <FilterChevron />}
    </button>
  );
}
