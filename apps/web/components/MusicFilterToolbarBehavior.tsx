"use client";

import { useEffect } from "react";

type SearchRevealGeometry = {
  searchTop: number;
  searchLeft: number;
  searchWidth: number;
  actionsTop: number;
  actionsLeft: number;
  actionsWidth: number;
};

export default function MusicFilterToolbarBehavior() {
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let searchRevealThreshold = 0;
    let searchRevealFrame = 0;
    let searchMeasureFrame = 0;
    let searchToolbar: HTMLElement | null = null;
    let searchRevealGeometry: SearchRevealGeometry | null = null;
    let searchRevealBackdrop: HTMLDivElement | null = null;

    function getMusicSearchToolbar() {
      if (searchToolbar?.isConnected) return searchToolbar;

      searchToolbar = document.querySelector<HTMLElement>(
        ".fw-music-content-column > .fw-toolbar-sticky",
      );

      return searchToolbar;
    }

    function getSearchRow(toolbar: HTMLElement) {
      return toolbar.querySelector<HTMLElement>(
        ":scope > .fw-toolbar-header-search-row",
      );
    }

    function getHeaderActions(toolbar: HTMLElement) {
      return toolbar.querySelector<HTMLElement>(
        ":scope > .fw-toolbar-header-actions",
      );
    }

    function getSearchRevealBackdrop() {
      if (searchRevealBackdrop?.isConnected) return searchRevealBackdrop;

      searchRevealBackdrop = document.createElement("div");
      searchRevealBackdrop.className = "fw-music-scroll-reveal-backdrop";
      searchRevealBackdrop.setAttribute("aria-hidden", "true");
      document.body.appendChild(searchRevealBackdrop);

      return searchRevealBackdrop;
    }

    function hideSearchRevealBackdrop() {
      if (!searchRevealBackdrop) return;

      searchRevealBackdrop.classList.remove("is-visible");
      searchRevealBackdrop.style.removeProperty("top");
      searchRevealBackdrop.style.removeProperty("right");
      searchRevealBackdrop.style.removeProperty("left");
      searchRevealBackdrop.style.removeProperty("height");
    }

    function clearSearchRevealGeometryStyles(toolbar: HTMLElement) {
      const searchRow = getSearchRow(toolbar);
      const headerActions = getHeaderActions(toolbar);

      searchRow?.style.removeProperty("top");
      searchRow?.style.removeProperty("right");
      searchRow?.style.removeProperty("left");
      searchRow?.style.removeProperty("width");

      headerActions?.style.removeProperty("top");
      headerActions?.style.removeProperty("right");
      headerActions?.style.removeProperty("left");
      headerActions?.style.removeProperty("width");
      headerActions?.style.removeProperty("display");
      headerActions?.style.removeProperty("align-items");
      headerActions?.style.removeProperty("gap");

      hideSearchRevealBackdrop();
    }

    function applySearchRevealGeometry(toolbar: HTMLElement) {
      if (!searchRevealGeometry) return;

      const searchRow = getSearchRow(toolbar);
      const headerActions = getHeaderActions(toolbar);

      if (searchRow) {
        searchRow.style.setProperty(
          "top",
          `${searchRevealGeometry.searchTop}px`,
          "important",
        );
        searchRow.style.setProperty("right", "auto", "important");
        searchRow.style.setProperty(
          "left",
          `${searchRevealGeometry.searchLeft}px`,
          "important",
        );
        searchRow.style.setProperty(
          "width",
          `${searchRevealGeometry.searchWidth}px`,
          "important",
        );
      }

      if (headerActions) {
        headerActions.style.setProperty(
          "top",
          `${searchRevealGeometry.actionsTop}px`,
          "important",
        );
        headerActions.style.setProperty("right", "auto", "important");
        headerActions.style.setProperty(
          "left",
          `${searchRevealGeometry.actionsLeft}px`,
          "important",
        );
        headerActions.style.setProperty(
          "width",
          `${searchRevealGeometry.actionsWidth}px`,
          "important",
        );
        headerActions.style.setProperty("display", "flex", "important");
        headerActions.style.setProperty("align-items", "center", "important");
        headerActions.style.setProperty("gap", "8px", "important");
      }

      if (searchRow && headerActions) {
        const searchRect = searchRow.getBoundingClientRect();
        const actionsRect = headerActions.getBoundingClientRect();
        const headerBottom =
          document
            .querySelector<HTMLElement>(".filmwave-web-header")
            ?.getBoundingClientRect().bottom ??
          Math.max(0, Math.min(searchRect.top, actionsRect.top) - 18);
        const backdropBottom = Math.max(searchRect.bottom, actionsRect.bottom) + 8;
        const backdropLeft = Math.min(searchRect.left, actionsRect.left);
        const backdrop = getSearchRevealBackdrop();

        backdrop.style.setProperty(
          "top",
          `${Math.max(0, headerBottom)}px`,
          "important",
        );
        backdrop.style.setProperty("right", "0", "important");
        backdrop.style.setProperty(
          "left",
          `${Math.max(0, backdropLeft)}px`,
          "important",
        );
        backdrop.style.setProperty(
          "height",
          `${Math.max(0, backdropBottom - headerBottom)}px`,
          "important",
        );
        backdrop.classList.add("is-visible");
      }
    }

    function measureSearchRevealThreshold() {
      const toolbar = getMusicSearchToolbar();

      if (!toolbar) {
        searchRevealThreshold = 0;
        searchRevealGeometry = null;
        hideSearchRevealBackdrop();
        return;
      }

      const wasRevealed = toolbar.classList.contains("is-scroll-revealed");
      if (wasRevealed) {
        clearSearchRevealGeometryStyles(toolbar);
        toolbar.classList.remove("is-scroll-revealed");
      }

      const rect = toolbar.getBoundingClientRect();
      searchRevealThreshold = window.scrollY + rect.top + rect.height;

      const searchRow = getSearchRow(toolbar);
      const headerActions = getHeaderActions(toolbar);

      if (searchRow && headerActions) {
        const searchRect = searchRow.getBoundingClientRect();
        const actionsRect = headerActions.getBoundingClientRect();
        const actionsMarginLeft =
          Number.parseFloat(window.getComputedStyle(headerActions).marginLeft) || 0;

        searchRevealGeometry = {
          searchTop: window.scrollY + searchRect.top,
          searchLeft: searchRect.left,
          searchWidth: searchRect.width,
          actionsTop: window.scrollY + actionsRect.top,
          actionsLeft: actionsRect.left - actionsMarginLeft,
          actionsWidth: actionsRect.width,
        };
      } else {
        searchRevealGeometry = null;
      }

      if (wasRevealed) {
        toolbar.classList.add("is-scroll-revealed");
        applySearchRevealGeometry(toolbar);
      }
    }

    function syncSearchReveal() {
      searchRevealFrame = 0;

      const toolbar = getMusicSearchToolbar();
      const nextScrollY = window.scrollY;

      if (!toolbar) {
        hideSearchRevealBackdrop();
        lastScrollY = nextScrollY;
        return;
      }

      if (searchRevealThreshold <= 0 || !searchRevealGeometry) {
        measureSearchRevealThreshold();
      }

      const scrollDelta = nextScrollY - lastScrollY;
      const isPastSearchRow = nextScrollY > searchRevealThreshold + 12;

      if (!isPastSearchRow) {
        clearSearchRevealGeometryStyles(toolbar);
        toolbar.classList.remove("is-scroll-revealed");
      } else if (scrollDelta < -8) {
        toolbar.classList.add("is-scroll-revealed");
        applySearchRevealGeometry(toolbar);
      } else if (scrollDelta > 8) {
        clearSearchRevealGeometryStyles(toolbar);
        toolbar.classList.remove("is-scroll-revealed");
      }

      lastScrollY = nextScrollY;
    }

    function scheduleSearchRevealSync() {
      if (searchRevealFrame) return;
      searchRevealFrame = window.requestAnimationFrame(syncSearchReveal);
    }

    function scheduleSearchRevealMeasurement() {
      if (searchMeasureFrame) return;
      searchMeasureFrame = window.requestAnimationFrame(() => {
        searchMeasureFrame = 0;
        measureSearchRevealThreshold();
      });
    }

    function resetSearchRevealMeasurement() {
      if (searchRevealFrame) window.cancelAnimationFrame(searchRevealFrame);
      if (searchMeasureFrame) window.cancelAnimationFrame(searchMeasureFrame);

      const toolbar = getMusicSearchToolbar();
      if (toolbar) {
        clearSearchRevealGeometryStyles(toolbar);
        toolbar.classList.remove("is-scroll-revealed");
      } else {
        hideSearchRevealBackdrop();
      }

      searchRevealThreshold = 0;
      searchRevealGeometry = null;
      searchRevealFrame = 0;
      lastScrollY = window.scrollY;
      window.requestAnimationFrame(() => {
        measureSearchRevealThreshold();
        syncSearchReveal();
      });
    }

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

    function syncShuffleButtonLabel() {
      const shuffleButton = document.querySelector<HTMLButtonElement>(
        ".fw-quick-end .fw-quick-chip:first-child",
      );

      if (!shuffleButton) return;
      if (shuffleButton.textContent?.trim()) return;
      if (shuffleButton.querySelector(".fw-quick-shuffle-label")) return;

      const label = document.createElement("span");
      label.className = "fw-quick-shuffle-label";
      label.textContent = "Shuffle";
      shuffleButton.appendChild(label);
    }

    function resetActiveShuffle() {
      const sortButton = document.querySelector<HTMLButtonElement>(
        ".fw-quick-end .filmwave-music-sort-button",
      );

      if (!sortButton) return;
      sortButton.click();

      window.requestAnimationFrame(() => {
        const mostRecentButton = document.querySelector<HTMLButtonElement>(
          '.filmwave-music-sort-menu button[role="menuitemradio"], .filmwave-music-sort-menu button, .filmwave-music-sort-dropdown button[role="menuitem"], .filmwave-music-sort-dropdown button',
        );

        mostRecentButton?.click();
      });
    }

    function handleShuffleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const shuffleButton = target.closest<HTMLButtonElement>(
        ".fw-quick-end .fw-quick-chip:first-child",
      );

      if (!shuffleButton) return;
      if (shuffleButton.getAttribute("aria-pressed") !== "true") return;

      event.preventDefault();
      event.stopPropagation();
      resetActiveShuffle();
    }

    function syncAll() {
      syncFilterToolbar();
      syncShuffleButtonLabel();
    }

    syncAll();
    window.requestAnimationFrame(measureSearchRevealThreshold);

    const geometryResizeObserver = new ResizeObserver(() => {
      const toolbar = getMusicSearchToolbar();
      if (!toolbar || toolbar.classList.contains("is-scroll-revealed")) return;
      scheduleSearchRevealMeasurement();
    });
    const initialToolbar = getMusicSearchToolbar();
    const initialSearchRow = initialToolbar ? getSearchRow(initialToolbar) : null;
    const initialHeaderActions = initialToolbar ? getHeaderActions(initialToolbar) : null;
    if (initialSearchRow) geometryResizeObserver.observe(initialSearchRow);
    if (initialHeaderActions) geometryResizeObserver.observe(initialHeaderActions);

    document.addEventListener("click", handleShuffleClick, true);
    window.addEventListener("scroll", scheduleSearchRevealSync, { passive: true });
    window.addEventListener("resize", resetSearchRevealMeasurement);

    const observer = new MutationObserver((mutations) => {
      syncAll();

      const filterPanelGeometryChanged = mutations.some(
        (mutation) =>
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement &&
          mutation.target.classList.contains("fw-filter-panel-wrap"),
      );

      if (filterPanelGeometryChanged) scheduleSearchRevealMeasurement();
      if (!getMusicSearchToolbar()) hideSearchRevealBackdrop();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "aria-pressed"],
      childList: true,
      subtree: true,
    });

    return () => {
      const toolbar = getMusicSearchToolbar();
      if (toolbar) clearSearchRevealGeometryStyles(toolbar);
      searchRevealBackdrop?.remove();
      searchRevealBackdrop = null;
      geometryResizeObserver.disconnect();
      observer.disconnect();
      document.removeEventListener("click", handleShuffleClick, true);
      window.removeEventListener("scroll", scheduleSearchRevealSync);
      window.removeEventListener("resize", resetSearchRevealMeasurement);
      if (searchRevealFrame) window.cancelAnimationFrame(searchRevealFrame);
      if (searchMeasureFrame) window.cancelAnimationFrame(searchMeasureFrame);
    };
  }, []);

  return null;
}
