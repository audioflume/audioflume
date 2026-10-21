"use client";

import { useEffect, useRef } from "react";

import {
  CURATED_BROWSE_FILTERS,
  type CuratedBrowseTag,
} from "@/lib/curatedPlaylists";
import type { CuratedBrowseTaxonomy } from "@/lib/curatedBrowseTaxonomy";

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
  activeSubcategoryId,
  browseTaxonomy,
  onFilterChange,
  onSubcategoryChange,
}: {
  activeFilter: CuratedBrowseTag | null;
  activeSubcategoryId: number | null;
  browseTaxonomy: CuratedBrowseTaxonomy | null;
  onFilterChange: (filter: CuratedBrowseTag | null) => void;
  onSubcategoryChange: (subcategoryId: number | null) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  const appliedLinkedFilterRef = useRef(false);

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

  return (
    <div className="curated-page-pill-browser">
      <p className="curated-page-pill-description">
        A highly curated collection of playlists built around moods, genres,
        scenes, and creative use cases.
      </p>

      <div
        className="curated-page-pill-list"
        role="group"
        aria-label="Curated playlist filters"
      >
        {CURATED_BROWSE_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              className={`curated-page-filter-pill${isActive ? " is-active" : ""}`}
              aria-pressed={isActive}
              onClick={() =>
                onFilterChange(isActive ? null : filter.value)
              }
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
