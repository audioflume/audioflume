"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import CheckIcon from "./icons/CheckIcon";

const SECTION_ID_BY_LABEL: Record<string, string> = {
  Mood: "mood",
  Scene: "mood",
  Genre: "genre",
  Region: "region",
  Instruments: "instruments",
  Vocals: "vocals",
  Build: "build",
  "Cue Points": "cuePoints",
  Playlist: "playlist",
  Duration: "duration",
  BPM: "bpm",
  Key: "key",
  Display: "display",
};

const DOT_ONLY_COUNT_SECTION_IDS = new Set(["playlist", "duration", "bpm", "key", "display"]);

const FILTER_COLUMN_SELECTOR = ".fw-filter-rail, .fw-filter-detail";
const SIDE_FILTER_SECTION_CLEAR_EVENT = "filmwave:side-filter-section-clear";
const DOT_ONLY_CHECK_STYLE_ID = "filmwave-dot-only-check-icon-styles";

const dotOnlyCheckRoots = new WeakMap<Element, Root>();

function ensureDotOnlyCheckStyle() {
  const existing = document.getElementById(DOT_ONLY_CHECK_STYLE_ID);
  if (existing) return null;

  const style = document.createElement("style");
  style.id = DOT_ONLY_CHECK_STYLE_ID;
  style.textContent = `
    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only::before {
      content: none !important;
      display: none !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover .fw-filter-rail-count-check {
      display: none !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count-check {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      transform: translateY(0px) !important;
      pointer-events: none !important;
    }

    main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count-check svg {
      display: block !important;
      width: 10px !important;
      height: 10px !important;
    }
  `;
  document.head.appendChild(style);
  return style;
}

function renderDotOnlyCheckIcon(count: HTMLElement) {
  let iconHost = count.querySelector<HTMLElement>(".fw-filter-rail-count-check");

  if (!iconHost) {
    count.replaceChildren();
    iconHost = document.createElement("span");
    iconHost.className = "fw-filter-rail-count-check";
    iconHost.setAttribute("aria-hidden", "true");
    count.appendChild(iconHost);
  }

  let root = dotOnlyCheckRoots.get(iconHost);

  if (!root) {
    root = createRoot(iconHost);
    dotOnlyCheckRoots.set(iconHost, root);
  }

  root.render(<CheckIcon size={10} strokeWidth={3} />);
}

function getRailItemKey(railItem: Element, panel: Element) {
  const railItems = Array.from(panel.querySelectorAll(".fw-filter-rail-item"));
  const index = railItems.indexOf(railItem);

  if (index >= 0) return String(index);

  return railItem.textContent?.trim() ?? "";
}

function getRailItemSectionId(railItem: Element) {
  const label = railItem.querySelector(".fw-filter-rail-label")?.textContent?.trim();

  if (!label) return null;

  return SECTION_ID_BY_LABEL[label] ?? null;
}

function syncDotOnlyRailCounts(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".fw-filter-rail-item").forEach((railItem) => {
    const sectionId = getRailItemSectionId(railItem);
    const count = railItem.querySelector<HTMLElement>(".fw-filter-rail-count");

    if (!count) return;

    const isDotOnly = sectionId ? DOT_ONLY_COUNT_SECTION_IDS.has(sectionId) : false;

    count.classList.toggle("is-dot-only", isDotOnly);

    if (!isDotOnly) {
      count.style.removeProperty("font-size");
      count.style.removeProperty("width");
      count.style.removeProperty("min-width");
      count.style.removeProperty("height");
      count.style.removeProperty("padding");
      return;
    }

    renderDotOnlyCheckIcon(count);
    count.style.setProperty("width", "16px", "important");
    count.style.setProperty("min-width", "16px", "important");
    count.style.setProperty("height", "16px", "important");
    count.style.setProperty("padding", "0", "important");
  });
}

