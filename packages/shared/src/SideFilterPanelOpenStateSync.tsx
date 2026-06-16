"use client";

import { useLayoutEffect } from "react";

function getRailItemKey(railItem: Element, panel: Element) {
  const railItems = Array.from(panel.querySelectorAll(".fw-filter-rail-item"));
  const index = railItems.indexOf(railItem);

  if (index >= 0) return String(index);

  return railItem.textContent?.trim() ?? "";
}

function persistPanelOpenState(panel: HTMLElement, railItemKey: string | null) {
  window.requestAnimationFrame(() => {
    if (!railItemKey) {
      panel.classList.remove("has-selected-filter-section");
      delete panel.dataset.sideFilterActiveKey;
      return;
    }

    panel.dataset.sideFilterActiveKey = railItemKey;
    panel.classList.add("has-selected-filter-section");
  });
}

export default function SideFilterPanelOpenStateSync() {
  useLayoutEffect(() => {
    function handleRailClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".fw-filter-rail-count")) return;

      const railItem = target.closest(".fw-filter-rail-item");
      if (!railItem) return;

      const panel = railItem.closest(".fw-filter-panel-wrap");
      if (!(panel instanceof HTMLElement)) return;

      const railItemKey = getRailItemKey(railItem, panel);
      const isSameOpenSection =
        panel.classList.contains("has-selected-filter-section") &&
        panel.dataset.sideFilterActiveKey === railItemKey;

      persistPanelOpenState(panel, isSameOpenSection ? null : railItemKey);
    }

    document.addEventListener("click", handleRailClick, true);

    return () => {
      document.removeEventListener("click", handleRailClick, true);
    };
  }, []);

  return null;
}
