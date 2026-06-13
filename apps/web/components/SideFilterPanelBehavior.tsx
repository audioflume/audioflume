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

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  );

  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.blur();
}

function resetBpmInputs(panel: HTMLElement) {
  const inputs = Array.from(
    panel.querySelectorAll<HTMLInputElement>(".fw-filter-detail .fw-filter-mini-field input"),
  );

  inputs.forEach((input) => {
    const label = input.closest(".fw-filter-mini-field")?.textContent ?? "";
    const nextValue = label.includes("High") ? "300" : "1";

    setNativeInputValue(input, nextValue);
  });
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

        return;
      }

      const railItemKey = getRailItemKey(railItem, panel);
      const isSameOpenSection =
        panel.classList.contains("has-selected-filter-section") &&
        panel.dataset.sideFilterActiveKey === railItemKey;

      if (isSameOpenSection) {
        panel.classList.remove("has-selected-filter-section");
        delete panel.dataset.sideFilterActiveKey;
        return;
      }

      panel.dataset.sideFilterActiveKey = railItemKey;
      panel.classList.add("has-selected-filter-section");
    }

    document.addEventListener("click", handleFilterRailClick, true);

    return () => {
      document.removeEventListener("click", handleFilterRailClick, true);
    };
  }, []);

  return null;
}
