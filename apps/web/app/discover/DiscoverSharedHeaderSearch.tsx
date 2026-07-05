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
          margin-bottom: 14px !important;
          padding: calc(var(--filmwave-header-height, 56px) + 22px) 32px 0 32px !important;
          transition: margin-left 200ms ease !important;
        }

        .discover-shared-header-search .fw-toolbar-header-search-row {
          display: flex !important;
          width: 100% !important;
          height: 42px !important;
          align-items: center !important;
          border: 1px solid color-mix(in srgb, var(--filmwave-header-border-color) 50%, transparent) !important;
          border-radius: 0 !important;
          background: var(--bg-primary) !important;
          background-color: var(--bg-primary) !important;
          box-shadow: none !important;
          padding: 0 14px !important;
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
          gap: 12px !important;
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
          gap: 9px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-icon {
          display: inline-flex !important;
          width: 13px !important;
          height: 42px !important;
          flex: 0 0 13px !important;
          align-items: center !important;
          justify-content: center !important;
          color: var(--text-muted) !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-icon svg {
          display: block !important;
          width: 13px !important;
          height: 13px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-input {
          display: block !important;
          height: 42px !important;
          color: var(--text-primary) !important;
          font-family: inherit !important;
          font-size: 12px !important;
          font-style: italic !important;
          font-weight: 400 !important;
          line-height: 42px !important;
          padding: 0 !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-input::placeholder {
          color: var(--text-muted) !important;
          font-size: 12px !important;
          font-style: italic !important;
          font-weight: 400 !important;
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
        <HeaderSearchBar
          searchValue={searchValue}
          searchPlaceholder="Search music library"
          onSearchChange={setSearchValue}
          searchInputRef={searchInputRef}
          searchIcon={<SearchIcon size={13} />}
        />
      </div>
    </>
  );
}
