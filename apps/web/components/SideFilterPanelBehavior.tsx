"use client";

import { useEffect } from "react";

const SECTION_ID_BY_LABEL: Record<string, string> = {
  Mood: "mood",
  Genre: "genre",
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

const FILTER_COLUMN_SELECTOR = ".fw-filter-rail, .fw-filter-detail";

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

function syncFilterColumnFadeState(column: HTMLElement) {
  column.classList.toggle("has-scroll-top", column.scrollTop > 1);
}

function syncFilterPanelColumnFadeStates(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(FILTER_COLUMN_SELECTOR).forEach(syncFilterColumnFadeState);
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
        return;
      }

      panel.dataset.sideFilterActiveKey = railItemKey;
      panel.classList.add("has-selected-filter-section");
      window.requestAnimationFrame(() => syncFilterPanelColumnFadeStates(panel));
    }

    function handleFilterColumnScroll(event: Event) {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;
      if (!target.matches(FILTER_COLUMN_SELECTOR)) return;

      syncFilterColumnFadeState(target);
    }

    window.requestAnimationFrame(() => syncFilterPanelColumnFadeStates());

    document.addEventListener("click", handleFilterRailClick, true);
    document.addEventListener("scroll", handleFilterColumnScroll, true);

    return () => {
      document.removeEventListener("click", handleFilterRailClick, true);
      document.removeEventListener("scroll", handleFilterColumnScroll, true);
    };
  }, []);

  return null;
}
