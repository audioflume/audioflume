import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from "react";

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
  const activeLabelIsClearable = active && activeLabel != null && !!onClear;
  const ignoreNextTriggerClickRef = useRef(false);
  const clearHandledOnPointerDownRef = useRef(false);

  function stopClearInteraction(
    event:
      | PointerEvent<HTMLSpanElement>
      | MouseEvent<HTMLSpanElement>
      | KeyboardEvent<HTMLSpanElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
  }

  function markClearInteraction(
    event:
      | PointerEvent<HTMLSpanElement>
      | MouseEvent<HTMLSpanElement>
      | KeyboardEvent<HTMLSpanElement>,
  ) {
    if (!onClear) return;
    ignoreNextTriggerClickRef.current = true;
    stopClearInteraction(event);
  }

  function handleTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    if (ignoreNextTriggerClickRef.current) {
      ignoreNextTriggerClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if ((event.target as HTMLElement).closest("[data-filmwave-filter-clear]")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick();
  }

  function handleClearPointerDown(event: PointerEvent<HTMLSpanElement>) {
    if (!onClear) return;
    markClearInteraction(event);
    clearHandledOnPointerDownRef.current = true;
    onClear();
  }

  function handleClearMouseDown(event: MouseEvent<HTMLSpanElement>) {
    markClearInteraction(event);
  }

  function handleCountClear(event: MouseEvent<HTMLSpanElement>) {
    if (!onClear) return;
    markClearInteraction(event);

    if (clearHandledOnPointerDownRef.current) {
      clearHandledOnPointerDownRef.current = false;
      return;
    }

    onClear();
  }

  function handleCountKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (!onClear || (event.key !== "Enter" && event.key !== " ")) return;
    markClearInteraction(event);
    onClear();
  }

  function handleActiveLabelClear(event: MouseEvent<HTMLSpanElement>) {
    if (!onClear) return;
    markClearInteraction(event);

    if (clearHandledOnPointerDownRef.current) {
      clearHandledOnPointerDownRef.current = false;
      return;
    }

    onClear();
  }

  function handleActiveLabelKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (!onClear || (event.key !== "Enter" && event.key !== " ")) return;
    markClearInteraction(event);
    onClear();
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleTriggerClick}
      disabled={disabled}
      className={`filmwave-filter-trigger${active ? " is-active" : ""}${open ? " is-open" : ""}${hideChevron ? " no-chevron" : ""}${className ? ` ${className}` : ""}`}
      aria-expanded={hideChevron ? undefined : open}
      aria-pressed={hideChevron ? active : undefined}
    >
      {icon && <span className="filmwave-filter-trigger-icon">{icon}</span>}
      <span>{label}</span>
      {active && activeLabel != null && (
        <span
          className={`filmwave-filter-trigger-active-label${activeLabelIsClearable ? " is-clearable" : ""}`}
          role={activeLabelIsClearable ? "button" : undefined}
          tabIndex={activeLabelIsClearable ? 0 : undefined}
          aria-label={activeLabelIsClearable ? `Clear ${typeof label === "string" ? label : "filter"}` : undefined}
          data-filmwave-filter-clear={activeLabelIsClearable ? "true" : undefined}
          onPointerDown={activeLabelIsClearable ? handleClearPointerDown : undefined}
          onMouseDown={activeLabelIsClearable ? handleClearMouseDown : undefined}
          onClick={activeLabelIsClearable ? handleActiveLabelClear : undefined}
          onKeyDown={activeLabelIsClearable ? handleActiveLabelKeyDown : undefined}
        >
          {/* Label text — fades out on hover via CSS */}
          <span className="filmwave-filter-active-label-value">{activeLabel}</span>
          {/* × overlay — fades in on hover via CSS, same styling as .filmwave-filter-count-clear */}
          {activeLabelIsClearable && (
            <span className="filmwave-filter-active-label-clear" aria-hidden="true">×</span>
          )}
        </span>
      )}
      {active && typeof count === "number" && !activeLabelIsClearable && (
        <span
          className={`filmwave-filter-count${onClear ? " is-clearable" : ""}`}
          role={onClear ? "button" : undefined}
          tabIndex={onClear ? 0 : undefined}
          aria-label={onClear ? `Clear ${typeof label === "string" ? label : "filter"}` : undefined}
          data-filmwave-filter-clear={onClear ? "true" : undefined}
          onPointerDown={onClear ? handleClearPointerDown : undefined}
          onMouseDown={onClear ? handleClearMouseDown : undefined}
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
