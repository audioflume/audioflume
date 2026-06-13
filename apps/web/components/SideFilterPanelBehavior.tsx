"use client";

import { useEffect } from "react";

function getRailItemKey(railItem: Element, panel: Element) {
  const railItems = Array.from(panel.querySelectorAll(".fw-filter-rail-item"));
  const index = railItems.indexOf(railItem);

  if (index >= 0) return String(index);

  return railItem.textContent?.trim() ?? "";
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
