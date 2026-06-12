"use client";

import { useEffect } from "react";

export default function MusicFilterToolbarBehavior() {
  useEffect(() => {
    function syncFilterToolbar() {
      const filterButton = document.querySelector<HTMLButtonElement>(".fw-toolbar-filters");
      if (!filterButton) return;

      const toolbar = filterButton.closest<HTMLElement>(".fw-toolbar");
      if (!toolbar) return;

      const shouldShowClearAll =
        filterButton.classList.contains("is-open") &&
        filterButton.classList.contains("is-active");

      let clearAllButton = toolbar.querySelector<HTMLButtonElement>(
        '.fw-toolbar-clear-all[data-toolbar-clear="true"]',
      );

      if (shouldShowClearAll) {
        if (!clearAllButton) {
          clearAllButton = document.createElement("button");
          clearAllButton.type = "button";
          clearAllButton.className = "fw-toolbar-clear-all";
          clearAllButton.dataset.toolbarClear = "true";
          clearAllButton.textContent = "Clear all";
          clearAllButton.setAttribute("aria-label", "Clear all filters");
          clearAllButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const countClear = filterButton.querySelector<HTMLElement>(
              ".fw-toolbar-filters-count.is-clearable",
            );

            countClear?.click();
          });
          toolbar.insertBefore(clearAllButton, filterButton);
        }
        return;
      }

      clearAllButton?.remove();
    }

    syncFilterToolbar();

    const observer = new MutationObserver(syncFilterToolbar);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
