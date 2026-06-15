"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

type LegacySortButtonElement = ReactElement<
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

function isLegacySortButton(
  child: ReactNode,
  expectedLabel: string,
): child is LegacySortButtonElement {
  if (!isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(child)) {
    return false;
  }

  if (child.type !== "button") {
    return false;
  }

  return getTextContent(child.props.children) === expectedLabel;
}

function isPressed(button: LegacySortButtonElement) {
  return button.props["aria-pressed"] === true;
}

function SortChevronIcon() {
  return (
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
  );
}

function LegacySortDropdown({
  shuffleControl,
  recentButton,
  popularButton,
}: {
  shuffleControl: ReactNode;
  recentButton: LegacySortButtonElement;
  popularButton: LegacySortButtonElement;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const activeValue = isPressed(popularButton) ? "downloaded" : "recent";
  const activeLabel = activeValue === "downloaded" ? "Most Popular" : "Most Recent";

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
    value: "recent" | "downloaded",
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (value !== activeValue) {
      const sourceButton = value === "downloaded" ? popularButton : recentButton;
      sourceButton.props.onClick?.(event);
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
    <span className="fw-quick-end">
      {shuffleControl}
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
          <span>{activeLabel}</span>
          <SortChevronIcon />
        </button>

        {isOpen ? (
          <div className="filmwave-music-sort-dropdown" role="menu">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={activeValue === "recent"}
              className={`filmwave-music-sort-option${
                activeValue === "recent" ? " is-selected" : ""
              }`}
              onClick={(event) => selectOption(event, "recent")}
            >
              Most Recent
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={activeValue === "downloaded"}
              className={`filmwave-music-sort-option${
                activeValue === "downloaded" ? " is-selected" : ""
              }`}
              onClick={(event) => selectOption(event, "downloaded")}
            >
              Most Popular
            </button>
          </div>
        ) : null}
      </div>
    </span>
  );
}

export function MusicQuickChipsEnd({ children }: { children: ReactNode }) {
  const childArray = Children.toArray(children);
  const [shuffleControl, recentButton, popularButton] = childArray;

  if (
    childArray.length === 3 &&
    isLegacySortButton(recentButton, "Most Recent") &&
    isLegacySortButton(popularButton, "Most Popular")
  ) {
    return (
      <LegacySortDropdown
        shuffleControl={shuffleControl}
        recentButton={recentButton}
        popularButton={popularButton}
      />
    );
  }

  return <span className="fw-quick-end">{children}</span>;
}
