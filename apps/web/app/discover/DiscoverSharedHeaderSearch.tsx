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
    <div className="discover-shared-header-search">
      <HeaderSearchBar
        searchValue={searchValue}
        searchPlaceholder="Search music library"
        onSearchChange={setSearchValue}
        searchInputRef={searchInputRef}
        searchIcon={<DiscoverSearchIcon />}
      />
    </div>
  );
}
