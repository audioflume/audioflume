"use client";

import { useEffect } from "react";

const SIDE_FILTER_CLEAR_SECTION_EVENT = "filmwave-clear-filter-section";

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

        window.dispatchEvent(
          new CustomEvent(SIDE_FILTER_CLEAR_SECTION_EVENT, {
            detail: { sectionId },
          }),
        );

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

    document.addEventListener("click", handleFilterRailClick);

    return () => {
      document.removeEventListener("click", handleFilterRailClick);
    };
  }, []);

  return null;
}
