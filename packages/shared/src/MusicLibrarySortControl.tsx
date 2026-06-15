"use client";

import { useEffect, useRef, useState } from "react";

export type MusicLibrarySortValue = "recent" | "downloaded";

export const MUSIC_LIBRARY_SORT_OPTIONS: Array<{
  value: MusicLibrarySortValue;
  label: string;
}> = [
  { value: "recent", label: "Most Recent" },
  { value: "downloaded", label: "Most Popular" },
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
  const controlRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    MUSIC_LIBRARY_SORT_OPTIONS.find((option) => option.value === value) ??
    MUSIC_LIBRARY_SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (controlRef.current?.contains(target)) return;

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectOption(nextValue: MusicLibrarySortValue) {
    setOpen(false);

    if (nextValue === value) return;

    onChange(nextValue);
  }

  return (
    <div
      ref={controlRef}
      className="filmwave-music-sort-control"
      data-dropdown-open={open ? "true" : "false"}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        className={`filmwave-music-sort-button${open ? " is-open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedOption.label}</span>
        <SortChevron />
      </button>

      {open && (
        <div
          className="filmwave-dropdown-shell filmwave-music-sort-dropdown"
          role="menu"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          {MUSIC_LIBRARY_SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              onClick={() => selectOption(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
