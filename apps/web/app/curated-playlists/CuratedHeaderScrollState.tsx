"use client";

import { useEffect } from "react";

const CURATED_SCROLLED_CLASS = "filmwave-curated-scrolled";
const CURATED_SCROLL_THRESHOLD = 18;
const HEADER_MENU_OPEN_SELECTOR = ".filmwave-header-nav-item-playlists.is-open";

export default function CuratedHeaderScrollState() {
  useEffect(() => {
    let frame = 0;

    function syncHeaderState() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const headerMenuOpen = Boolean(
          document.querySelector(HEADER_MENU_OPEN_SELECTOR),
        );

        document.body.classList.toggle(
          CURATED_SCROLLED_CLASS,
          window.scrollY > CURATED_SCROLL_THRESHOLD || headerMenuOpen,
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
      document.body.classList.remove(CURATED_SCROLLED_CLASS);
    };
  }, []);

  return null;
}
