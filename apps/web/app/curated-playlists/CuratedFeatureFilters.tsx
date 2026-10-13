"use client";

import { useEffect, useRef } from "react";

import CuratedBrowseFilters from "@/components/curated/CuratedBrowseFilters";
import type { CuratedBrowseTaxonomy } from "@/lib/curatedBrowseTaxonomy";
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
  browseTaxonomy,
}: {
  activeFilter: CuratedBrowseTag | null;
  onFilterChange: (filter: CuratedBrowseTag | null) => void;
  browseTaxonomy: CuratedBrowseTaxonomy | null;
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

  const subcategoriesByFilter = Object.fromEntries(
    (browseTaxonomy?.filters ?? []).map((filter) => [
      filter.value,
      filter.subcategories.map((subcategory) => ({
        id: subcategory.id,
        label: subcategory.label,
      })),
    ]),
  );

  return (
    <div className="curated-page-filter-row">
      <CuratedBrowseFilters
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        onSubcategoryClick={(subcategory) => {
          document
            .getElementById(getCuratedGroupId(subcategory.label))
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        subcategoriesByFilter={subcategoriesByFilter}
        variant="pill"
      />
    </div>
  );
}
