"use client";

import { useEffect, useRef, useState } from "react";

import CuratedBrowseFilters from "@/components/curated/CuratedBrowseFilters";
import SearchIcon from "@/components/icons/SearchIcon";
import {
  CURATED_BROWSE_FILTERS,
  type CuratedBrowseTag,
} from "@/lib/curatedPlaylists";

import "@/components/curated/curated-browse-filters.css";

export function getCuratedGroupId(name: string) {
  return `curated-group-${
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "playlists"
  }`;
}

export default function CuratedFeatureFilters({
  activeFilter,
  onFilterChange,
  searchValue,
  onSearchChange,
}: {
  activeFilter: CuratedBrowseTag | null;
  onFilterChange: (filter: CuratedBrowseTag | null) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}) {
  const appliedLinkedFilterRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchExpanded = searchOpen || searchValue.length > 0;

  useEffect(() => {
    if (appliedLinkedFilterRef.current) return;
    appliedLinkedFilterRef.current = true;

    const requestedFilter = new URLSearchParams(window.location.search).get(
      "filter",
    );
    const isValidFilter = CURATED_BROWSE_FILTERS.some(
      (filter) => filter.value === requestedFilter,
    );

    if (isValidFilter && requestedFilter !== activeFilter) {
      onFilterChange(requestedFilter as CuratedBrowseTag);
    }
  }, [activeFilter, onFilterChange]);

  function openSearch() {
    setSearchOpen(true);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  return (
    <div className="curated-page-filter-row">
      <div
        className={`curated-page-search${searchExpanded ? " is-open" : ""}`}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(nextTarget) && !searchValue.trim()) {
            setSearchOpen(false);
          }
        }}
      >
        <button
          type="button"
          className="curated-page-search-button"
          aria-label={searchExpanded ? "Focus curated playlist search" : "Search curated playlists"}
          aria-expanded={searchExpanded}
          onClick={openSearch}
        >
          <SearchIcon size={13} />
        </button>
        <input
          ref={searchInputRef}
          type="search"
          className="curated-page-search-input"
          value={searchValue}
          placeholder="Search playlists"
          aria-label="Search curated playlists"
          tabIndex={searchExpanded ? 0 : -1}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            onSearchChange("");
            setSearchOpen(false);
            event.currentTarget.blur();
          }}
        />
      </div>

      <CuratedBrowseFilters
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        className="curated-page-browse-filters"
      />
    </div>
  );
}
