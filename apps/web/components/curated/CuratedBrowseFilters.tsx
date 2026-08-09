"use client";

import Link from "next/link";

import {
  CURATED_BROWSE_FILTERS,
  type CuratedBrowseTag,
} from "@/lib/curatedPlaylists";

import "./curated-browse-filters.css";

type FilterIconName =
  | "scissors"
  | "waveform"
  | "grid"
  | "tag"
  | "globe"
  | "camera"
  | "clapper"
  | "moon";

const FILTER_ICONS: Record<CuratedBrowseTag, FilterIconName> = {
  editors: "scissors",
  mood: "waveform",
  genre: "grid",
  brands: "tag",
  travel: "globe",
  documentary: "camera",
  cinematic: "clapper",
  "dark-moody": "moon",
};

function FilterIcon({
  icon,
  active = false,
}: {
  icon: FilterIconName;
  active?: boolean;
}) {
  const commonProps = {
    width: 13,
    height: 13,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.45,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: active ? { color: "inherit" } : undefined,
    "aria-hidden": true,
  };

  if (icon === "scissors") {
    return (
      <svg {...commonProps}>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <path d="M8.2 7.2 19 17.5M8.2 16.8 19 6.5M14.5 12l4.5 5.5" />
      </svg>
    );
  }

  if (icon === "waveform") {
    return (
      <svg {...commonProps}>
        <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
      </svg>
    );
  }

  if (icon === "grid") {
    return (
      <svg {...commonProps}>
        <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" />
      </svg>
    );
  }

  if (icon === "tag") {
    return (
      <svg {...commonProps}>
        <path d="M4 5.5V11l8.5 8.5L20 12l-8.5-8.5H6z" />
        <circle cx="8" cy="7.5" r="1" />
      </svg>
    );
  }

  if (icon === "globe") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.1 12 20.5M12 3.5C9.8 5.9 8.7 8.7 8.7 12s1.1 6.1 3.3 8.5" />
      </svg>
    );
  }

  if (icon === "camera") {
    return (
      <svg {...commonProps}>
        <path d="M4 7.5h4l1.4-2h5.2l1.4 2h4v11H4z" />
        <circle cx="12" cy="13" r="3.2" />
      </svg>
    );
  }

  if (icon === "clapper") {
    return (
      <svg {...commonProps}>
        <path d="M4 9h16v10H4zM4 9l2-4h16l-2 4M8 5 6 9M13 5l-2 4M18 5l-2 4" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M18.5 15.5A8 8 0 0 1 8.5 5.5 8 8 0 1 0 18.5 15.5Z" />
    </svg>
  );
}

type CuratedBrowseFiltersProps = {
  activeFilter?: CuratedBrowseTag | null;
  onFilterChange?: (filter: CuratedBrowseTag | null) => void;
  hrefForFilter?: (filter: CuratedBrowseTag) => string;
  ariaLabel?: string;
  className?: string;
};

export default function CuratedBrowseFilters({
  activeFilter = null,
  onFilterChange,
  hrefForFilter,
  ariaLabel = "Filter curated playlists",
  className = "",
}: CuratedBrowseFiltersProps) {
  return (
    <nav
      className={`curated-feature-filters${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      {CURATED_BROWSE_FILTERS.map((filter) => {
        const isActive = activeFilter === filter.value;
        const content = (
          <>
            <FilterIcon icon={FILTER_ICONS[filter.value]} active={isActive} />
            <span>{filter.label}</span>
          </>
        );
        const sharedProps = {
          className: `curated-feature-filter-pill${isActive ? " is-active" : ""}`,
          style: isActive
            ? {
                borderColor: "var(--text-primary)",
                background: "var(--text-primary)",
                color: "var(--bg-primary)",
              }
            : undefined,
        };

        if (hrefForFilter) {
          return (
            <Link
              key={filter.value}
              href={hrefForFilter(filter.value)}
              {...sharedProps}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={isActive}
            {...sharedProps}
            onClick={() => onFilterChange?.(isActive ? null : filter.value)}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
