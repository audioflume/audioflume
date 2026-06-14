"use client";

import { useEffect, useRef, useState } from "react";

export type MusicLibrarySortValue = "recent" | "downloaded" | "random";

export const MUSIC_LIBRARY_SORT_OPTIONS: Array<{
  value: MusicLibrarySortValue;
  label: string;
}> = [
  { value: "recent", label: "Most Recent" },
  { value: "downloaded", label: "Most Popular" },
];

const LAST_REAL_SORT_STORAGE_KEY = "filmwave-music-last-real-sort";
const SHUFFLE_WAS_ACTIVE_STORAGE_KEY = "filmwave-music-shuffle-was-active";
const SUPPRESS_SHUFFLE_RESTORE_STORAGE_KEY =
  "filmwave-music-suppress-shuffle-restore";

let lastRealMusicLibrarySortValue: MusicLibrarySortValue = "recent";
let musicLibraryShuffleWasActive = false;

function isRealSortValue(value: string | null): value is MusicLibrarySortValue {
  return value === "recent" || value === "downloaded";
}

function getStoredLastRealSortValue() {
  if (typeof window === "undefined") return lastRealMusicLibrarySortValue;

  try {
    const storedValue = window.sessionStorage.getItem(
      LAST_REAL_SORT_STORAGE_KEY,
    );

    if (isRealSortValue(storedValue)) return storedValue;
  } catch {
    // Ignore sessionStorage failures and use the module fallback.
  }

  return lastRealMusicLibrarySortValue;
}

function setStoredLastRealSortValue(value: MusicLibrarySortValue) {
  lastRealMusicLibrarySortValue = value;

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(LAST_REAL_SORT_STORAGE_KEY, value);
  } catch {
    // Ignore sessionStorage failures.
  }
}

function getStoredShuffleWasActive() {
  if (typeof window === "undefined") return musicLibraryShuffleWasActive;

  try {
    return (
      window.sessionStorage.getItem(SHUFFLE_WAS_ACTIVE_STORAGE_KEY) === "true"
    );
  } catch {
    return musicLibraryShuffleWasActive;
  }
}

function setStoredShuffleWasActive(value: boolean) {
  musicLibraryShuffleWasActive = value;

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      SHUFFLE_WAS_ACTIVE_STORAGE_KEY,
      String(value),
    );
  } catch {
    // Ignore sessionStorage failures.
  }
}

function getStoredSuppressShuffleRestore() {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.sessionStorage.getItem(SUPPRESS_SHUFFLE_RESTORE_STORAGE_KEY) ===
      "true"
    );
  } catch {
    return false;
  }
}

function setStoredSuppressShuffleRestore(value: boolean) {
  if (typeof window === "undefined") return;

  try {
    if (value) {
      window.sessionStorage.setItem(SUPPRESS_SHUFFLE_RESTORE_STORAGE_KEY, "true");
    } else {
      window.sessionStorage.removeItem(SUPPRESS_SHUFFLE_RESTORE_STORAGE_KEY);
    }
  } catch {
    // Ignore sessionStorage failures.
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
  const suppressNextRecentRestoreRef = useRef(false);

  const displayedValue =
    value === "random" ? getStoredLastRealSortValue() : value;
  const selectedOption =
    MUSIC_LIBRARY_SORT_OPTIONS.find((option) => option.value === displayedValue) ??
    MUSIC_LIBRARY_SORT_OPTIONS[0];

  useEffect(() => {
    if (value === "random") {
      setStoredShuffleWasActive(true);
      return;
    }

    const suppressRestore =
      suppressNextRecentRestoreRef.current || getStoredSuppressShuffleRestore();
    const previousSortValue = getStoredLastRealSortValue();
    const shouldRestorePreviousSort =
      getStoredShuffleWasActive() &&
      value === "recent" &&
      !suppressRestore &&
      previousSortValue !== "recent";

    if (shouldRestorePreviousSort) {
      setStoredShuffleWasActive(false);
      setStoredSuppressShuffleRestore(false);
      suppressNextRecentRestoreRef.current = false;

      window.setTimeout(() => {
        onChange(previousSortValue);
      }, 0);
      return;
    }

    setStoredShuffleWasActive(false);
    setStoredSuppressShuffleRestore(false);
    suppressNextRecentRestoreRef.current = false;
    setStoredLastRealSortValue(value);
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
                if (option.value === "recent") {
                  suppressNextRecentRestoreRef.current = true;
                  setStoredSuppressShuffleRestore(true);
                }

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
