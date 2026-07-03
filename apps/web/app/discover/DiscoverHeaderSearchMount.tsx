"use client";

import { HeaderSearchBar } from "@filmwave/shared";
import { useRef, useState } from "react";

function DiscoverSearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 38.31 38.31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M38.31,35.48l-11.75-11.74c1.89-2.49,3.03-5.58,3.03-8.94C29.6,6.64,22.96,0,14.8,0S0,6.64,0,14.8s6.64,14.8,14.8,14.8c3.36,0,6.45-1.14,8.94-3.03l11.75,11.74,2.83-2.83ZM14.8,25.6c-5.96,0-10.8-4.84-10.8-10.8S8.84,4,14.8,4s10.8,4.85,10.8,10.8-4.84,10.8-10.8,10.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function DiscoverHeaderSearchMount() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");

  return (
    <>
      <style>{`
        .discover-header-search-row {
          display: none !important;
        }

        main > section {
          padding-top: calc(var(--filmwave-header-height, 56px) + var(--fw-header-search-shell-height, 50px)) !important;
        }
      `}</style>
      <div className="fw-header-search-shell">
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
