"use client";

import { useEffect, useRef } from "react";

import CuratedBrowseFilters from "@/components/curated/CuratedBrowseFilters";
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

  const activeSubcategories =
    browseTaxonomy?.filters.find((filter) => filter.value === activeFilter)
      ?.subcategories ?? [];

  return (
    <div className="curated-page-filter-stack">
      <div className="curated-page-filter-row">
        <CuratedBrowseFilters
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          variant="curated-page"
        />
      </div>

      {activeFilter && activeSubcategories.length > 0 && (
        <nav
          className="curated-page-subcategory-row"
          aria-label="Filter by subcategory"
        >
          {activeSubcategories.map((subcategory) => {
            const isActive = activeSubcategoryId === subcategory.id;

            return (
              <button
                key={subcategory.id}
                type="button"
                className={`curated-page-subcategory-button${isActive ? " is-active" : ""}`}
                aria-pressed={isActive}
                onClick={() =>
                  onSubcategoryChange(isActive ? null : subcategory.id)
                }
              >
                {subcategory.label}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
