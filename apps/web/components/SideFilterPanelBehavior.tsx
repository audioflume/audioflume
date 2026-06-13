"use client";

import { useEffect } from "react";

export default function SideFilterPanelBehavior() {
  useEffect(() => {
    function handleFilterRailClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const railItem = target.closest(".fw-filter-rail-item");
      if (!railItem) return;

      const panel = railItem.closest(".fw-filter-panel-wrap");
      if (!panel) return;

      panel.classList.add("has-selected-filter-section");
    }

    document.addEventListener("click", handleFilterRailClick);

    return () => {
      document.removeEventListener("click", handleFilterRailClick);
    };
  }, []);

  return null;
}
