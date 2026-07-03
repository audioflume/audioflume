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
          position: fixed !important;
          top: var(--filmwave-header-height, 56px) !important;
          right: var(--fw-music-content-inset-right, 20px) !important;
          left: calc(var(--sidebar-width, 0px) + var(--fw-music-content-inset-right, 20px)) !important;
          z-index: var(--filmwave-z-search-filter, 60) !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          height: 50px !important;
          align-items: stretch !important;
          border-bottom: 0 !important;
          background: transparent !important;
          padding: 0 !important;
        }

        .discover-shared-header-search .fw-toolbar-header-search-row {
          display: flex !important;
          width: 100% !important;
          height: 50px !important;
          align-items: center !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: var(--filmwave-chrome-surface) !important;
          background-color: var(--filmwave-chrome-surface) !important;
          padding: 0 24px !important;
        }

        .discover-shared-header-search .fw-toolbar-header-search-form {
          width: 100% !important;
          height: 100% !important;
        }

        .discover-shared-header-search .fw-toolbar-search,
        .discover-shared-header-search .fw-toolbar-search-static {
          box-sizing: border-box !important;
          display: flex !important;
          width: 100% !important;
          height: 40px !important;
          min-height: 40px !important;
          align-items: center !important;
          gap: 8px !important;
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
          gap: 5px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-icon {
          width: 16px !important;
          height: 40px !important;
          flex: 0 0 16px !important;
          color: var(--text-muted) !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-icon svg {
          width: 16px !important;
          height: 16px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-input {
          height: 40px !important;
          font-size: 15px !important;
          font-weight: 300 !important;
          line-height: 40px !important;
        }

        .discover-shared-header-search .fw-toolbar-search-static-input::placeholder {
          color: var(--text-muted) !important;
          font-size: 15px !important;
          font-weight: 300 !important;
        }

        main > section {
          padding-top: calc(var(--filmwave-header-height, 56px) + 70px) !important;
        }
      `}</style>
      <div className="discover-shared-header-search">
        <HeaderSearchBar
          searchValue={searchValue}
          searchPlaceholder="Search music library"
          onSearchChange={setSearchValue}
          searchInputRef={searchInputRef}
          searchIcon={<SearchIcon size={16} />}
        />
      </div>
    </>
  );
}
