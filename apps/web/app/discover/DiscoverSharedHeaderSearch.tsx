"use client";

import { HeaderSearchBar } from "@filmwave/shared";
import { useRef, useState } from "react";
import SearchIcon from "@/components/icons/SearchIcon";

export default function DiscoverSharedHeaderSearch() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");

  return (
    <>
      <style>{`
        .discover-header-search-row {
          display: none !important;
        }

        .discover-shared-header-search {
          box-sizing: border-box !important;
          display: block !important;
          width: auto !important;
          margin-left: 0 !important;
          margin-bottom: 28px !important;
          padding: calc(var(--filmwave-header-height, 56px) + 22px) 32px 0 calc(var(--filmwave-page-sidebar-offset, var(--sidebar-width, 0px)) + 32px) !important;
          transition: padding-left 200ms ease !important;
        }

        .discover-shared-header-search-card {
          box-sizing: border-box !important;
          display: grid !important;
          width: 100% !important;
          gap: 18px !important;
          border: 1px solid var(--border) !important;
          background:
            radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--text-primary) 10%, transparent), transparent 30%),
            color-mix(in srgb, var(--bg-primary) 92%, var(--text-primary) 8%) !important;
          padding: 24px !important;
        }

        html.light .discover-shared-header-search-card,
        html[data-theme="light"] .discover-shared-header-search-card {
          background:
            radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--text-primary) 8%, transparent), transparent 30%),
            color-mix(in srgb, var(--bg-primary) 90%, var(--text-primary) 10%) !important;
        }

        .discover-shared-header-search-copy {
          display: grid !important;
          max-width: 760px !important;
          gap: 10px !important;
        }

        .discover-shared-header-search-eyebrow {
          color: var(--text-muted) !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          letter-spacing: 0.08em !important;
          line-height: 1 !important;
          text-transform: uppercase !important;
        }

        .discover-shared-header-search-title {
          margin: 0 !important;
          color: var(--text-primary) !important;
          font-family: var(--font-instrument-sans) !important;
          font-size: clamp(30px, 4vw, 52px) !important;
          font-weight: 300 !important;
          font-variation-settings: "wght" 300 !important;
          letter-spacing: -0.065em !important;
          line-height: 0.94 !important;
        }

        .discover-shared-header-search-detail {
          max-width: 620px !important;
          margin: 0 !important;
          color: var(--text-secondary) !important;
          font-size: 13px !important;
          font-weight: 300 !important;
          line-height: 1.55 !important;
        }

        .discover-shared-header-search .fw-toolbar-header-search-row {
          display: flex !important;
          width: 100% !important;
          height: 68px !important;
          align-items: center !important;
          border: 1px solid color-mix(in srgb, var(--border) 72%, var(--text-primary) 28%) !important;
          border-radius: 999px !important;
          background: var(--bg-primary) !important;
          background-color: var(--bg-primary) !important;
          box-shadow: 0 18px 52px rgba(0, 0, 0, 0.18) !important;
          padding: 0 18px !important;
          transition: border-color 140ms ease, box-shadow 140ms ease !important;
        }

        .discover-shared-header-search .fw-toolbar-header-search-row:hover,
        .discover-shared-header-search .fw-toolbar-header-search-row:focus-within {
          border-color: color-mix(in srgb, var(--border) 46%, var(--text-primary) 54%) !important;
          box-shadow: 0 22px 64px rgba(0, 0, 0, 0.24) !important;
        }

        .discover-shared-header-search .fw-toolbar-header-search-form {
          display: flex !important;
          width: 100% !important;
          height: 100% !important;
          align-items: center !important;
        }

        .discover-shared-header-search .fw-toolbar-search,
        .discover-shared-header-search .fw-toolbar-search-static {
          box-sizing: border-box !important;
          display: flex !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          align-items: center !important;
          gap: 14px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
          padding: 0 !important;
          transform: none !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static.has-value {
          gap: 11px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-icon {
          display: inline-flex !important;
          width: 42px !important;
          height: 42px !important;
          flex: 0 0 42px !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          background: color-mix(in srgb, var(--bg-primary) 82%, var(--text-primary) 18%) !important;
          color: var(--text-primary) !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-icon svg {
          display: block !important;
          width: 18px !important;
          height: 18px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-input {
          display: block !important;
          height: 44px !important;
          color: var(--text-primary) !important;
          font-family: inherit !important;
          font-size: 17px !important;
          font-style: normal !important;
          font-weight: 300 !important;
          line-height: 44px !important;
          padding: 0 !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-input::placeholder {
          color: var(--text-secondary) !important;
          font-size: 17px !important;
          font-style: normal !important;
          font-weight: 300 !important;
        }

        main > section {
          padding-top: 0 !important;
        }

        main > section > div[class*="px-8"] {
          padding-top: 0 !important;
        }

        main > section[class*="ml-[var(--sidebar-width)]"]
          > div[class*="px-8"]
          > section:first-child
          > div:first-child,
        main > section[class*="ml-[var(--sidebar-width)]"]
          > div[class*="px-8"]
          > section:first-child
          > section {
          display: none !important;
        }

        main > section[class*="ml-[var(--sidebar-width)]"]
          > div[class*="px-8"]
          > section:first-child
          > div[class*="mt-2"][class*="grid"] {
          margin-top: 0 !important;
        }
      `}</style>
      <div className="discover-shared-header-search">
        <div className="discover-shared-header-search-card">
          <div className="discover-shared-header-search-copy">
            <div className="discover-shared-header-search-eyebrow">
              Search the library
            </div>
            <h1 className="discover-shared-header-search-title">
              Find the sound your scene is asking for.
            </h1>
            <p className="discover-shared-header-search-detail">
              Search by mood, scene, genre, instrument, artist, or the feeling you want the cut to hold.
            </p>
          </div>

          <HeaderSearchBar
            searchValue={searchValue}
            searchPlaceholder="Search music library"
            onSearchChange={setSearchValue}
            searchInputRef={searchInputRef}
            searchIcon={<SearchIcon size={18} />}
          />
        </div>
      </div>
    </>
  );
}
