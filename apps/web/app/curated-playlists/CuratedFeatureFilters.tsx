"use client";

import { useEffect, useRef, useState } from "react";

import XIcon from "@/components/icons/XIcon";

import {
  CURATED_BROWSE_FILTERS,
  type CuratedBrowseTag,
} from "@/lib/curatedPlaylists";
import type {
  CuratedBrowseSubcategoryRecord,
  CuratedBrowseTaxonomy,
} from "@/lib/curatedBrowseTaxonomy";

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
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
}: {
  activeFilter: CuratedBrowseTag | null;
  activeSubcategoryId: number | null;
  browseTaxonomy: CuratedBrowseTaxonomy | null;
  onFilterChange: (filter: CuratedBrowseTag | null) => void;
  onSubcategoryChange: (subcategoryId: number | null) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
}) {
  const appliedLinkedFilterRef = useRef(false);
  const [displayedSubcategories, setDisplayedSubcategories] = useState<
    CuratedBrowseSubcategoryRecord[]
  >([]);
  const [subfiltersOpen, setSubfiltersOpen] = useState(false);
  const subfilterCloseTimeoutRef = useRef<number | null>(null);

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

  const mainFilters = CURATED_BROWSE_FILTERS;

  const activeSubcategories =
    browseTaxonomy?.filters
      .find((filter) => filter.value === activeFilter)
      ?.subcategories.slice()
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [];

  useEffect(() => {
    if (subfilterCloseTimeoutRef.current !== null) {
      window.clearTimeout(subfilterCloseTimeoutRef.current);
      subfilterCloseTimeoutRef.current = null;
    }

    if (activeFilter && activeSubcategories.length > 0) {
      setDisplayedSubcategories(activeSubcategories);
      window.requestAnimationFrame(() => {
        setSubfiltersOpen(true);
      });
      return;
    }

    setSubfiltersOpen(false);
    subfilterCloseTimeoutRef.current = window.setTimeout(() => {
      setDisplayedSubcategories([]);
      subfilterCloseTimeoutRef.current = null;
    }, 220);

    return () => {
      if (subfilterCloseTimeoutRef.current !== null) {
        window.clearTimeout(subfilterCloseTimeoutRef.current);
        subfilterCloseTimeoutRef.current = null;
      }
    };
  }, [activeFilter, browseTaxonomy]);

  return (
    <div className="discover-mood-browser curated-page-pill-browser">
      <p className="discover-category-description">
        A highly curated collection of playlists built around moods, genres,
        scenes, and production styles.
      </p>

      <div
        className="discover-mood-pill-list"
        role="group"
        aria-label="Curated playlist filters"
      >
        <form
          className="curated-pill-search is-open"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (!searchValue.trim()) return;
            onSearchSubmit?.();
          }}
        >
          <span
            className="curated-pill-search-toggle is-active"
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20">
              <circle cx="8" cy="8" r="5.25" />
              <path d="m11.9 11.9 4.1 4.1" />
            </svg>
          </span>
          <div className="curated-pill-search-field-wrap">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search playlists"
              aria-label="Search curated playlists"
            />
            {searchValue && (
              <button
                type="button"
                className="curated-pill-search-clear"
                aria-label="Clear search"
                onClick={() => onSearchChange?.("")}
              >
                <XIcon size={12} />
              </button>
            )}
          </div>
        </form>

        </div>

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

      <div
        className={`curated-page-subfilter-reveal${
          subfiltersOpen ? " is-open" : ""
        }`}
      >
        <div className="curated-page-subfilter-reveal-inner">
          <div
            className="discover-mood-pill-list curated-page-subfilter-list"
            role="group"
            aria-label="Curated playlist subfilters"
          >
            {displayedSubcategories.map((subcategory) => {
              const isActive = activeSubcategoryId === subcategory.id;

              return (
                <button
                  key={subcategory.id}
                  type="button"
                  className={`discover-category-filter-pill curated-subfilter-pill${
                    isActive ? " is-active" : ""
                  }`}
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
        </div>
      </div>
    </div>
  );
}
