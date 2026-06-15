"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

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

function cloneShuffleButton(button: LegacyButtonElement, selected: boolean) {
  return cloneElement(button, {
    className: `fw-filter-chip fw-quick-chip${selected ? " is-selected" : ""}`,
    "aria-pressed": selected,
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      button.props.onClick?.(event);
    },
  });
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="8" height="8" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5.3 8.6a1.3 1.3 0 0 1 1.84-.04L12 13.2l4.86-4.64a1.3 1.3 0 0 1 1.8 1.88l-5.76 5.5a1.3 1.3 0 0 1-1.8 0l-5.76-5.5a1.3 1.3 0 0 1-.04-1.84Z"
      />
    </svg>
  );
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
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const shuffleActive = isPressed(shuffleButton);
  const recentPressed = isPressed(recentButton);
  const popularPressed = isPressed(popularButton);
  const activeSortButton = popularPressed ? popularButton : recentButton;
  const inactiveSortButton = popularPressed ? recentButton : popularButton;
  const activeSortLabel = getTextContent(activeSortButton.props.children);
  const inactiveSortLabel = getTextContent(inactiveSortButton.props.children);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function chooseSort(button: LegacyButtonElement) {
    button.props.onClick?.({
      preventDefault() {},
      stopPropagation() {},
    } as MouseEvent<HTMLButtonElement>);
    setIsOpen(false);
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, button: LegacyButtonElement) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    chooseSort(button);
  }

  return (
    <span className="fw-quick-end filmwave-music-quick-actions-inline" ref={wrapperRef}>
      {cloneShuffleButton(shuffleButton, shuffleActive)}
      <span className="filmwave-music-sort-control">
        <button
          type="button"
          className={`fw-filter-chip fw-quick-chip filmwave-music-sort-button${
            isOpen ? " is-open" : ""
          }`}
          aria-expanded={isOpen}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen((open) => !open);
          }}
        >
          <span>{activeSortLabel}</span>
          <ChevronDownIcon />
        </button>
        {isOpen && (
          <div className="filmwave-music-sort-dropdown" role="menu">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={true}
              className="filmwave-music-sort-option is-selected"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                chooseSort(activeSortButton);
              }}
              onKeyDown={(event) => handleOptionKeyDown(event, activeSortButton)}
            >
              {activeSortLabel}
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={false}
              className="filmwave-music-sort-option"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                chooseSort(inactiveSortButton);
              }}
              onKeyDown={(event) => handleOptionKeyDown(event, inactiveSortButton)}
            >
              {inactiveSortLabel}
            </button>
          </div>
        )}
      </span>
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
