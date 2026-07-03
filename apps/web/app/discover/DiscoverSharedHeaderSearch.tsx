"use client";

import { HeaderSearchBar } from "@filmwave/shared";
import { useRef, useState } from "react";

function DiscoverSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8A7.5 7.5 0 0 1 10.5 18Zm0-2a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
        fill="currentColor"
      />
      <path
        d="m15.7 15.7 4.1 4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
          position: fixed !important;
          top: var(--filmwave-header-height, 56px) !important;
          right: 0 !important;
          left: 0 !important;
          z-index: var(--filmwave-z-search-filter, 60) !important;
          display: flex !important;
          height: 50px !important;
          align-items: center !important;
          border-bottom: 1px solid var(--border) !important;
          background: var(--bg-primary) !important;
          padding: 0 24px 0 32px !important;
        }

        .discover-shared-header-search .fw-toolbar-header-search-row {
          display: flex !important;
          width: 100% !important;
          height: 50px !important;
          align-items: center !important;
          padding: 0 !important;
        }

        .discover-shared-header-search .fw-toolbar-header-search-form {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static {
          height: 40px !important;
          min-height: 40px !important;
          gap: 12px !important;
          transform: translateY(4px) !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static.has-value {
          gap: 5px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-icon {
          width: 16px !important;
          height: 40px !important;
          flex: 0 0 16px !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          color: var(--text-muted) !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-icon svg {
          display: block !important;
          width: 16px !important;
          height: 16px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-clear {
          box-sizing: border-box !important;
          display: inline-flex !important;
          width: 14px !important;
          height: 40px !important;
          flex: 0 0 14px !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: var(--text-muted) !important;
          cursor: pointer !important;
          margin-left: 4px !important;
          margin-right: 1px !important;
          padding: 0 !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-clear:hover {
          color: var(--text-primary) !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-clear svg {
          display: block !important;
          width: 12px !important;
          height: 12px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-divider {
          display: inline-flex !important;
          width: 1px !important;
          height: 16px !important;
          flex: 0 0 1px !important;
          border-radius: 1px !important;
          background: var(--border) !important;
          margin-right: 5px !important;
          transform: translateX(1px) !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-input {
          font-size: 15px !important;
          font-weight: 300 !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-input::placeholder {
          color: var(--text-muted) !important;
          font-size: 15px !important;
          font-weight: 300 !important;
        }

        main > section {
          padding-top: calc(var(--filmwave-header-height, 56px) + 50px) !important;
        }
      `}</style>
      <div className="discover-shared-header-search">
        <HeaderSearchBar
          searchValue={searchValue}
          searchPlaceholder="Search music library"
          onSearchChange={setSearchValue}
          searchInputRef={searchInputRef}
          searchIcon={<DiscoverSearchIcon />}
        />
      </div>
    </>
  );
}
