"use client";

import { useEffect, useRef, useState } from "react";
import { FilterPopover } from "./FilterPopover";
import { FilterTrigger } from "./FilterTrigger";
import { MusicCheckIcon } from "./MusicIcons";

export type MusicLibrarySortValue = "recent" | "downloaded" | "relevant" | "random";

export const MUSIC_LIBRARY_SORT_OPTIONS: Array<{
  value: MusicLibrarySortValue;
  label: string;
}> = [
  { value: "recent", label: "Most Recent" },
  { value: "downloaded", label: "Most Downloaded" },
  { value: "relevant", label: "Most Relevant" },
  { value: "random", label: "Random" },
];

export function MusicLibrarySortControl({
  value,
  onChange,
}: {
  value: MusicLibrarySortValue;
  onChange: (value: MusicLibrarySortValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = MUSIC_LIBRARY_SORT_OPTIONS.find((option) => option.value === value) ?? MUSIC_LIBRARY_SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

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
  }, [open]);

  return (
    <div ref={wrapperRef} className="filmwave-filter-popover-wrap filmwave-music-sort-wrap">
      <FilterTrigger
        buttonRef={triggerRef}
        label={selectedOption.label}
        open={open}
        className="filmwave-music-sort-trigger"
        onClick={() => setOpen(!open)}
      />

      <FilterPopover
        open={open}
        triggerRef={triggerRef}
        width={190}
        className="filmwave-filter-panel filmwave-music-sort-panel"
      >
        <div className="filmwave-playlist-filter-scroll">
          {MUSIC_LIBRARY_SORT_OPTIONS.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={`filmwave-filter-row-button${selected ? " is-active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="filmwave-filter-row-label">
                  <span className="filmwave-filter-row-text">{option.label}</span>
                </span>

                <span className={`filmwave-filter-row-action${selected ? " is-active" : ""}`}>
                  {selected ? <MusicCheckIcon size={11} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </FilterPopover>
    </div>
  );
}