function syncFilterColumnFadeState(column: HTMLElement) {
  const hasScrollTop = column.scrollTop > 1;
  const hasScrollBottom = column.scrollHeight - column.clientHeight - column.scrollTop > 1;
  const rect = column.getBoundingClientRect();

  column.classList.toggle("has-scroll-top", hasScrollTop);
  column.classList.toggle("has-scroll-bottom", hasScrollBottom);
  column.style.setProperty("--fw-filter-fade-left", `${rect.left}px`);
  column.style.setProperty("--fw-filter-fade-top", `${rect.top}px`);
  column.style.setProperty("--fw-filter-fade-width", `${column.clientWidth}px`);
  column.style.setProperty("--fw-filter-fade-height", `${rect.height}px`);
}

function syncFilterPanelColumnFadeStates(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(FILTER_COLUMN_SELECTOR).forEach(syncFilterColumnFadeState);
}

function dispatchSideFilterSectionClear(sectionId: string) {
  window.dispatchEvent(
    new CustomEvent(SIDE_FILTER_SECTION_CLEAR_EVENT, {
      detail: { sectionId },
    }),
  );
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  );

  descriptor?.set?.call(input, value);

  if (typeof InputEvent === "function") {
    input.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: value,
        inputType: "insertReplacementText",
      }),
    );
  } else {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function getBpmInputs(panel: HTMLElement) {
  return Array.from(
    panel.querySelectorAll<HTMLInputElement>(".fw-filter-detail .fw-filter-mini-field input"),
  );
}

function syncBpmSliderVisuals(panel: HTMLElement) {
  const fill = panel.querySelector<HTMLElement>(".fw-filter-detail .fw-range-fill");
  const handles = Array.from(
    panel.querySelectorAll<HTMLElement>(".fw-filter-detail .fw-range-handle"),
  );

  if (fill) {
    fill.style.left = "0%";
    fill.style.width = handles.length > 1 ? "100%" : "0%";
  }

  if (handles.length > 1) {
    handles[0].style.left = "0%";
    handles[1].style.left = "100%";
    return;
  }

  if (handles[0]) handles[0].style.left = "0%";
}

function applyBpmReset(panel: HTMLElement) {
  const inputs = getBpmInputs(panel);

  inputs.forEach((input) => {
    const label = input.closest(".fw-filter-mini-field")?.textContent ?? "";
    const nextValue = label.includes("High") ? "300" : "1";

    setNativeInputValue(input, nextValue);
  });

  window.requestAnimationFrame(() => {
    const nextInputs = getBpmInputs(panel);
    const lastInput = nextInputs[nextInputs.length - 1];

    if (lastInput) {
      lastInput.focus();
      lastInput.blur();
      lastInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    }

    syncBpmSliderVisuals(panel);

    window.requestAnimationFrame(() => {
      syncBpmSliderVisuals(panel);
    });
  });
}

function resetBpmInputs(panel: HTMLElement) {
  const segmentButtons = Array.from(
    panel.querySelectorAll<HTMLButtonElement>(".fw-filter-detail .fw-segment button"),
  );
  const rangeButton = segmentButtons.find(
    (button) => button.textContent?.trim().toLowerCase() === "range",
  );

  if (rangeButton && !rangeButton.classList.contains("is-active")) {
    rangeButton.click();

    window.requestAnimationFrame(() => {
      applyBpmReset(panel);
    });

    return;
  }

  applyBpmReset(panel);
}

function clickNextSelectedDetailControl(panel: HTMLElement, attempts = 0) {
  if (attempts > 20) return;

  const selectedOption = panel.querySelector<HTMLButtonElement>(
    ".fw-filter-detail .fw-filter-option.is-selected, .fw-filter-detail .fw-filter-chip.is-selected",
  );

  if (!selectedOption) return;

  selectedOption.click();

  window.requestAnimationFrame(() => {
    clickNextSelectedDetailControl(panel, attempts + 1);
  });
}

function clearOpenRailSection(panel: HTMLElement, sectionId: string) {
  if (sectionId === "duration" || sectionId === "region") {
    dispatchSideFilterSectionClear(sectionId);
    return;
  }

  if (sectionId === "bpm") {
    resetBpmInputs(panel);
  }

  clickNextSelectedDetailControl(panel);
}

function clearRailSection(panel: HTMLElement, railItem: Element, sectionId: string) {
  const railItemKey = getRailItemKey(railItem, panel);
  const isCurrentOpenSection =
    panel.classList.contains("has-selected-filter-section") &&
    panel.dataset.sideFilterActiveKey === railItemKey;

  if (isCurrentOpenSection) {
    clearOpenRailSection(panel, sectionId);
    return;
  }

  (railItem as HTMLElement).click();

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      clearOpenRailSection(panel, sectionId);
    });
  });
}

