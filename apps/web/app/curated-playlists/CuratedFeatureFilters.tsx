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

  const filterPills = CURATED_BROWSE_FILTERS.flatMap((filter) => {
    const taxonomyFilter = browseTaxonomy?.filters.find(
      (item) => item.value === filter.value,
    );

    return [
      {
        key: `parent-${filter.value}`,
        label: filter.label,
        filter: filter.value,
        subcategoryId: null,
      },
      ...(taxonomyFilter?.subcategories.map((subcategory) => ({
        key: `subcategory-${filter.value}-${subcategory.id}`,
        label: subcategory.label,
        filter: filter.value,
        subcategoryId: subcategory.id,
      })) ?? []),
    ];
  }).sort((a, b) => a.label.localeCompare(b.label));

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
        {filterPills.map((pill) => {
          const isParent = pill.subcategoryId === null;
          const isActive =
            activeFilter === pill.filter &&
            activeSubcategoryId === pill.subcategoryId;

          return (
            <button
              key={pill.key}
              type="button"
              className={`discover-category-filter-pill${isActive ? " is-active" : ""}`}
              aria-pressed={isActive}
              onClick={() => {
                if (isParent) {
                  onSubcategoryChange(null);
                  onFilterChange(isActive ? null : pill.filter);
                  return;
                }

                if (isActive) {
                  onSubcategoryChange(null);
                  return;
                }

                onFilterChange(pill.filter);
                onSubcategoryChange(pill.subcategoryId);
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
