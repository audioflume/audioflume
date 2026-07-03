"use client";

import { useEffect } from "react";

export default function MusicFilterToolbarBehavior() {
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let searchRevealThreshold = 0;
    let searchRevealFrame = 0;
    let searchToolbar: HTMLElement | null = null;

    function getMusicSearchToolbar() {
      if (searchToolbar?.isConnected) return searchToolbar;

      searchToolbar = document.querySelector<HTMLElement>(
        ".fw-music-content-column > .fw-toolbar-sticky",
      );

      return searchToolbar;
    }

    function measureSearchRevealThreshold() {
      const toolbar = getMusicSearchToolbar();

      if (!toolbar) {
        searchRevealThreshold = 0;
        return;
      }

      const wasRevealed = toolbar.classList.contains("is-scroll-revealed");
      if (wasRevealed) toolbar.classList.remove("is-scroll-revealed");

      const rect = toolbar.getBoundingClientRect();
      searchRevealThreshold = window.scrollY + rect.top + rect.height;

      if (wasRevealed) toolbar.classList.add("is-scroll-revealed");
    }

    function syncSearchReveal() {
      searchRevealFrame = 0;

      const toolbar = getMusicSearchToolbar();
      const nextScrollY = window.scrollY;

      if (!toolbar) {
        lastScrollY = nextScrollY;
        return;
      }

      if (searchRevealThreshold <= 0) measureSearchRevealThreshold();

      const scrollDelta = nextScrollY - lastScrollY;
      const isPastSearchRow = nextScrollY > searchRevealThreshold + 12;

      if (!isPastSearchRow) {
        toolbar.classList.remove("is-scroll-revealed");
      } else if (scrollDelta < -8) {
        toolbar.classList.add("is-scroll-revealed");
      } else if (scrollDelta > 8) {
        toolbar.classList.remove("is-scroll-revealed");
      }

      lastScrollY = nextScrollY;
    }

    function scheduleSearchRevealSync() {
      if (searchRevealFrame) return;
      searchRevealFrame = window.requestAnimationFrame(syncSearchReveal);
    }

    function resetSearchRevealMeasurement() {
      getMusicSearchToolbar()?.classList.remove("is-scroll-revealed");
      searchRevealThreshold = 0;
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

    document.addEventListener("click", handleShuffleClick, true);
    window.addEventListener("scroll", scheduleSearchRevealSync, { passive: true });
    window.addEventListener("resize", resetSearchRevealMeasurement);

    const observer = new MutationObserver(syncAll);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "aria-pressed"],
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleShuffleClick, true);
      window.removeEventListener("scroll", scheduleSearchRevealSync);
      window.removeEventListener("resize", resetSearchRevealMeasurement);
      if (searchRevealFrame) window.cancelAnimationFrame(searchRevealFrame);
    };
  }, []);

  return null;
}
