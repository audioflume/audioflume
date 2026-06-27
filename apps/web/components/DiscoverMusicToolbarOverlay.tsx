"use client";

import { CollapsibleSearchPill } from "@filmwave/shared";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import SearchIcon from "@/components/icons/SearchIcon";

const DISCOVER_LEGACY_SEARCH_PLACEHOLDER =
  "Search by scene, mood, artist, genre, instrument, or title...";
const MUSIC_SEARCH_PLACEHOLDER = "Search music library";

function DiscoverMusicSearchbar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanSearch = search.trim();
    router.push(cleanSearch ? `/music?search=${encodeURIComponent(cleanSearch)}` : "/music");
  }

  return (
    <div className="fw-toolbar-header-search-row">
      <form className="fw-toolbar-header-search-form" onSubmit={submitSearch}>
        <CollapsibleSearchPill
          searchIcon={<SearchIcon />}
          value={search}
          placeholder={MUSIC_SEARCH_PLACEHOLDER}
          inputRef={inputRef}
          onChange={setSearch}
        />
      </form>
    </div>
  );
}

export default function DiscoverMusicToolbarOverlay() {
  const pathname = usePathname();
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname !== "/discover") {
      setMountNode(null);
      return;
    }

    let observer: MutationObserver | null = null;

    function syncDiscoverSearchbar() {
      const legacyInput = document.querySelector<HTMLInputElement>(
        `input[placeholder="${DISCOVER_LEGACY_SEARCH_PLACEHOLDER}"]`,
      );
      const legacySection = legacyInput?.closest<HTMLElement>("section");
      const pageSection = legacySection?.closest("main")?.firstElementChild;

      if (!legacySection) return;
      if (!(pageSection instanceof HTMLElement)) return;
      if (legacySection.dataset.discoverSearchMount === "true") return;

      legacySection.hidden = true;
      legacySection.dataset.discoverLegacySearchHidden = "true";
      legacySection.classList.remove("mt-6");

      const existingMount = pageSection.querySelector<HTMLElement>(
        ':scope > [data-discover-search-mount="true"]',
      );

      if (existingMount) {
        setMountNode(existingMount);
        return;
      }

      const mount = document.createElement("section");
      mount.dataset.discoverSearchMount = "true";
      mount.className = "relative z-0 block w-full border-b border-[var(--border)] bg-[var(--bg-primary)]";
      pageSection.insertBefore(mount, pageSection.firstElementChild);
      setMountNode(mount);
    }

    syncDiscoverSearchbar();

    observer = new MutationObserver(syncDiscoverSearchbar);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      document
        .querySelectorAll<HTMLElement>('[data-discover-legacy-search-hidden="true"]')
        .forEach((legacySection) => {
          legacySection.hidden = false;
          legacySection.classList.add("mt-6");
          delete legacySection.dataset.discoverLegacySearchHidden;
        });
      document
        .querySelectorAll('[data-discover-search-mount="true"]')
        .forEach((element) => element.remove());
      setMountNode(null);
    };
  }, [pathname]);

  if (!mountNode) return null;

  return createPortal(<DiscoverMusicSearchbar />, mountNode);
}
