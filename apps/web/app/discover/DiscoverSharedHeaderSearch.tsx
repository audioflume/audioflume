"use client";

import { useEffect } from "react";

const DISCOVER_SCROLLED_CLASS = "filmwave-discover-scrolled";
const DISCOVER_SCROLL_THRESHOLD = 18;
const HEADER_MENU_OPEN_SELECTOR =
  ".filmwave-header-nav-item-playlists.is-open";

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

  return (
    <style>{`
      .discover-hero-content {
        transform: translateY(-10px);
      }

      .discover-hero-search {
        background: #fff !important;
        background-color: #fff !important;
      }

      .discover-hero-search-icon {
        display: inline-flex !important;
        width: 13px !important;
        height: 13px !important;
        align-self: center !important;
        align-items: center !important;
        justify-content: center !important;
        color: #777 !important;
        line-height: 0 !important;
        pointer-events: none !important;
      }

      .discover-hero-search-icon svg {
        display: block !important;
        width: 13px !important;
        height: 13px !important;
      }

      .discover-hero-search input {
        display: block !important;
        min-width: 0 !important;
        height: auto !important;
        align-self: center !important;
        border: 0 !important;
        background: transparent !important;
        color: #111 !important;
        font-family: inherit !important;
        font-size: 12px !important;
        font-style: italic !important;
        font-weight: 400 !important;
        line-height: 1.2 !important;
        outline: none !important;
        padding: 0 14px 0 0 !important;
        transform: none !important;
      }

      .discover-hero-search input::placeholder {
        color: #777 !important;
        font-size: 12px !important;
        font-style: italic !important;
        font-weight: 400 !important;
        line-height: 1.2 !important;
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
