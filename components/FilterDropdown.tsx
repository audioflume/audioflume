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

type FilterDropdownProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

export default function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
            {options.map((option) => {
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
        </div>
      )}
    </div>
  );
}
