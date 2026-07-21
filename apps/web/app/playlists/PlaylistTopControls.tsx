"use client";

import DropdownShell from "@/components/DropdownShell";
import GridViewIcon from "@/components/icons/GridViewIcon";
import ListViewIcon from "@/components/icons/ListViewIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import SortIcon from "@/components/icons/SortIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import type { Playlist } from "@/lib/types";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const PLAYLIST_SKELETON_VIEW_MODE_KEY = "filmwave-playlist-skeleton-view-mode";
const PLAYLIST_SCOPE_OPTIONS = [
  "All playlists",
  "Private playlists",
  "Public playlists",
] as const;
const PLAYLIST_GRADIENTS = [
  "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)",
  "linear-gradient(135deg,#1f3d3a 0%,#111111 52%,#4d8c7b 100%)",
  "linear-gradient(135deg,#4f3529 0%,#111111 50%,#b66c45 100%)",
  "linear-gradient(135deg,#25364f 0%,#111111 52%,#6287c4 100%)",
  "linear-gradient(135deg,#45233d 0%,#111111 52%,#b75d91 100%)",
  "linear-gradient(135deg,#0f172a 0%,#111111 52%,#1e3a5f 100%)",
  "linear-gradient(135deg,#003344 0%,#111111 52%,#00516b 100%)",
  "linear-gradient(135deg,#3d2800 0%,#111111 52%,#6b4500 100%)",
  "linear-gradient(135deg,#1a0a2e 0%,#111111 52%,#2d1554 100%)",
  "linear-gradient(135deg,#0a2e0a 0%,#111111 52%,#145214 100%)",
];

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

function ReorderHandleIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      <circle cx="2" cy="2.5" r="1" fill="currentColor" />
      <circle cx="8" cy="2.5" r="1" fill="currentColor" />
      <circle cx="2" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="2" cy="13.5" r="1" fill="currentColor" />
      <circle cx="8" cy="13.5" r="1" fill="currentColor" />
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

