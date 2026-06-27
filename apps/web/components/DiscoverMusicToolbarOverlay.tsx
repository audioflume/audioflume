"use client";

import { MusicLibraryToolbar } from "@filmwave/shared";
import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      event.preventDefault();

      const cleanSearch = search.trim();
      router.push(cleanSearch ? `/music?search=${encodeURIComponent(cleanSearch)}` : "/music");
    }

    input.addEventListener("keydown", handleKeyDown);
    return () => input.removeEventListener("keydown", handleKeyDown);
  }, [router, search]);

  return (
    <MusicLibraryToolbar
      stickyTop={56}
      searchValue={search}
      searchPlaceholder={MUSIC_SEARCH_PLACEHOLDER}
      onSearchChange={setSearch}
      searchInputRef={inputRef}
      searchIcon={<SearchIcon />}
      filterCount={0}
      filtersOpen={false}
      onToggleFilters={() => {}}
      renderToolbarChrome={false}
    />
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
