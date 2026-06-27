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
    <>
      <style>{`
        .filmwave-discover-search-legacy-hidden {
          display: none !important;
        }

        .filmwave-discover-search-mount {
          position: relative;
          z-index: 1;
          display: block;
          height: var(--filmwave-header-height, 56px);
          margin: 24px -32px 2px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
        }

        .filmwave-discover-search-mount .filmwave-discover-search-form {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          padding: 0 24px 0 20px;
        }

        .filmwave-discover-search-mount .filmwave-search-pill {
          display: flex;
          width: 100%;
          height: 100%;
          min-width: 0;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          cursor: text;
        }

        .filmwave-discover-search-mount .filmwave-search-pill-icon-btn,
        .filmwave-discover-search-mount .filmwave-search-pill-icon-circle {
          display: inline-flex;
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: var(--text-primary);
          padding: 0;
        }

        .filmwave-discover-search-mount .filmwave-search-pill-icon-circle svg {
          width: 15px;
          height: 15px;
        }

        .filmwave-discover-search-mount .filmwave-search-pill-input {
          width: 100%;
          min-width: 0;
          height: 100%;
          border: 0;
          background: transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 15px;
          font-weight: 400;
          outline: none;
        }

        .filmwave-discover-search-mount .filmwave-search-pill-input::placeholder {
          color: color-mix(in srgb, var(--text-muted) 72%, transparent);
          font-size: 15px;
          font-weight: 400;
        }

        .filmwave-discover-search-clear {
          display: inline-flex;
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .filmwave-discover-search-clear:hover {
          background: var(--bg-hover-strong);
          color: var(--text-primary);
        }
      `}</style>

      <form className="filmwave-discover-search-form" onSubmit={submitSearch}>
        <label className="filmwave-search-pill" onClick={() => inputRef.current?.focus()}>
          <button
            type="submit"
            className="filmwave-search-pill-icon-btn"
            aria-label="Search music"
          >
            <span className="filmwave-search-pill-icon-circle" aria-hidden="true">
              <SearchIcon size={15} />
            </span>
          </button>

          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={DISCOVER_SEARCH_PLACEHOLDER}
            className="filmwave-search-pill-input"
          />

          {search.length > 0 && (
            <button
              type="button"
              className="filmwave-discover-search-clear"
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
    </>
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

      legacySection.classList.add("filmwave-discover-search-legacy-hidden");

      const previousSibling = legacySection.previousElementSibling;
      if (previousSibling instanceof HTMLElement && previousSibling.classList.contains("filmwave-discover-search-mount")) {
        setMountNode(previousSibling);
        return;
      }

      const mount = document.createElement("section");
      mount.className = "filmwave-discover-search-mount";
      legacySection.insertAdjacentElement("beforebegin", mount);
      setMountNode(mount);
    }

    syncDiscoverSearchbar();

    observer = new MutationObserver(syncDiscoverSearchbar);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      document
        .querySelectorAll(".filmwave-discover-search-legacy-hidden")
        .forEach((element) => element.classList.remove("filmwave-discover-search-legacy-hidden"));
      document
        .querySelectorAll(".filmwave-discover-search-mount")
        .forEach((element) => element.remove());
      setMountNode(null);
    };
  }, [pathname]);

  if (!mountNode) return null;

  return createPortal(<DiscoverMusicSearchbar />, mountNode);
}
