"use client";

import { useState } from "react";
import DropdownShell from "./DropdownShell";

export type MusicLibrarySortValue = "recent" | "downloaded" | "relevant" | "random";

export const MUSIC_LIBRARY_SORT_OPTIONS: Array<{
  value: MusicLibrarySortValue;
  label: string;
}> = [
  { value: "recent", label: "Most Recent" },
  { value: "downloaded", label: "Most Popular" },
  { value: "relevant", label: "Most Relevant" },
  { value: "random", label: "Random" },
];

function SortChevron() {
  return (
    <svg
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

export function MusicLibrarySortControl({
  value,
  onChange,
}: {
  value: MusicLibrarySortValue;
  onChange: (value: MusicLibrarySortValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption =
    MUSIC_LIBRARY_SORT_OPTIONS.find((option) => option.value === value) ??
    MUSIC_LIBRARY_SORT_OPTIONS[0];

  return (
    <DropdownShell
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      className="filmwave-music-sort-dropdown"
      offsetAmount={6}
      flippedOffsetAmount={6}
      collisionPadding={{ top: 163, right: 16, bottom: 85, left: 16 }}
      elevateTrigger={false}
      trigger={({ open: triggerOpen }) => (
        <button
          type="button"
          className={`filmwave-music-sort-button${triggerOpen ? " is-open" : ""}`}
          aria-expanded={triggerOpen}
        >
          <span>{selectedOption.label}</span>
          <SortChevron />
        </button>
      )}
    >
      {MUSIC_LIBRARY_SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="menuitem"
          onClick={() => {
            onChange(option.value);
            setOpen(false);
          }}
        >
          {option.label}
        </button>
      ))}
    </DropdownShell>
  );
}
