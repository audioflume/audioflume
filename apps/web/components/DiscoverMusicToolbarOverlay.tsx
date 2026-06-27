"use client";

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
    <form
      className="flex h-full w-full items-center px-6 pl-6"
      onSubmit={submitSearch}
    >
      <label
        className="flex h-full w-full min-w-0 cursor-text items-center gap-[9px] border-0 bg-transparent shadow-none"
        onClick={() => inputRef.current?.focus()}
      >
        <button
          type="submit"
          className="inline-flex h-5 w-5 flex-[0_0_20px] items-center justify-center border-0 bg-transparent p-0 text-[var(--text-primary)]"
          aria-label="Search music"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center text-[var(--text-primary)]" aria-hidden="true">
            <SearchIcon size={15} />
          </span>
        </button>

        <input
          ref={inputRef}
          data-discover-search-input="true"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={MUSIC_SEARCH_PLACEHOLDER}
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-normal text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />

        {search.length > 0 && (
          <button
            type="button"
            className="inline-flex h-[22px] w-[22px] flex-[0_0_22px] items-center justify-center rounded-full border-0 bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
            aria-label="Clear search"
            onClick={(event) => {
              event.preventDefault();
              setSearch("");
              inputRef.current?.focus();
            }}
          >
            <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
              <path
                fill="currentColor"
                d="M6.34 4.93 12 10.59l5.66-5.66a1 1 0 1 1 1.41 1.41L13.41 12l5.66 5.66a1 1 0 0 1-1.41 1.41L12 13.41l-5.66 5.66a1 1 0 0 1-1.41-1.41L10.59 12 4.93 6.34a1 1 0 0 1 1.41-1.41Z"
              />
            </svg>
          </button>
        )}
      </label>
    </form>
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
      mount.className =
        "relative z-0 block h-[var(--filmwave-header-height)] w-full border-b border-[var(--border)] bg-[var(--bg-primary)]";
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
