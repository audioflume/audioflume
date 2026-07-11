"use client";

import { useEffect } from "react";

const DISCOVER_SCROLLED_CLASS = "filmwave-discover-scrolled";
const DISCOVER_SCROLL_THRESHOLD = 18;
const HEADER_MENU_OPEN_SELECTOR =
  ".filmwave-header-nav-item-playlists.is-open, .filmwave-header-account-trigger.is-open";

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
