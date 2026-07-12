"use client";

import DropdownShell from "@/components/DropdownShell";
import GridViewIcon from "@/components/icons/GridViewIcon";
import ListViewIcon from "@/components/icons/ListViewIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PLAYLIST_SKELETON_VIEW_MODE_KEY = "filmwave-playlist-skeleton-view-mode";
const OPEN_CREATE_PLAYLIST_KEY = "filmwave-open-create-playlist";
const PLAYLIST_SCOPE_OPTIONS = [
  "All playlists",
  "My playlists",
  "Public Playlists",
] as const;

type PlaylistScopeOption = (typeof PLAYLIST_SCOPE_OPTIONS)[number];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.5 3a7.5 7.5 0 1 0 4.71 13.33l4.13 4.13a1.4 1.4 0 0 0 1.98-1.98l-4.13-4.13A7.5 7.5 0 0 0 10.5 3ZM5.8 10.5a4.7 4.7 0 1 1 9.4 0 4.7 4.7 0 0 1-9.4 0Z"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SortLabel({ sortMode }: { sortMode: string }) {
  if (sortMode === "alphabetical") return <>Alphabetical</>;
  return <>Custom</>;
}

function getPlaylistCardName(card: HTMLElement) {
  return (
    card.querySelector("h3")?.textContent ||
    card.querySelector(".playlist-row-main span")?.textContent ||
    card.textContent ||
    ""
  ).toLowerCase();
}

function applyPlaylistSearchFilter(query: string) {
  const cleanQuery = query.trim().toLowerCase();
  const nodes = document.querySelectorAll<HTMLElement>(
    ".playlists-page .playlist-gallery-card:not(.is-reordering), .playlists-page .playlist-index-row-shell",
  );

  nodes.forEach((node) => {
    const matches = !cleanQuery || getPlaylistCardName(node).includes(cleanQuery);
    node.hidden = !matches;
  });
}

function applyCuratedPlaylistSearchFilter(query: string) {
  const cleanQuery = query.trim().toLowerCase();
  const shelves = document.querySelectorAll<HTMLElement>(
    ".curated-playlists-page-layer .curated-playlist-shelf",
  );

  shelves.forEach((shelf) => {
    const cards = shelf.querySelectorAll<HTMLElement>(
      ".curated-playlist-card-shell",
    );
    let visibleCardCount = 0;

    cards.forEach((card) => {
      const matches =
        !cleanQuery || getPlaylistCardName(card).includes(cleanQuery);
      card.hidden = !matches;

      if (matches) visibleCardCount += 1;
    });

    const shelfWrapper = shelf.parentElement;

    if (shelfWrapper instanceof HTMLElement) {
      shelfWrapper.hidden = cards.length > 0 && visibleCardCount === 0;
    }
  });
}

