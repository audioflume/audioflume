"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const PLAYLIST_TABS = [
  { label: "My Playlists", value: "my-playlists", href: "/playlists" },
  {
    label: "Curated Collections",
    value: "curated-collections",
    href: "/curated-playlists",
  },
  {
    label: "Community Playlists",
    value: "community-playlists",
    href: "/playlists?tab=community-playlists",
  },
] as const;

function PlaylistTabChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.6 5.3a1.3 1.3 0 0 1 1.84.04l5.5 5.76a1.3 1.3 0 0 1 0 1.8l-5.5 5.76a1.3 1.3 0 0 1-1.88-1.8L13.2 12 8.56 7.14a1.3 1.3 0 0 1 .04-1.84Z"
      />
    </svg>
  );
}

export default function PlaylistTabsRail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = pathname?.startsWith("/curated-playlists")
    ? "curated-collections"
    : searchParams.get("tab") || "my-playlists";

  return (
    <nav className="playlists-tabs-row fw-filter-rail" aria-label="Playlist sections">
      {PLAYLIST_TABS.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <Link
            key={tab.value}
            href={tab.href}
            className={`fw-filter-rail-item${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="fw-filter-rail-label">{tab.label}</span>
            <span className="fw-filter-rail-chevron" aria-hidden="true">
              <PlaylistTabChevronIcon />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