export default function SideFilterPanelBehavior() {
  useEffect(() => {
    let dotOnlySyncFrame = 0;
    const dotOnlyCheckStyle = ensureDotOnlyCheckStyle();

    function scheduleDotOnlyRailCountSync() {
      if (dotOnlySyncFrame) return;

      dotOnlySyncFrame = window.requestAnimationFrame(() => {
        dotOnlySyncFrame = 0;
        syncDotOnlyRailCounts();
      });
    }

    function handleFilterRailClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const railItem = target.closest(".fw-filter-rail-item");
      if (!railItem) return;

      const panel = railItem.closest(".fw-filter-panel-wrap");
      if (!(panel instanceof HTMLElement)) return;

      if (target.closest(".fw-filter-rail-count")) {
        const sectionId = getRailItemSectionId(railItem);

        if (!sectionId) return;

        event.preventDefault();
        event.stopPropagation();

        clearRailSection(panel, railItem, sectionId);
        window.requestAnimationFrame(() => syncFilterPanelColumnFadeStates(panel));
        scheduleDotOnlyRailCountSync();

        return;
      }

      const railItemKey = getRailItemKey(railItem, panel);
      const isSameOpenSection =
        panel.classList.contains("has-selected-filter-section") &&
        panel.dataset.sideFilterActiveKey === railItemKey;

      if (isSameOpenSection) {
        panel.classList.remove("has-selected-filter-section");
        delete panel.dataset.sideFilterActiveKey;
        window.requestAnimationFrame(() => syncFilterPanelColumnFadeStates(panel));
        scheduleDotOnlyRailCountSync();
        return;
      }

      panel.dataset.sideFilterActiveKey = railItemKey;
      panel.classList.add("has-selected-filter-section");
      window.requestAnimationFrame(() => syncFilterPanelColumnFadeStates(panel));
      scheduleDotOnlyRailCountSync();
    }

    function handleFilterColumnScroll(event: Event) {
      const target = event.target;

      if (target instanceof HTMLElement && target.matches(FILTER_COLUMN_SELECTOR)) {
        syncFilterColumnFadeState(target);
        return;
      }

      syncFilterPanelColumnFadeStates();
    }

    function handleViewportChange() {
      syncFilterPanelColumnFadeStates();
      scheduleDotOnlyRailCountSync();
    }

    const observer = new MutationObserver(scheduleDotOnlyRailCountSync);

    window.requestAnimationFrame(() => {
      syncFilterPanelColumnFadeStates();
      syncDotOnlyRailCounts();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", handleFilterRailClick, true);
    document.addEventListener("scroll", handleFilterColumnScroll, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, { passive: true });

    return () => {
      if (dotOnlySyncFrame) window.cancelAnimationFrame(dotOnlySyncFrame);
      dotOnlyCheckStyle?.remove();
      observer.disconnect();
      document.removeEventListener("click", handleFilterRailClick, true);
      document.removeEventListener("scroll", handleFilterColumnScroll, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  return null;
}
