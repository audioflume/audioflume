"use client";

import { useEffect } from "react";

const DISCOVER_SCROLLED_CLASS = "filmwave-discover-scrolled";
const DISCOVER_SCROLL_THRESHOLD = 18;
const HEADER_MENU_OPEN_SELECTOR = ".filmwave-header-nav-item-playlists.is-open";
const SEARCH_CLEAR_ICON = `
  <span class="fw-toolbar-search-static-clear-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.34 4.93 12 10.59l5.66-5.66a1 1 0 1 1 1.41 1.41L13.41 12l5.66 5.66a1 1 0 0 1-1.41 1.41L12 13.41l-5.66 5.66a1 1 0 0 1-1.41-1.41L10.59 12 4.93 6.34a1 1 0 0 1 1.41-1.41Z"
      />
    </svg>
  </span>
`;

export default function DiscoverHeaderScrollState() {
  useEffect(() => {
    let frame = 0;

    function syncHeaderState() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const headerMenuOpen = Boolean(
          document.querySelector(HEADER_MENU_OPEN_SELECTOR),
        );

        document.body.classList.toggle(
          DISCOVER_SCROLLED_CLASS,
          window.scrollY > DISCOVER_SCROLL_THRESHOLD || headerMenuOpen,
        );
      });
    }

    const header = document.querySelector(".filmwave-header");
    const headerObserver = new MutationObserver(syncHeaderState);

    if (header) {
      headerObserver.observe(header, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class"],
      });
    }

    syncHeaderState();
    window.addEventListener("scroll", syncHeaderState, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncHeaderState);
      headerObserver.disconnect();
      document.body.classList.remove(DISCOVER_SCROLLED_CLASS);
    };
  }, []);

  useEffect(() => {
    const searchForm = document.querySelector<HTMLFormElement>(
      ".discover-hero-search",
    );
    const searchIcon = searchForm?.querySelector<HTMLElement>(
      ".discover-hero-search-icon",
    );
    const searchInput = searchForm?.querySelector<HTMLInputElement>("input");

    if (!searchForm || !searchIcon || !searchInput) return;

    searchForm.classList.add("fw-toolbar-search-static");
    searchIcon.classList.add("fw-toolbar-search-static-icon");
    searchInput.classList.add("fw-toolbar-search-static-input");

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "fw-toolbar-search-static-clear";
    clearButton.setAttribute("aria-label", "Clear search");
    clearButton.innerHTML = SEARCH_CLEAR_ICON;
    clearButton.hidden = true;
    searchInput.before(clearButton);

    function syncSearchState() {
      const hasValue = searchInput.value.length > 0;
      searchForm.classList.toggle("has-value", hasValue);
      clearButton.hidden = !hasValue;
    }

    function clearSearch(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();

      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(searchInput, "");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.focus();
      syncSearchState();
    }

    searchInput.addEventListener("input", syncSearchState);
    clearButton.addEventListener("click", clearSearch);
    syncSearchState();

    return () => {
      searchInput.removeEventListener("input", syncSearchState);
      clearButton.removeEventListener("click", clearSearch);
      clearButton.remove();
      searchForm.classList.remove("fw-toolbar-search-static", "has-value");
      searchIcon.classList.remove("fw-toolbar-search-static-icon");
      searchInput.classList.remove("fw-toolbar-search-static-input");
    };
  }, []);

  return (
    <style>{`
      .discover-hero-content {
        transform: translateY(-10px);
      }

      .discover-hero-search {
        --text-primary: #111;
        --text-muted: rgba(17, 17, 17, 0.42);
        --bg-hover: rgba(17, 17, 17, 0.045);
        --fw-header-search-field-height: 58px;
        --fw-header-search-transform: none;
        --fw-header-search-content-transform: translateX(4px);
        border: 1px solid rgba(255, 255, 255, 0.7) !important;
        background: #fff !important;
        background-color: #fff !important;
        box-shadow: 0 16px 45px rgba(0, 0, 0, 0.18) !important;
        padding: 0 8px 0 18px !important;
      }

      .discover-hero-search > button[type="submit"] {
        margin-left: auto;
      }

      .discover-song-section > .mt-5 > a:not(:hover):not(:focus-visible) {
        background: color-mix(
          in srgb,
          var(--bg-primary) 96%,
          var(--text-primary) 4%
        );
      }

      body:has(.discover-page-root)
        .discover-curated-playlist-section
        .playlist-menu-btn-grid {
        opacity: 0 !important;
        transition:
          opacity 0.15s ease,
          color 0.15s ease !important;
      }

      body:has(.discover-page-root)
        .discover-curated-playlist-section
        .discover-playlist-card-shell:hover
        .playlist-menu-btn-grid,
      body:has(.discover-page-root)
        .discover-curated-playlist-section
        .discover-playlist-card-shell.is-menu-open
        .playlist-menu-btn-grid,
      body:has(.discover-page-root)
        .discover-curated-playlist-section
        .discover-playlist-card-shell:focus-within
        .playlist-menu-btn-grid {
        opacity: 1 !important;
      }

      body:has(
          .discover-curated-playlist-section
            .playlist-card-menu-wrap
            .is-dropdown-open
        )
        > .filmwave-dropdown-shell {
        translate: calc(-100% + 18px) 0 !important;
      }

      body:has(.discover-page-root)
        .filmwave-header
        .filmwave-header-actions
        .filmwave-header-nav
        .filmwave-header-nav-link:hover,
      body:has(.discover-page-root)
        .filmwave-header
        .filmwave-header-actions
        .filmwave-header-nav
        .filmwave-header-nav-link.is-active {
        background: transparent !important;
        background-color: transparent !important;
      }
    `}</style>
  );
}