export default function PlaylistTopControls() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentSong } = usePlayer();
  const {
    playlistViewMode: viewMode,
    setPlaylistViewMode: setViewMode,
    playlistSortMode: sortMode,
    setPlaylistSortMode: setSortMode,
    preferencesLoaded,
  } = useUserPreferences();
  const [query, setQuery] = useState("");
  const [playlistScope, setPlaylistScope] =
    useState<PlaylistScopeOption>("All playlists");
  const [playlistScopeOpen, setPlaylistScopeOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const playerVisible = Boolean(currentSong);
  const isMyPlaylistsPage = pathname === "/playlists";
  const isCuratedPlaylistsPage = pathname === "/curated-playlists";
  const isPlaylistLibraryPage =
    isMyPlaylistsPage || isCuratedPlaylistsPage;

  useEffect(() => {
    if (!isPlaylistLibraryPage) return;

    const applySearchFilter = () => {
      if (isCuratedPlaylistsPage) {
        applyCuratedPlaylistSearchFilter(query);
        return;
      }

      applyPlaylistSearchFilter(query);
    };

    applySearchFilter();

    const target =
      document.querySelector(
        isCuratedPlaylistsPage
          ? ".curated-playlists-page-layer"
          : ".playlists-page",
      ) || document.body;
    const observer = new MutationObserver(applySearchFilter);
    observer.observe(target, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [
    isCuratedPlaylistsPage,
    isMyPlaylistsPage,
    isPlaylistLibraryPage,
    query,
  ]);

  useEffect(() => {
    if (!isMyPlaylistsPage) return;
    if (
      window.sessionStorage.getItem(OPEN_CREATE_PLAYLIST_KEY) !== "true"
    ) {
      return;
    }

    window.sessionStorage.removeItem(OPEN_CREATE_PLAYLIST_KEY);

    let attempts = 0;
    let animationFrame = 0;

    const tryOpenCreatePlaylist = () => {
      const createButton = document.querySelector<HTMLButtonElement>(
        ".playlists-page button.playlist-create-card, .playlists-page button.playlist-create-row",
      );

      if (createButton) {
        createButton.click();
        return;
      }

      attempts += 1;

      if (attempts < 30) {
        animationFrame = window.requestAnimationFrame(tryOpenCreatePlaylist);
      }
    };

    tryOpenCreatePlaylist();

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isMyPlaylistsPage]);

  if (!isPlaylistLibraryPage) return null;

  function openCreatePlaylist() {
    if (isCuratedPlaylistsPage) {
      window.sessionStorage.setItem(OPEN_CREATE_PLAYLIST_KEY, "true");
      router.push("/playlists");
      return;
    }

    const createButton = document.querySelector<HTMLButtonElement>(
      ".playlists-page button.playlist-create-card, .playlists-page button.playlist-create-row",
    );

    createButton?.click();
  }

  function toggleViewMode() {
    const nextViewMode = viewMode === "grid" ? "list" : "grid";
    setViewMode(nextViewMode);
    window.localStorage.setItem(PLAYLIST_SKELETON_VIEW_MODE_KEY, nextViewMode);
    setSortOpen(false);
  }

  return (
    <>
      <style>{`
        .playlists-top-controls {
          grid-template-columns: 160px minmax(300px, 640px) minmax(270px, auto) !important;
        }

        .playlists-status-pill {
          width: 150px !important;
        }

        .playlist-scope-dropdown {
          min-width: 178px !important;
        }

        .playlist-scope-dropdown button.is-active {
          background: var(--filmwave-menu-hover) !important;
          color: var(--filmwave-menu-text) !important;
        }

        body:has(section.curated-playlists-page-layer) .playlists-top-controls {
          width: calc(100% - var(--sidebar-width) - 64px) !important;
          margin-left: calc(var(--sidebar-width) + 32px) !important;
        }

        body:has(.playlists-top-controls) section.curated-playlists-page-layer {
          padding-top: 0 !important;
        }

        @media (max-width: 940px) {
          .playlists-top-controls {
            grid-template-columns: 1fr !important;
          }

          .playlists-status-pill {
            width: 100% !important;
          }
        }
      `}</style>

      <section className="playlists-top-controls" aria-label="Playlist controls">
        <DropdownShell
          open={playlistScopeOpen}
          onOpenChange={setPlaylistScopeOpen}
          placement="bottom-start"
          className="playlist-scope-dropdown"
          offsetAmount={6}
          flippedOffsetAmount={6}
          collisionPadding={{
            top: 112,
            right: 16,
            bottom: playerVisible ? 96 : 24,
            left: 16,
          }}
          trigger={({ open }) => (
            <button
              type="button"
              className={`playlists-status-pill playlists-scope-button${open ? " is-open" : ""}`}
              aria-label="Playlist visibility scope"
            >
              <span>{playlistScope}</span>
              <ChevronIcon />
            </button>
          )}
        >
          {PLAYLIST_SCOPE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={playlistScope === option ? "is-active" : ""}
              aria-checked={playlistScope === option}
              onClick={() => {
                setPlaylistScope(option);
                setPlaylistScopeOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </DropdownShell>

        <label className="playlists-search">
          <SearchIcon />
          <input
            type="text"
            value={query}
            placeholder="Search playlists"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query.length > 0 && (
            <button
              type="button"
              className="playlists-search-clear"
              aria-label="Clear playlist search"
              onClick={() => setQuery("")}
            >
              ×
            </button>
          )}
        </label>

        {preferencesLoaded && (
          <div className="playlists-control-right">
            <button
              type="button"
              className="playlists-view-button"
              aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
              onClick={toggleViewMode}
            >
              {viewMode === "grid" ? <ListViewIcon /> : <GridViewIcon />}
            </button>

            <DropdownShell
              open={sortOpen}
              onOpenChange={setSortOpen}
              placement="bottom-end"
              className="playlist-sort-dropdown"
              offsetAmount={6}
              flippedOffsetAmount={6}
              collisionPadding={{
                top: 112,
                right: 16,
                bottom: playerVisible ? 96 : 24,
                left: 16,
              }}
              trigger={({ open }) => (
                <button
                  type="button"
                  className={`playlists-sort-button${open ? " is-open" : ""}`}
                  aria-label="Sort playlists"
                >
                  <span>Sort By</span>
                  <ChevronIcon />
                  <span className="sr-only">
                    <SortLabel sortMode={sortMode} />
                  </span>
                </button>
              )}
            >
              <button
                type="button"
                className={sortMode === "custom" ? "is-active" : ""}
                onClick={() => {
                  setSortMode("custom");
                  setSortOpen(false);
                }}
              >
                Custom
              </button>
              <button
                type="button"
                className={sortMode === "alphabetical" ? "is-active" : ""}
                onClick={() => {
                  setSortMode("alphabetical");
                  setSortOpen(false);
                }}
              >
                Alphabetical
              </button>
            </DropdownShell>

            <button
              type="button"
              className="playlists-new-button"
              onClick={openCreatePlaylist}
            >
              + New Playlist
            </button>
          </div>
        )}
      </section>
    </>
  );
}
