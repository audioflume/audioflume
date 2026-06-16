import { useLayoutEffect } from "react";

function getRailItemKey(railItem: Element, panel: Element) {
  const railItems = Array.from(panel.querySelectorAll(".fw-filter-rail-item"));
  const index = railItems.indexOf(railItem);

  if (index >= 0) return String(index);

  return railItem.textContent?.trim() ?? "";
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

function syncPanelFadeStates(panel: HTMLElement) {
  panel.querySelectorAll<HTMLElement>(".fw-filter-rail, .fw-filter-detail").forEach(syncFilterColumnFadeState);
}

export default function DesktopSideFilterBehavior() {
  useLayoutEffect(() => {
    function handleRailClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const railItem = target.closest(".desktop-music-page .fw-filter-rail-item");
      if (!railItem) return;

      if (target.closest(".fw-filter-rail-count")) return;

      const panel = railItem.closest(".fw-filter-panel-wrap");
      if (!(panel instanceof HTMLElement)) return;

      const railItemKey = getRailItemKey(railItem, panel);
      const wasSameOpenSection =
        panel.classList.contains("has-selected-filter-section") &&
        panel.dataset.sideFilterActiveKey === railItemKey;

      if (wasSameOpenSection) {
        panel.classList.remove("has-selected-filter-section");
        delete panel.dataset.sideFilterActiveKey;
        syncPanelFadeStates(panel);
        return;
      }

      panel.dataset.sideFilterActiveKey = railItemKey;
      panel.classList.add("has-selected-filter-section");
      syncPanelFadeStates(panel);
    }

    document.addEventListener("click", handleRailClick);

    return () => {
      document.removeEventListener("click", handleRailClick);
    };
  }, []);

  return null;
}
