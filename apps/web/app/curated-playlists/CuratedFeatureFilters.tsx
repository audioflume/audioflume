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
        {CURATED_BROWSE_FILTERS.flatMap((filter) => {
          const taxonomyFilter = browseTaxonomy?.filters.find(
            (item) => item.value === filter.value,
          );
          const parentIsActive =
            activeFilter === filter.value && activeSubcategoryId === null;

          const parentPill = (
            <button
              key={`parent-${filter.value}`}
              type="button"
              className={`discover-category-filter-pill${parentIsActive ? " is-active" : ""}`}
              aria-pressed={parentIsActive}
              onClick={() => {
                onSubcategoryChange(null);
                onFilterChange(parentIsActive ? null : filter.value);
              }}
            >
              {filter.label}
            </button>
          );

          const subcategoryPills =
            taxonomyFilter?.subcategories.map((subcategory) => {
              const isActive =
                activeFilter === filter.value &&
                activeSubcategoryId === subcategory.id;

              return (
                <button
                  key={`subcategory-${filter.value}-${subcategory.id}`}
                  type="button"
                  className={`discover-category-filter-pill${isActive ? " is-active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => {
                    if (isActive) {
                      onSubcategoryChange(null);
                      return;
                    }

                    onFilterChange(filter.value);
                    onSubcategoryChange(subcategory.id);
                  }}
                >
                  {subcategory.label}
                </button>
              );
            }) ?? [];

          return [parentPill, ...subcategoryPills];
        })}
      </div>
    </div>
  );
}