function getPlaylistIdFromCard(card: HTMLElement) {
  const link = card.querySelector<HTMLAnchorElement>('a[href^="/playlists/"]');
  const match = link?.getAttribute("href")?.match(/^\/playlists\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function applyPlaylistFilters(
  query: string,
  scope: PlaylistScopeOption,
  playlists: Playlist[],
) {
  const cleanQuery = query.trim().toLowerCase();
  const playlistVisibility = new Map(
    playlists.map((playlist) => [playlist.id, playlist.is_public]),
  );
  const nodes = document.querySelectorAll<HTMLElement>(
    ".playlists-page .playlist-gallery-card:not(.is-reordering), .playlists-page .playlist-index-row-shell",
  );

  nodes.forEach((node) => {
    const playlistId = getPlaylistIdFromCard(node);
    const isPublic = playlistId == null ? null : playlistVisibility.get(playlistId);
    const matchesSearch =
      !cleanQuery || getPlaylistCardName(node).includes(cleanQuery);
    const matchesScope =
      scope === "All playlists" ||
      (scope === "Public playlists" && isPublic === true) ||
      (scope === "Private playlists" && isPublic === false);

    node.hidden = !(matchesSearch && matchesScope);
  });
}

function getPlaylistCover(playlist: Playlist) {
  return typeof playlist.cover_image_url === "string" &&
    playlist.cover_image_url.trim()
    ? playlist.cover_image_url
    : null;
}

function getPlaylistCountLabel(playlistId: number) {
  const link = document.querySelector<HTMLElement>(
    `.playlists-page a[href="/playlists/${playlistId}"]`,
  );
  const card = link?.closest<HTMLElement>(
    ".playlist-gallery-card, .playlist-index-row-shell",
  );

  return (
    card?.querySelector<HTMLElement>(".playlist-gallery-content p")?.textContent ||
    card?.querySelector<HTMLElement>(".playlist-row-count")?.textContent ||
    ""
  ).trim();
}

function movePlaylist(
  playlists: Playlist[],
  activeId: number,
  overId: number,
) {
  const fromIndex = playlists.findIndex((playlist) => playlist.id === activeId);
  const toIndex = playlists.findIndex((playlist) => playlist.id === overId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return playlists;

  const next = [...playlists];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function PlaylistReorderArtwork({
  playlist,
  index,
  className,
}: {
  playlist: Playlist;
  index: number;
  className: string;
}) {
  const cover = getPlaylistCover(playlist);

  return (
    <div
      className={className}
      style={{
        background: cover
          ? "var(--media-overlay-solid)"
          : PLAYLIST_GRADIENTS[index % PLAYLIST_GRADIENTS.length],
      }}
    >
      {cover && <img src={cover} alt={playlist.name} />}
    </div>
  );
}

function PlaylistReorderCard({
  playlist,
  index,
  viewMode,
  countLabel,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  playlist: Playlist;
  index: number;
  viewMode: string;
  countLabel: string;
  dragging: boolean;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  if (viewMode === "list") {
    return (
      <div
        className="playlist-index-row is-reordering playlist-top-reorder-item"
        draggable
        style={{ opacity: dragging ? 0.35 : 1 }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        <div className="playlist-row-handle">
          <ReorderHandleIcon />
        </div>
        <div className="playlist-row-number">
          {String(index + 1).padStart(2, "0")}
        </div>
        <PlaylistReorderArtwork
          playlist={playlist}
          index={index}
          className="playlist-row-cover"
        />
        <div className="playlist-row-main">
          <span>{playlist.name}</span>
          <small />
        </div>
        <div className="playlist-row-count">{countLabel}</div>
      </div>
    );
  }

  return (
    <div
      className="playlist-gallery-card is-reordering playlist-top-reorder-item"
      draggable
      style={{ opacity: dragging ? 0.35 : 1 }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="playlist-gallery-art-wrap">
        <PlaylistReorderArtwork
          playlist={playlist}
          index={index}
          className="playlist-gallery-art"
        />
        <div className="playlist-gallery-top-row">
          <div className="playlist-gallery-handle">
            <ReorderHandleIcon />
          </div>
        </div>
        <div className="playlist-gallery-content">
          <h3>{playlist.name}</h3>
          <p>{countLabel}</p>
        </div>
      </div>
    </div>
  );
}

export default function PlaylistTopControls() {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const { playlists, setPlaylists } = usePlaylists();
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
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderItems, setReorderItems] = useState<Playlist[]>([]);
  const [reorderTarget, setReorderTarget] = useState<HTMLElement | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [countLabels, setCountLabels] = useState<Record<number, string>>({});
  const startReorderRef = useRef<() => void>(() => undefined);

  const playerVisible = Boolean(currentSong);
  const isMyPlaylistsPage = pathname === "/playlists";

  useEffect(() => {
    if (!isMyPlaylistsPage) return;

    applyPlaylistFilters(query, playlistScope, playlists);

    const target = document.querySelector(".playlists-page") || document.body;
    const observer = new MutationObserver(() =>
      applyPlaylistFilters(query, playlistScope, playlists),
    );
    observer.observe(target, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [isMyPlaylistsPage, playlistScope, playlists, query]);

  const startReorder = useCallback(() => {
    const libraryTarget = document.querySelector<HTMLElement>(
      ".playlists-page .playlist-library",
    );
    const nextCountLabels: Record<number, string> = {};

    playlists.forEach((playlist) => {
      nextCountLabels[playlist.id] = getPlaylistCountLabel(playlist.id);
    });

    setReorderItems([...playlists]);
    setCountLabels(nextCountLabels);
    setReorderTarget(libraryTarget);
    setDraggingId(null);
    setSortMode("custom");
    setReorderOpen(true);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  }, [playlists, setSortMode]);

  useEffect(() => {
    startReorderRef.current = startReorder;
  }, [startReorder]);

  useEffect(() => {
    if (!isMyPlaylistsPage) return;

    function injectReorderAction() {
      const openPlaylistTrigger = document.querySelector(
        '.playlists-page [data-playlist-menu] [data-dropdown-open="true"]',
      );

      if (!openPlaylistTrigger) return;

      const shells = Array.from(
        document.querySelectorAll<HTMLElement>(".filmwave-dropdown-shell"),
      );
      const playlistShell = shells.find((shell) => {
        const labels = Array.from(shell.querySelectorAll(":scope > button")).map(
          (button) => button.textContent?.trim(),
        );

        return (
          labels.includes("Edit") &&
          labels.includes("Rename") &&
          labels.includes("Delete")
        );
      });

      if (!playlistShell || playlistShell.querySelector("[data-playlist-reorder-action]")) {
        return;
      }

      const reorderButton = document.createElement("button");
      reorderButton.type = "button";
      reorderButton.textContent = "Reorder";
      reorderButton.dataset.playlistReorderAction = "true";
      reorderButton.addEventListener("click", () => startReorderRef.current());

      const deleteButton = Array.from(
        playlistShell.querySelectorAll<HTMLButtonElement>(":scope > button"),
      ).find((button) => button.textContent?.trim() === "Delete");

      playlistShell.insertBefore(reorderButton, deleteButton || null);
    }

    injectReorderAction();
    const observer = new MutationObserver(injectReorderAction);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isMyPlaylistsPage]);

  if (!isMyPlaylistsPage) return null;

  function openCreatePlaylist() {
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

  function cancelReorder() {
    setReorderOpen(false);
    setReorderTarget(null);
    setReorderItems([]);
    setDraggingId(null);
  }

  async function saveReorder() {
    if (savingOrder) return;

    const reordered = reorderItems.map((playlist, index) => ({
      ...playlist,
      position: index,
    }));

    setSavingOrder(true);

    try {
      const response = await fetch("/api/playlists/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlists: reordered.map((playlist) => ({
            id: playlist.id,
            position: playlist.position,
          })),
        }),
      });

      if (!response.ok) return;

      setPlaylists(reordered);
      cancelReorder();
    } finally {
      setSavingOrder(false);
    }
  }

  const reorderPortal =
    reorderOpen && reorderTarget
      ? createPortal(
          <div className="playlist-top-reorder-root">
            <div className="playlist-edit-banner">
              <span>Drag playlists into the order you want.</span>
              <div className="playlist-edit-actions">
                <button
                  type="button"
                  className="playlist-edit-cancel"
                  onClick={cancelReorder}
                  disabled={savingOrder}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="playlist-edit-save"
                  onClick={saveReorder}
                  disabled={savingOrder}
                >
                  {savingOrder ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div
              className={
                viewMode === "grid"
                  ? "playlist-gallery"
                  : "playlist-index"
              }
            >
              {reorderItems.map((playlist, index) => (
                <PlaylistReorderCard
                  key={playlist.id}
                  playlist={playlist}
                  index={index}
                  viewMode={viewMode}
                  countLabel={countLabels[playlist.id] || ""}
                  dragging={draggingId === playlist.id}
                  onDragStart={() => setDraggingId(playlist.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggingId == null) return;
                    setReorderItems((current) =>
                      movePlaylist(current, draggingId, playlist.id),
                    );
                    setDraggingId(null);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))}
            </div>
          </div>,
          reorderTarget,
        )
      : null;

  return (
    <>
      <style>{`
        .playlists-page .playlist-gallery-letters {
          display: none !important;
        }

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

        .playlists-sort-button-icon,
        .playlists-new-button-icon {
          align-items: center;
          justify-content: center;
        }

        .playlists-sort-button-icon {
          display: none;
        }

        .playlists-new-button-icon {
          display: inline-flex;
        }

        .playlists-page .playlist-library:has(.playlist-top-reorder-root) > :not(.playlist-top-reorder-root) {
          display: none !important;
        }

        .playlist-top-reorder-root {
          display: flex;
          flex-direction: column;
        }

        .playlist-top-reorder-root .playlist-edit-banner {
          margin-top: 0;
        }

        .playlist-top-reorder-item {
          cursor: grab !important;
          user-select: none;
        }

        .playlist-top-reorder-item:active {
          cursor: grabbing !important;
        }

        .playlist-top-reorder-root .playlist-gallery-art img,
        .playlist-top-reorder-root .playlist-row-cover img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        @media (max-width: 940px) {
          .playlists-top-controls {
            grid-template-columns: 150px minmax(0, 1fr) auto !important;
            align-items: start !important;
            gap: 12px !important;
          }

          .playlists-status-pill {
            width: 150px !important;
          }

          .playlists-control-right {
            justify-content: flex-end !important;
            flex-wrap: nowrap !important;
            gap: 8px !important;
          }

          .playlists-sort-button,
          .playlists-new-button {
            width: 42px !important;
            min-width: 42px !important;
            padding: 0 !important;
          }

          .playlists-sort-button {
            gap: 0 !important;
          }

          .playlists-sort-button-icon {
            display: inline-flex;
          }

          .playlists-sort-button-label,
          .playlists-sort-button-chevron,
          .playlists-new-button-label {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .playlists-top-controls {
            grid-template-columns: 120px minmax(0, 1fr) auto !important;
            gap: 8px !important;
          }

          .playlists-status-pill {
            width: 120px !important;
            padding-right: 12px !important;
            padding-left: 12px !important;
          }

          .playlists-control-right {
            flex-wrap: nowrap !important;
            gap: 6px !important;
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
                  <span className="playlists-sort-button-icon" aria-hidden="true">
                    <SortIcon />
                  </span>
                  <span className="playlists-sort-button-label">Sort By</span>
                  <span className="playlists-sort-button-chevron">
                    <ChevronIcon />
                  </span>
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
              aria-label="New playlist"
            >
              <span className="playlists-new-button-icon" aria-hidden="true">
                <PlusIcon size={16} />
              </span>
              <span className="playlists-new-button-label">New Playlist</span>
            </button>
          </div>
        )}
      </section>
      {reorderPortal}
    </>
  );
}
