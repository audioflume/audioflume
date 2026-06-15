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

function getElementSummary(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null;

  return {
    tagName: target.tagName,
    text: target.textContent?.trim() ?? "",
    className: target.className,
    dataRole: target.getAttribute("data-filmwave-quick-role"),
    ariaExpanded: target.getAttribute("aria-expanded"),
    ariaPressed: target.getAttribute("aria-pressed"),
    role: target.getAttribute("role"),
  };
}

function getRectSummary(element: Element | null) {
  if (!(element instanceof HTMLElement)) return null;
  const rect = element.getBoundingClientRect();

  return {
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function getPathSummary(event: Event) {
  return event
    .composedPath()
    .filter((target): target is HTMLElement => target instanceof HTMLElement)
    .slice(0, 10)
    .map((element) => ({
      tagName: element.tagName,
      text: element.textContent?.trim() ?? "",
      className: element.className,
      dataRole: element.getAttribute("data-filmwave-quick-role"),
      ariaExpanded: element.getAttribute("aria-expanded"),
      ariaPressed: element.getAttribute("aria-pressed"),
      role: element.getAttribute("role"),
    }));
}

function debugQuickActions(label: string, payload: Record<string, unknown>) {
  console.log("[Filmwave quick actions debug]", label, payload);
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
    "data-filmwave-quick-role": "shuffle",
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      debugQuickActions("shuffle React onClick", {
        detail: event.detail,
        selectedBefore: selected,
        target: getElementSummary(event.target),
        currentTarget: getElementSummary(event.currentTarget),
        path: getPathSummary(event.nativeEvent),
      });
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

  function getDiagnosticSnapshot(event?: Event) {
    const wrapper = wrapperRef.current;
    const shuffle = wrapper?.querySelector('[data-filmwave-quick-role="shuffle"]') ?? null;
    const sortButton = wrapper?.querySelector('[data-filmwave-quick-role="sort-button"]') ?? null;
    const dropdown = wrapper?.querySelector('[data-filmwave-quick-role="sort-dropdown"]') ?? null;
    const activeOption = wrapper?.querySelector('[data-filmwave-quick-role="active-option"]') ?? null;
    const inactiveOption = wrapper?.querySelector('[data-filmwave-quick-role="inactive-option"]') ?? null;
    const pointerEvent = event instanceof PointerEvent || event instanceof MouseEvent ? event : null;
    const elementFromPoint = pointerEvent
      ? document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
      : null;

    return {
      isOpen,
      shuffleActive,
      recentPressed,
      popularPressed,
      activeSortLabel,
      inactiveSortLabel,
      activeElement: getElementSummary(document.activeElement),
      elementFromPoint: getElementSummary(elementFromPoint),
      pointer: pointerEvent
        ? {
            clientX: Math.round(pointerEvent.clientX),
            clientY: Math.round(pointerEvent.clientY),
            detail: pointerEvent.detail,
            button: pointerEvent.button,
            buttons: pointerEvent.buttons,
          }
        : null,
      rects: {
        wrapper: getRectSummary(wrapper),
        shuffle: getRectSummary(shuffle),
        sortButton: getRectSummary(sortButton),
        dropdown: getRectSummary(dropdown),
        activeOption: getRectSummary(activeOption),
        inactiveOption: getRectSummary(inactiveOption),
      },
      target: event ? getElementSummary(event.target) : null,
      path: event ? getPathSummary(event) : null,
    };
  }

  useEffect(() => {
    debugQuickActions("state", getDiagnosticSnapshot());
  }, [activeSortLabel, inactiveSortLabel, isOpen, popularPressed, recentPressed, shuffleActive]);

  useEffect(() => {
    const events = ["pointerdown", "mousedown", "mouseup", "click"] as const;

    function handleDocumentEvent(event: Event) {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const pointerEvent = event instanceof PointerEvent || event instanceof MouseEvent ? event : null;
      const elementFromPoint = pointerEvent
        ? document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
        : null;
      const eventPath = event.composedPath();
      const relatedToQuickActions =
        eventPath.includes(wrapper) ||
        (elementFromPoint instanceof Node && wrapper.contains(elementFromPoint));

      if (!relatedToQuickActions) return;

      debugQuickActions(`document ${event.type} capture`, getDiagnosticSnapshot(event));
    }

    for (const eventName of events) {
      document.addEventListener(eventName, handleDocumentEvent, true);
    }

    return () => {
      for (const eventName of events) {
        document.removeEventListener(eventName, handleDocumentEvent, true);
      }
    };
  }, [activeSortLabel, inactiveSortLabel, isOpen, popularPressed, recentPressed, shuffleActive]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      debugQuickActions("outside pointerdown closes dropdown", getDiagnosticSnapshot(event));
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
  }, [activeSortLabel, inactiveSortLabel, isOpen, popularPressed, recentPressed, shuffleActive]);

  function chooseSort(button: LegacyButtonElement) {
    debugQuickActions("choose sort", {
      chosenLabel: getTextContent(button.props.children),
      snapshot: getDiagnosticSnapshot(),
    });
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
    <span
      className="fw-quick-end filmwave-music-quick-actions-inline"
      data-filmwave-quick-role="wrapper"
      ref={wrapperRef}
      onClickCapture={(event) => {
        debugQuickActions("wrapper React onClickCapture", getDiagnosticSnapshot(event.nativeEvent));
      }}
    >
      {cloneShuffleButton(shuffleButton, shuffleActive)}
      <span className="filmwave-music-sort-control" data-filmwave-quick-role="sort-control">
        <button
          type="button"
          className={`fw-filter-chip fw-quick-chip filmwave-music-sort-button${
            isOpen ? " is-open" : ""
          }`}
          data-filmwave-quick-role="sort-button"
          aria-expanded={isOpen}
          onClick={(event) => {
            debugQuickActions("sort button React onClick", getDiagnosticSnapshot(event.nativeEvent));
            event.preventDefault();
            event.stopPropagation();
            setIsOpen((open) => !open);
          }}
        >
          <span>{activeSortLabel}</span>
          <ChevronDownIcon />
        </button>
        {isOpen && (
          <div
            className="filmwave-music-sort-dropdown"
            data-filmwave-quick-role="sort-dropdown"
            role="menu"
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={true}
              className="filmwave-music-sort-option is-selected"
              data-filmwave-quick-role="active-option"
              onMouseDown={(event) => {
                debugQuickActions("active option React onMouseDown", getDiagnosticSnapshot(event.nativeEvent));
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
              data-filmwave-quick-role="inactive-option"
              onMouseDown={(event) => {
                debugQuickActions("inactive option React onMouseDown", getDiagnosticSnapshot(event.nativeEvent));
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
