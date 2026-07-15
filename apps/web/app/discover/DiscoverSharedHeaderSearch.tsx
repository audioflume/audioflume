"use client";

import { HeaderSearchBar } from "@filmwave/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import SearchIcon from "@/components/icons/SearchIcon";

const DISCOVER_SCROLLED_CLASS = "filmwave-discover-scrolled";
const DISCOVER_SCROLL_THRESHOLD = 18;
const HEADER_MENU_OPEN_SELECTOR = ".filmwave-header-nav-item-playlists.is-open";
const CURATED_HEADING_LINK_SELECTOR =
  ".discover-curated-playlist-section .discover-section-heading > a";
const CURATED_PLAYLIST_GRID_SELECTOR =
  ".discover-curated-playlist-section .discover-playlist-grid";

export default function DiscoverHeaderScrollState() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [searchMount, setSearchMount] = useState<HTMLFormElement | null>(null);
  const [curatedCtaMount, setCuratedCtaMount] =
    useState<HTMLDivElement | null>(null);

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

  useLayoutEffect(() => {
    let headingLink: HTMLAnchorElement | null = null;
    let originalHeadingText = "";
    let ctaMount: HTMLDivElement | null = null;

    function syncCuratedCallsToAction() {
      const nextHeadingLink = document.querySelector<HTMLAnchorElement>(
        CURATED_HEADING_LINK_SELECTOR,
      );

      if (nextHeadingLink && nextHeadingLink !== headingLink) {
        if (headingLink?.isConnected) {
          headingLink.textContent = originalHeadingText;
        }

        headingLink = nextHeadingLink;
        originalHeadingText = nextHeadingLink.textContent ?? "";
        nextHeadingLink.textContent = "Explore curated music";
      }

      if (!ctaMount) {
        const playlistGrid = document.querySelector<HTMLElement>(
          CURATED_PLAYLIST_GRID_SELECTOR,
        );

        if (playlistGrid) {
          ctaMount = document.createElement("div");
          ctaMount.className =
            "discover-curated-playlist-cta-mount mt-8 flex justify-center";
          playlistGrid.insertAdjacentElement("afterend", ctaMount);
          setCuratedCtaMount(ctaMount);
        }
      }
    }

    syncCuratedCallsToAction();

    const observer = new MutationObserver(syncCuratedCallsToAction);

    if (!headingLink || !ctaMount) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();

      if (headingLink?.isConnected) {
        headingLink.textContent = originalHeadingText;
      }

      ctaMount?.remove();
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
          box-sizing: border-box !important;
          width: min(780px, 100%) !important;
          height: 58px !important;
          min-height: 58px !important;
          max-height: 58px !important;
          grid-template-columns: minmax(0, 1fr) !important;
          border: 1px solid rgba(255, 255, 255, 0.7) !important;
          background: #fff !important;
          background-color: #fff !important;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.18) !important;
          padding: 0 !important;
        }

        .discover-hero-search > .discover-hero-search-icon,
        .discover-hero-search > input,
        .discover-hero-search > button {
          display: none !important;
        }

        .discover-hero-search-shared {
          display: grid;
          width: 100%;
          min-width: 0;
          height: 100%;
          grid-template-columns: minmax(0, 1fr) 132px;
          align-items: center;
        }

        .discover-hero-search-shared .fw-toolbar-header-search-row {
          min-width: 0;
          padding-left: 22px !important;
        }

        .discover-hero-search .discover-hero-search-submit {
          box-sizing: border-box !important;
          height: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          align-self: center !important;
          cursor: pointer;
          border: 0;
          background: #111;
          color: #fff;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          margin: 0 10px !important;
          padding: 0 20px;
          transition: opacity 150ms ease;
        }

        .discover-hero-search .discover-hero-search-submit:hover {
          opacity: 0.82;
        }

        body:has(.discover-page-root)
          .discover-mood-section
          .curated-playlist-shelf-viewport {
          margin-right: calc(var(--discover-page-gutter) * -1) !important;
          margin-left: calc(var(--discover-page-gutter) * -1) !important;
          overflow: hidden !important;
        }

        body:has(.discover-page-root)
          .discover-mood-section
          .curated-playlist-shelf-scroller {
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: flex-start !important;
          gap: 12px !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding-right: 5rem !important;
          padding-left: var(--discover-page-gutter) !important;
          overscroll-behavior-x: contain !important;
          scroll-snap-type: x proximity !important;
        }

        @media (max-width: 720px) {
          .discover-hero-search-shared {
            grid-template-columns: minmax(0, 1fr) 104px;
          }
        }

        .discover-song-section > .mt-5 > a:not(:hover):not(:focus-visible),
        .discover-curated-playlist-cta-mount
          > a:not(:hover):not(:focus-visible) {
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

      {curatedCtaMount &&
        createPortal(
          <Link
            href="/curated-playlists"
            className="inline-flex h-11 min-w-[280px] items-center justify-center rounded-none bg-[var(--bg-elevated)] px-10 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] focus-visible:bg-[var(--text-primary)] focus-visible:text-[var(--bg-primary)] focus-visible:outline-none"
          >
            Explore curated music
          </Link>,
          curatedCtaMount,
        )}
    </>
  );
}
