"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import SearchIcon from "@/components/icons/SearchIcon";

const DISCOVER_SEARCH_PLACEHOLDER =
  "Search by scene, mood, artist, genre, instrument, or title...";

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
      className="flex h-full w-full items-center px-6 pl-5"
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
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={DISCOVER_SEARCH_PLACEHOLDER}
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-normal text-[var(--text-primary)] outline-none placeholder:text-[color-mix(in_srgb,var(--text-muted)_72%,transparent)]"
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
        `input[placeholder="${DISCOVER_SEARCH_PLACEHOLDER}"]`,
      );
      const legacySection = legacyInput?.closest<HTMLElement>("section");

      if (!legacySection) return;

      legacySection.hidden = true;

      const previousSibling = legacySection.previousElementSibling;
      if (previousSibling instanceof HTMLElement && previousSibling.dataset.discoverSearchMount === "true") {
        setMountNode(previousSibling);
        return;
      }

      const mount = document.createElement("section");
      mount.dataset.discoverSearchMount = "true";
      mount.className =
        "relative z-0 block h-14 -mx-8 mt-6 mb-0 border-b border-[var(--border)] bg-[var(--bg-primary)]";
      legacySection.insertAdjacentElement("beforebegin", mount);
      setMountNode(mount);
    }

    syncDiscoverSearchbar();

    observer = new MutationObserver(syncDiscoverSearchbar);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      document
        .querySelectorAll<HTMLElement>('section[hidden] input[placeholder="Search by scene, mood, artist, genre, instrument, or title..."]')
        .forEach((input) => {
          const legacySection = input.closest<HTMLElement>("section");
          if (legacySection) legacySection.hidden = false;
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
