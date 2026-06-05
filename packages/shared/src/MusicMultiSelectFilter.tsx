"use client";

import { useEffect, useRef, useState } from "react";
import { FilterPopover } from "./FilterPopover";
import { FilterTrigger } from "./FilterTrigger";

export type MusicMultiSelectFilterSection = {
  label?: string;
  options: string[];
};

type MusicMultiSelectFilterProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange?: (selected: string[]) => void;
  onToggleOption?: (option: string) => void;
  onClear?: () => void;
  optionSections?: MusicMultiSelectFilterSection[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  width?: number;
  disabled?: boolean;
};

function getDefaultSections(
  label: string,
  options: string[],
): MusicMultiSelectFilterSection[] {
  if (label !== "Cue Points") return [{ options }];

  const cuePointOptions = ["First Hit", "Main Drop", "Break", "Button Ending"];
  const smartFilterOptions = options.filter(
    (option) => !cuePointOptions.includes(option),
  );

  return [
    {
      label: "Detected Cue Points",
      options: cuePointOptions.filter((option) => options.includes(option)),
    },
    {
      label: "Smart Filters",
      options: smartFilterOptions,
    },
  ].filter((section) => section.options.length > 0);
}

function CheckIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5V19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MusicMultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  onToggleOption,
  onClear,
  optionSections,
  open,
  onOpenChange,
  width = 280,
  disabled = false,
}: MusicMultiSelectFilterProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isControlledOpen = typeof open === "boolean";
  const isOpen = isControlledOpen ? open : internalOpen;
  const sections = optionSections && optionSections.length > 0
    ? optionSections
    : getDefaultSections(label, options);
  const hasActive = selected.length > 0;

  function setOpen(nextOpen: boolean) {
    if (!isControlledOpen) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function toggle(option: string) {
    if (onToggleOption) {
      onToggleOption(option);
      return;
    }

    onChange?.(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  }

  function clear() {
    if (onClear) {
      onClear();
      return;
    }

    onChange?.([]);
  }

  const canClear = Boolean(onClear || onChange);

  return (
    <div ref={wrapperRef} className="filmwave-filter-popover-wrap">
      <FilterTrigger
        buttonRef={triggerRef}
        label={label}
        active={hasActive}
        open={isOpen}
        count={selected.length}
        disabled={disabled}
        onClick={() => setOpen(!isOpen)}
        onClear={canClear ? clear : undefined}
      />

      <FilterPopover
        open={isOpen}
        triggerRef={triggerRef}
        width={width}
        className="filmwave-filter-panel"
      >
        <div className="filmwave-filter-dropdown-header">
          <div className="filmwave-filter-dropdown-title">{label}</div>

          {hasActive && canClear && (
            <button
              type="button"
              onClick={clear}
              className="filmwave-filter-clear-button"
            >
              Clear
            </button>
          )}
        </div>

        <div className="filmwave-playlist-filter-scroll">
          {sections.map((section, sectionIndex) => (
            <div key={`${section.label || "section"}-${sectionIndex}`}>
              {section.label && (
                <div
                  className="desktop-sidebar-projects-label"
                  style={{
                    display: "block",
                    margin: `${sectionIndex === 0 ? 10 : 16}px 10px 8px`,
                  }}
                >
                  {section.label}
                </div>
              )}

              {section.options.map((option) => {
                const isSelected = selected.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggle(option)}
                    className={`filmwave-filter-row-button${isSelected ? " is-active" : ""}`}
                  >
                    <span className="filmwave-filter-row-label">
                      <span className="filmwave-filter-row-text">{option}</span>
                    </span>

                    <span
                      className={`filmwave-filter-row-action${isSelected ? " is-active" : ""}`}
                    >
                      {isSelected ? <CheckIcon /> : <PlusIcon />}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </FilterPopover>
    </div>
  );
}
