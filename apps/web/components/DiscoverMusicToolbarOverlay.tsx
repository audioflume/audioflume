"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DISCOVER_LEGACY_SEARCH_PLACEHOLDER =
  "Search by scene, mood, artist, genre, instrument, or title...";

export default function DiscoverMusicToolbarOverlay() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/discover") return;

    function hideDiscoverSearchbar() {
      const legacyInput = document.querySelector<HTMLInputElement>(
        `input[placeholder="${DISCOVER_LEGACY_SEARCH_PLACEHOLDER}"]`,
      );
      const legacySection = legacyInput?.closest<HTMLElement>("section");

      if (!legacySection) return;

      legacySection.dataset.discoverLegacySearchHidden = "true";
      legacySection.classList.remove("mt-6");
      legacySection.style.setProperty("display", "none", "important");
    }

    hideDiscoverSearchbar();

    const observer = new MutationObserver(hideDiscoverSearchbar);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document
        .querySelectorAll<HTMLElement>('[data-discover-legacy-search-hidden="true"]')
        .forEach((legacySection) => {
          legacySection.style.removeProperty("display");
          legacySection.classList.add("mt-6");
          delete legacySection.dataset.discoverLegacySearchHidden;
        });
    };
  }, [pathname]);

  return null;
}
