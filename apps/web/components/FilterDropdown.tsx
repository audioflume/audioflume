"use client";

import { FilterTrigger } from "@filmwave/shared";
import { useEffect, useRef, useState } from "react";
import CheckIcon from "@/components/icons/CheckIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import FilterPopover from "@/components/FilterPopover";
import {
  filterClearButtonClass,
  filterDropdownHeaderClass,
  filterDropdownPanelClass,
  filterDropdownTitleClass,
  filterRowButtonActiveClass,
  filterRowButtonClass,
  filterRowButtonInactiveClass,
} from "@/components/filterUiClasses";

type FilterOptionSection = {
  label?: string;
  options: string[];
};

type FilterDropdownProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  optionSections?: FilterOptionSection[];
};

function getDefaultSections(
  label: string,
  options: string[],
): FilterOptionSection[] {
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

export default function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  optionSections,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sections: FilterOptionSection[] =
    optionSections && optionSections.length > 0
      ? optionSections
      : getDefaultSections(label, options);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option],
    );
  }

  const hasActive = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <FilterTrigger
        buttonRef={triggerRef}
        label={label}
        active={hasActive}
        open={open}
        count={selected.length}
        onClick={() => setOpen((v) => !v)}
      />

      <FilterPopover
        open={open}
        triggerRef={triggerRef}
        width={280}
        className={`overflow-hidden ${filterDropdownPanelClass}`}
      >
        <div className={filterDropdownHeaderClass}>
          <div className={filterDropdownTitleClass}>{label}</div>

          {hasActive && (
            <button
              type="button"
              onClick={() => onChange([])}
              className={filterClearButtonClass}
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-[340px] overflow-y-auto p-1.5">
          {sections.map((section, sectionIndex) => (
            <div key={`${section.label || "section"}-${sectionIndex}`}>
              {section.options.map((option) => {
                const isSelected = selected.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggle(option)}
                    className={`group ${filterRowButtonClass} ${
                      isSelected
                        ? filterRowButtonActiveClass
                        : filterRowButtonInactiveClass
                    }`}
                  >
                    <span className="min-w-0 truncate">{option}</span>

                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition ${
                        isSelected
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                          : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {isSelected ? (
                        <CheckIcon size={11} />
                      ) : (
                        <PlusIcon size={11} />
                      )}
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
