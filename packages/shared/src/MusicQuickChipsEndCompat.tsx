"use client";

import {
  Children,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { MusicQuickChip } from "./MusicLibraryRedesign";
import {
  MusicLibrarySortControl,
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

function callLegacyClick(button: LegacyButtonElement) {
  button.props.onClick?.({
    preventDefault() {},
    stopPropagation() {},
  } as React.MouseEvent<HTMLButtonElement>);
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
  const shuffleActive = isPressed(shuffleButton);
  const value: MusicLibrarySortValue = isPressed(popularButton)
    ? "downloaded"
    : "recent";

  function handleShuffleClick() {
    callLegacyClick(shuffleButton);
  }

  function handleSortChange(nextValue: MusicLibrarySortValue) {
    if (nextValue === value) return;

    callLegacyClick(nextValue === "downloaded" ? popularButton : recentButton);
  }

  return (
    <span className="fw-quick-end">
      <MusicQuickChip active={shuffleActive} onClick={handleShuffleClick}>
        {shuffleButton.props.children}
      </MusicQuickChip>
      <MusicLibrarySortControl value={value} onChange={handleSortChange} />
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
