"use client";

import { useEffect, useRef, useState } from "react";

export type MusicLibrarySortValue = "recent" | "downloaded" | "random";
type RealMusicLibrarySortValue = Exclude<MusicLibrarySortValue, "random">;

export const MUSIC_LIBRARY_SORT_OPTIONS: Array<{
  value: RealMusicLibrarySortValue;
  label: string;
}> = [
  { value: "recent", label: "Most Recent" },
  { value: "downloaded", label: "Most Popular" },
];

const MUSIC_LIBRARY_SORT_STORAGE_KEY = "filmwave-music-library-sort-order";

function getStoredSortValue(): RealMusicLibrarySortValue | null {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.localStorage.getItem(
      MUSIC_LIBRARY_SORT_STORAGE_KEY,
    );

    if (storedValue === "recent" || storedValue === "downloaded") {
      return storedValue;
    }
  } catch {
    // Ignore storage failures.
  }

  return null;
}

function setStoredSortValue(value: RealMusicLibrarySortValue) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MUSIC_LIBRARY_SORT_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures.
  }
}

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
  const skipNextRestoreRef = useRef(false);

  const selectedOption =
    MUSIC_LIBRARY_SORT_OPTIONS.find((option) => option.value === value) ??
    MUSIC_LIBRARY_SORT_OPTIONS[0];

  useEffect(() => {
    if (value !== "recent" && value !== "downloaded") return;

    const storedValue = getStoredSortValue();

    if (!storedValue) {
      setStoredSortValue(value);
      return;
    }

    if (skipNextRestoreRef.current) {
      skipNextRestoreRef.current = false;
      return;
    }

    if (storedValue !== value) {
      onChange(storedValue);
    }
  }, [onChange, value]);

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
              onClick={() => {
                skipNextRestoreRef.current = true;
                setStoredSortValue(option.value);
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
