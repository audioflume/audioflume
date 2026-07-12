"use client";

import { HeaderSearchBar } from "@filmwave/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import SearchIcon from "@/components/icons/SearchIcon";

const DISCOVER_SCROLLED_CLASS = "filmwave-discover-scrolled";
const DISCOVER_SCROLL_THRESHOLD = 18;
const HEADER_MENU_OPEN_SELECTOR = ".filmwave-header-nav-item-playlists.is-open";

export default function DiscoverHeaderScrollState() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [searchMount, setSearchMount] = useState<HTMLFormElement | null>(null);

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
    const mount = document.querySelector<HTMLFormElement>(
      ".discover-hero-search",
    );
    if (!mount) return;

    mount.classList.add("has-shared-search");
    setSearchMount(mount);

    return () => {
      mount.classList.remove("has-shared-search");
      setSearchMount(null);
    };
  }, []);

  function submitSearch(value: string) {
    const cleanSearch = value.trim();
    router.push(
      cleanSearch
        ? `/music?search=${encodeURIComponent(cleanSearch)}`
        : "/music",
    );
  }

  return (
    <>
      <style>{`
        .discover-hero-content {
          transform: translateY(-10px);
        }

        .discover-hero-search {
          --text-primary: #111;
          --text-muted: rgba(17, 17, 17, 0.42);
          --border: rgba(17, 17, 17, 0.09);
          --fw-header-search-row-height: 58px;
          --fw-header-search-field-height: 58px;
          --fw-header-search-transform: none;
          border: 1px solid rgba(255, 255, 255, 0.7) !important;
          background: #fff !important;
          background-color: #fff !important;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.18) !important;
          padding: 0 !important;
        }

        .discover-hero-search:not(.has-shared-search)
          > .discover-hero-search-icon,
        .discover-hero-search:not(.has-shared-search) > input,
        .discover-hero-search:not(.has-shared-search) > button {
          visibility: hidden;
        }

        .discover-hero-search.has-shared-search {
          grid-template-columns: minmax(0, 1fr) !important;
        }

        .discover-hero-search.has-shared-search > .discover-hero-search-icon,
        .discover-hero-search.has-shared-search > input,
        .discover-hero-search.has-shared-search > button {
          display: none !important;
        }

        .discover-hero-search-shared {
          display: grid;
          width: 100%;
          height: 100%;
          grid-template-columns: minmax(0, 1fr) 120px;
          align-items: center;
        }

        .discover-hero-search-shared .fw-toolbar-header-search-row {
          min-width: 0;
          padding-left: 18px !important;
        }

        .discover-hero-search-submit {
          height: calc(100% - 16px);
          cursor: pointer;
          border: 0;
          background: #111;
          color: #fff;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          margin-right: 8px;
          padding: 0 20px;
          transition: opacity 150ms ease;
        }

        .discover-hero-search-submit:hover {
          opacity: 0.82;
        }

        @media (max-width: 720px) {
          .discover-hero-search-shared {
            grid-template-columns: minmax(0, 1fr) 92px;
          }
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

      {searchMount &&
        createPortal(
          <div className="discover-hero-search-shared">
            <HeaderSearchBar
              searchValue={searchValue}
              searchPlaceholder="Search music library"
              searchAriaLabel="Search music library"
              onSearchChange={setSearchValue}
              onSubmitSearch={submitSearch}
              searchIcon={<SearchIcon />}
              renderForm={false}
            />
            <button
              type="button"
              className="discover-hero-search-submit"
              onClick={() => submitSearch(searchValue)}
            >
              Search
            </button>
          </div>,
          searchMount,
        )}
    </>
  );
}
