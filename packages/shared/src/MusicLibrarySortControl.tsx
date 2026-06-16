"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const activeOption =
    MUSIC_LIBRARY_SORT_OPTIONS.find((option) => option.value === value) ??
    MUSIC_LIBRARY_SORT_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!controlRef.current) return;
      if (controlRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function toggleDropdown(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen((current) => !current);
  }

  function selectOption(
    event: ReactMouseEvent<HTMLButtonElement>,
    nextValue: MusicLibrarySortValue,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (nextValue !== value) {
      onChange(nextValue);
    }

    setIsOpen(false);
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  return (
    <div className="filmwave-music-sort-control" ref={controlRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`fw-filter-chip fw-quick-chip filmwave-music-sort-button${
          isOpen ? " is-open" : ""
        }`}
        onClick={toggleDropdown}
        onKeyDown={handleButtonKeyDown}
      >
        <span>{activeOption.label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          focusable="false"
          className="filmwave-music-sort-chevron"
        >
          <path
            d="M4.5 6.25 8 9.75l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="filmwave-dropdown-shell filmwave-music-sort-menu" role="menu">
          {MUSIC_LIBRARY_SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.value}
              className={`filmwave-dropdown-item${
                value === option.value ? " is-selected" : ""
              }`}
              onClick={(event) => selectOption(event, option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
