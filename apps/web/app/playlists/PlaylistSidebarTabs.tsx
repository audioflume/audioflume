"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const PLAYLIST_SIDEBAR_TABS = [
  { label: "My Playlists", value: "my-playlists", href: "/playlists" },
  {
    label: "Curated Playlists",
    value: "curated-playlists",
    href: "/curated-playlists",
  },
  {
    label: "Community Playlists",
    value: "community-playlists",
    href: "/playlists?tab=community-playlists",
  },
] as const;

const PLAYLIST_SIDEBAR_STYLE = `
  body:has(.playlist-sidebar-tabs) {
    --playlist-sidebar-tabs-width: 168px;
  }

  .playlist-sidebar-tabs {
    position: fixed;
    top: var(--filmwave-header-height, 56px);
    left: 0;
    z-index: calc(var(--filmwave-z-search-filter, 60) - 1);
    box-sizing: border-box;
    display: flex;
    width: var(--playlist-sidebar-tabs-width);
    max-width: var(--playlist-sidebar-tabs-width);
    height: calc(
      100dvh - var(--filmwave-header-height, 56px) -
        var(--filmwave-sidebar-bottom-offset, 0px)
    );
    flex-direction: column;
    gap: 0;
    overflow-x: hidden;
    overflow-y: auto;
    border: 0;
    border-right: 1px solid
      var(--filmwave-side-filter-divider-color, var(--border-subtle));
    border-radius: 0;
    background: var(--bg-primary);
    padding: 10px 8px;
    scrollbar-width: none;
  }

  .playlist-sidebar-tabs::-webkit-scrollbar {
    display: none;
  }

  .playlist-sidebar-tabs .playlist-sidebar-tab {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    height: 38px;
    min-height: 38px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    border: 0;
    border-radius: 11px;
    background: transparent;
    margin: 0;
    padding: 0 8px 0 12px;
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 400;
    line-height: 1;
    text-align: left;
    text-decoration: none;
    transition: background-color 160ms ease, color 160ms ease;
  }

  .playlist-sidebar-tabs .playlist-sidebar-tab:hover,
  .playlist-sidebar-tabs .playlist-sidebar-tab.is-active {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .playlist-sidebar-tab-label {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .playlist-sidebar-tab-chevron {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity 160ms ease, color 160ms ease;
  }

  .playlist-sidebar-tab:hover .playlist-sidebar-tab-chevron,
  .playlist-sidebar-tab.is-active .playlist-sidebar-tab-chevron {
    opacity: 0.65;
  }

  .playlist-sidebar-tab-chevron svg {
    display: block;
    width: 11px;
    height: 11px;
  }

  body:has(.playlist-sidebar-tabs) .playlists-page,
  body:has(.playlist-sidebar-tabs) .curated-playlists-page-root {
    box-sizing: border-box !important;
    width: calc(100% - var(--playlist-sidebar-tabs-width)) !important;
    margin-left: var(--playlist-sidebar-tabs-width) !important;
  }

  body:has(.playlist-sidebar-tabs) .playlists-top-controls {
    width: calc(100% - var(--playlist-sidebar-tabs-width) - 64px) !important;
    margin-left: calc(var(--playlist-sidebar-tabs-width) + 32px) !important;
  }

  body:has(.playlist-sidebar-tabs):has(.curated-playlists-page-root) {
    --curated-featured-cover-size: calc(
      (
          100vw - var(--playlist-sidebar-tabs-width) -
            var(--curated-page-gutter) - var(--curated-page-gutter) -
            var(--curated-playlist-card-gap) -
            var(--curated-playlist-card-gap) -
            var(--curated-playlist-card-gap) -
            var(--curated-playlist-card-gap)
        ) /
        5
    );
  }

  @media (max-width: 1280px) {
    body:has(.playlist-sidebar-tabs):has(.curated-playlists-page-root) {
      --curated-featured-cover-size: calc(
        (
            100vw - var(--playlist-sidebar-tabs-width) -
              var(--curated-page-gutter) - var(--curated-page-gutter) -
              var(--curated-playlist-card-gap) -
              var(--curated-playlist-card-gap) -
              var(--curated-playlist-card-gap)
          ) /
          4
      );
    }
  }

  @media (max-width: 980px) {
    body:has(.playlist-sidebar-tabs):has(.curated-playlists-page-root) {
      --curated-featured-cover-size: calc(
        (
            100vw - var(--playlist-sidebar-tabs-width) -
              var(--curated-page-gutter) - var(--curated-page-gutter) -
              var(--curated-playlist-card-gap) -
              var(--curated-playlist-card-gap)
          ) /
          3
      );
    }
  }

  @media (max-width: 720px) {
    body:has(.playlist-sidebar-tabs):has(.curated-playlists-page-root) {
      --curated-featured-cover-size: calc(
        (
            100vw - var(--playlist-sidebar-tabs-width) -
              var(--curated-page-gutter) - var(--curated-page-gutter) -
              var(--curated-playlist-card-gap)
          ) /
          2
      );
    }
  }

  @media (max-width: 640px) {
    body:has(.playlist-sidebar-tabs) .playlists-top-controls {
      width: calc(100% - var(--playlist-sidebar-tabs-width) - 40px) !important;
      margin-right: 20px !important;
      margin-left: calc(var(--playlist-sidebar-tabs-width) + 20px) !important;
    }
  }
`;

function PlaylistSidebarChevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.6 5.3a1.3 1.3 0 0 1 1.84.04l5.5 5.76a1.3 1.3 0 0 1 0 1.8l-5.5 5.76a1.3 1.3 0 0 1-1.88-1.8L13.2 12 8.56 7.14a1.3 1.3 0 0 1 .04-1.84Z"
      />
    </svg>
  );
}

export default function PlaylistSidebarTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPlaylistLandingPage =
    pathname === "/playlists" || pathname === "/curated-playlists";

  if (!isPlaylistLandingPage) return null;

  const activeTab = pathname === "/curated-playlists"
    ? "curated-playlists"
    : searchParams.get("tab") === "community-playlists"
      ? "community-playlists"
      : "my-playlists";

  return (
    <>
      <style>{PLAYLIST_SIDEBAR_STYLE}</style>
      <nav className="playlist-sidebar-tabs" aria-label="Playlist sections">
        {PLAYLIST_SIDEBAR_TABS.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={`playlist-sidebar-tab${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="playlist-sidebar-tab-label">{tab.label}</span>
              <span className="playlist-sidebar-tab-chevron" aria-hidden="true">
                <PlaylistSidebarChevron />
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
