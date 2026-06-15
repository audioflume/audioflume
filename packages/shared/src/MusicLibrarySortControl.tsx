"use client";

import type { MouseEvent as ReactMouseEvent } from "react";

export type MusicLibrarySortValue = "recent" | "downloaded";

export const MUSIC_LIBRARY_SORT_OPTIONS: Array<{
  value: MusicLibrarySortValue;
  label: string;
}> = [
  { value: "recent", label: "Most Recent" },
  { value: "downloaded", label: "Most Popular" },
];

export function MusicLibrarySortControl({
  value,
  onChange,
}: {
  value: MusicLibrarySortValue;
  onChange: (value: MusicLibrarySortValue) => void;
}) {
  function selectOption(
    event: ReactMouseEvent<HTMLButtonElement>,
    nextValue: MusicLibrarySortValue,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (nextValue === value) return;

    onChange(nextValue);
  }

  return (
    <>
      {MUSIC_LIBRARY_SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={`fw-filter-chip fw-quick-chip${
            value === option.value ? " is-selected" : ""
          }`}
          onClick={(event) => selectOption(event, option.value)}
        >
          {option.label}
        </button>
      ))}
    </>
  );
}
