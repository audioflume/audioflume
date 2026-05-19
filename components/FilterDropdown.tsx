"use client";

import { useEffect, useRef, useState } from "react";
import CheckIcon from "@/components/icons/CheckIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import {
  filterClearButtonClass,
  filterDropdownHeaderClass,
  filterDropdownPanelClass,
  filterDropdownTitleClass,
  filterRowButtonActiveClass,
  filterRowButtonClass,
  filterRowButtonInactiveClass,
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
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

function getDefaultSections(label: string, options: string[]): FilterOptionSection[] {
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${filterTriggerBaseClass} ${
          open || hasActive
            ? filterTriggerActiveClass
            : filterTriggerInactiveClass
        }`}
      >
        <span>{label}</span>

        {hasActive && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10px] font-medium text-[var(--text-primary)]">
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full z-50 mt-2 overflow-hidden ${filterDropdownPanelClass}`}
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
              <div
                key={`${section.label || "section"}-${sectionIndex}`}
                className={sectionIndex > 0 ? "mt-2 border-t border-[var(--border)] pt-2" : ""}
              >
                {section.label && (
                  <div className="px-3 pb-2 pt-1 text-[10px] font-medium tracking-[0.02em] text-[var(--text-muted)]">
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
        </div>
      )}
    </div>
  );
}
