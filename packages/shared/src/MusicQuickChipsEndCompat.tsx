"use client";

import {
  Children,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  MusicLibrarySortControl,
  type MusicLibrarySortValue,
} from "./MusicLibrarySortControl";

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

function createLegacyClickEvent(): React.MouseEvent<HTMLButtonElement> {
  return {
    preventDefault() {},
    stopPropagation() {},
  } as React.MouseEvent<HTMLButtonElement>;
}

function LegacySortAdapter({
  shuffleControl,
  recentButton,
  popularButton,
}: {
  shuffleControl: ReactNode;
  recentButton: LegacySortButtonElement;
  popularButton: LegacySortButtonElement;
}) {
  const value: MusicLibrarySortValue = isPressed(popularButton)
    ? "downloaded"
    : "recent";

  function handleSortChange(nextValue: MusicLibrarySortValue) {
    if (nextValue === value) return;

    const sourceButton = nextValue === "downloaded" ? popularButton : recentButton;
    sourceButton.props.onClick?.(createLegacyClickEvent());
  }

  return (
    <span className="fw-quick-end">
      {shuffleControl}
      <MusicLibrarySortControl value={value} onChange={handleSortChange} />
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
      <LegacySortAdapter
        shuffleControl={shuffleControl}
        recentButton={recentButton}
        popularButton={popularButton}
      />
    );
  }

  return <span className="fw-quick-end">{children}</span>;
}
