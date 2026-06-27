"use client";

import { useEffect } from "react";

const MUSIC_SEARCH_ROW_HIDDEN_CLASS = "is-music-search-row-hidden";
const MUSIC_SEARCH_ROW_SCROLL_THRESHOLD = 8;

export default function MusicFilterToolbarBehavior() {
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollTicking = false;

    function syncMusicSearchRowVisibility() {
      const searchRow = document.querySelector<HTMLElement>(
        "main > section:has(.fw-music-content-column .fw-filter-panel-wrap) .fw-music-content-column > .fw-toolbar-sticky",
      );

      if (!searchRow) return;

      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastScrollY;

      if (currentScrollY <= MUSIC_SEARCH_ROW_SCROLL_THRESHOLD) {
        searchRow.classList.remove(MUSIC_SEARCH_ROW_HIDDEN_CLASS);
        lastScrollY = currentScrollY;
        return;
      }

      if (Math.abs(scrollDelta) < MUSIC_SEARCH_ROW_SCROLL_THRESHOLD) return;

      if (scrollDelta > 0) {
        searchRow.classList.add(MUSIC_SEARCH_ROW_HIDDEN_CLASS);
      } else {
        searchRow.classList.remove(MUSIC_SEARCH_ROW_HIDDEN_CLASS);
      }

      lastScrollY = currentScrollY;
    }

    function handleMusicSearchRowScroll() {
      if (scrollTicking) return;
      scrollTicking = true;

      window.requestAnimationFrame(() => {
        syncMusicSearchRowVisibility();
        scrollTicking = false;
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
    syncMusicSearchRowVisibility();

    window.addEventListener("scroll", handleMusicSearchRowScroll, { passive: true });
    document.addEventListener("click", handleShuffleClick, true);

    const observer = new MutationObserver(syncAll);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "aria-pressed"],
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleMusicSearchRowScroll);
      document.removeEventListener("click", handleShuffleClick, true);
    };
  }, []);

  return null;
}
