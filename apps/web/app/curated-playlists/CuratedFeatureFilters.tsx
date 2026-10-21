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

  const mainFilters = [...CURATED_BROWSE_FILTERS].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  const activeSubcategories =
    browseTaxonomy?.filters
      .find((filter) => filter.value === activeFilter)
      ?.subcategories.slice()
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [];

  return (
    <div className="discover-mood-browser curated-page-pill-browser">
      <p className="discover-category-description">
        A highly curated collection of playlists built around moods, genres,
        scenes, and creative use cases.
      </p>

      <div
        className="discover-mood-pill-list"
        role="group"
        aria-label="Curated playlist filters"
      >
        {mainFilters.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              className={`curated-main-filter-pill${isActive ? " is-active" : ""}`}
              aria-pressed={isActive}
              onClick={() => {
                onSubcategoryChange(null);
                onFilterChange(isActive ? null : filter.value);
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {activeFilter && activeSubcategories.length > 0 && (
        <div
          className="discover-mood-pill-list curated-page-subfilter-list"
          role="group"
          aria-label="Curated playlist subfilters"
        >
          {activeSubcategories.map((subcategory) => {
            const isActive = activeSubcategoryId === subcategory.id;

            return (
              <button
                key={subcategory.id}
                type="button"
                className={`curated-subfilter-pill${isActive ? " is-active" : ""}`}
                aria-pressed={isActive}
                onClick={() =>
                  onSubcategoryChange(isActive ? null : subcategory.id)
                }
              >
                {subcategory.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
