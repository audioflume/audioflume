"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  MUSIC_LIBRARY_SORT_OPTIONS,
  type MusicLibrarySortValue,
} from "./MusicLibrarySortControl";

type LegacyButtonElement = ReactElement<
  ButtonHTMLAttributes<HTMLButtonElement>
>;

function getTextContent(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return getTextContent(child.props.children);
      }

      return "";
    })
    .join("")
    .trim();
}

function isLegacyButton(
  child: ReactNode,
  expectedLabel?: string,
): child is LegacyButtonElement {
  if (!isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(child)) {
    return false;
  }

  if (child.type !== "button") {
    return false;
  }

  return expectedLabel === undefined || getTextContent(child.props.children) === expectedLabel;
}

function isPressed(button: LegacyButtonElement) {
  return button.props["aria-pressed"] === true;
}

function LegacyQuickActionsAdapter({
  shuffleButton,
  recentButton,
  popularButton,
}: {
  shuffleButton: LegacyButtonElement;
  recentButton: LegacyButtonElement;
  popularButton: LegacyButtonElement;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const shuffleActive = isPressed(shuffleButton);
  const value: MusicLibrarySortValue = isPressed(popularButton)
    ? "downloaded"
    : "recent";
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

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function getSortButtonForValue(nextValue: MusicLibrarySortValue) {
    return nextValue === "downloaded" ? popularButton : recentButton;
  }

  return (
    <span className="fw-quick-end">
      {cloneElement(shuffleButton, {
        className: `fw-filter-chip fw-quick-chip${shuffleActive ? " is-selected" : ""}`,
        "aria-pressed": shuffleActive,
      })}

      <div className="filmwave-music-sort-control" ref={controlRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={`fw-filter-chip fw-quick-chip filmwave-music-sort-button${
            isOpen ? " is-open" : ""
          }`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen((current) => !current);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
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
          <div className="filmwave-music-sort-dropdown" role="menu">
            {MUSIC_LIBRARY_SORT_OPTIONS.map((option) => {
              const selected = value === option.value;
              const legacyButton = getSortButtonForValue(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`filmwave-music-sort-option${
                    selected ? " is-selected" : ""
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (!selected) {
                      legacyButton.props.onClick?.(event);
                    }

                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </span>
  );
}

export function MusicQuickChipsEnd({ children }: { children: ReactNode }) {
  const childArray = Children.toArray(children);
  const [shuffleButton, recentButton, popularButton] = childArray;

  if (
    childArray.length === 3 &&
    isLegacyButton(shuffleButton) &&
    isLegacyButton(recentButton, "Most Recent") &&
    isLegacyButton(popularButton, "Most Popular")
  ) {
    return (
      <LegacyQuickActionsAdapter
        shuffleButton={shuffleButton}
        recentButton={recentButton}
        popularButton={popularButton}
      />
    );
  }

  return <span className="fw-quick-end">{children}</span>;
}
