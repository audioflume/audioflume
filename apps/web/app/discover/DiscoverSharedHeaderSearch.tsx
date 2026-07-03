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
          searchIcon={<SearchIcon size={16} />}
        />
      </div>
    </>
  );
}
