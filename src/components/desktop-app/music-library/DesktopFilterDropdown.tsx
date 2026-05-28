import { useEffect, useRef } from "react";

export default function DesktopFilterDropdown({
  label,
  options,
  selected,
  open,
  onOpenChange,
  onToggleOption,
}: {
  label: string;
  options: string[];
  selected: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleOption: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false);
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onOpenChange]);

  return (
    <div className="desktop-filter-wrap" ref={ref}>
      <button
        type="button"
        className={`desktop-filter-trigger${open || selected.length ? " is-active" : ""}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <span>{label}</span>
        {selected.length > 0 && <span className="desktop-filter-dot" />}
      </button>

      {open && (
        <div className="desktop-filter-menu">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`desktop-filter-option${selected.includes(option) ? " is-selected" : ""}`}
              onClick={() => onToggleOption(option)}
            >
              <span>{option}</span>
              {selected.includes(option) && <span>•</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
