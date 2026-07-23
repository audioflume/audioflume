"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import Footer from "@/components/Footer";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import {
  COMMUNITY_PLAYLIST_CATEGORIES,
  type CommunityPlaylistCategory,
} from "@/lib/communityPlaylistCategories";
import "../../../../packages/shared/styles/music-side-filter.css";
import "../playlists/playlists-tabs-rail.css";
import "./community-playlists.css";

type CommunityPlaylist = {
  id: number;
  name: string;
  cover_image_url: string | null;
  published_at: string | null;
  primary_category: CommunityPlaylistCategory | null;
  secondary_categories: CommunityPlaylistCategory[];
  song_count: number;
  creator: {
    name: string;
    imageUrl: string | null;
  };
};

type CategoryFilter = "All" | CommunityPlaylistCategory;
type CommunityTab = "Trending" | "Recent" | "Most Liked" | "Favorites";

const COMMUNITY_TABS: CommunityTab[] = [
  "Trending",
  "Recent",
  "Most Liked",
  "Favorites",
];

function FilterRailChevron() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.6 5.3a1.3 1.3 0 0 1 1.84.04l5.5 5.76a1.3 1.3 0 0 1 0 1.8l-5.5 5.76a1.3 1.3 0 0 1-1.88-1.8L13.2 12 8.56 7.14a1.3 1.3 0 0 1 .04-1.84Z"
      />
    </svg>
  );
}

function parseFavoriteIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((playlistId) => Number(playlistId))
    .filter((playlistId) => Number.isInteger(playlistId) && playlistId > 0);
}

export default function CommunityPlaylistsPage() {
  const { currentSong } = usePlayer();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("All");
  const [activeTab, setActiveTab] = useState<CommunityTab>("Trending");
  const [playlists, setPlaylists] = useState<CommunityPlaylist[]>([]);
  const [favoritePlaylistIds, setFavoritePlaylistIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const playerVisible = !!currentSong;

  useEffect(() => {
    let cancelled = false;

    async function loadCommunityData() {
      try {
        const [playlistsResponse, favoritesResponse] = await Promise.all([
          fetch("/api/community-playlists", { cache: "no-store" }),
          fetch("/api/community-playlist-favorites", { cache: "no-store" }),
        ]);

        const playlistsData = await playlistsResponse.json();
        if (!playlistsResponse.ok) {
          throw new Error(playlistsData?.error || "Could not load playlists");
        }

        let favoriteIds: number[] = [];
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json();
          favoriteIds = parseFavoriteIds(favoritesData?.favorite_playlist_ids);
        }

        if (!cancelled) {
          setPlaylists(playlistsData?.playlists ?? []);
          setFavoritePlaylistIds(new Set(favoriteIds));
        }
      } catch (error) {
        console.warn("Community playlists request failed", error);
        if (!cancelled) {
          setPlaylists([]);
          setFavoritePlaylistIds(new Set());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCommunityData();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<CommunityPlaylistCategory, number>();

    for (const playlist of playlists) {
      const assignedCategories = new Set([
        ...(playlist.primary_category ? [playlist.primary_category] : []),
        ...playlist.secondary_categories,
      ]);

      for (const category of assignedCategories) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }

    return counts;
  }, [playlists]);

  const filteredPlaylists = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return playlists.filter((playlist) => {
      const categoryMatches =
        selectedCategory === "All" ||
        playlist.primary_category === selectedCategory ||
        playlist.secondary_categories.includes(selectedCategory);

      if (!categoryMatches) return false;
      if (
        activeTab === "Favorites" &&
        !favoritePlaylistIds.has(playlist.id)
      ) {
        return false;
      }
      if (!cleanQuery) return true;

      return (
        playlist.name.toLowerCase().includes(cleanQuery) ||
        playlist.creator.name.toLowerCase().includes(cleanQuery) ||
        playlist.primary_category?.toLowerCase().includes(cleanQuery) ||
        playlist.secondary_categories.some((category) =>
          category.toLowerCase().includes(cleanQuery),
        )
      );
    });
  }, [activeTab, favoritePlaylistIds, playlists, query, selectedCategory]);

  const featured = playlists.slice(0, 10);

  async function togglePlaylistFavorite(playlistId: number) {
    if (pendingFavoriteIds.has(playlistId)) return;

    const wasFavorite = favoritePlaylistIds.has(playlistId);

    setPendingFavoriteIds((current) => new Set(current).add(playlistId));
    setFavoritePlaylistIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(playlistId);
      else next.add(playlistId);
      return next;
    });

    try {
      const response = await fetch("/api/community-playlist-favorites", {
        method: wasFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist_id: playlistId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not update favorite playlist");
      }
    } catch (error) {
      console.warn("Community playlist favorite update failed", error);
      setFavoritePlaylistIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(playlistId);
        else next.delete(playlistId);
        return next;
      });
    } finally {
      setPendingFavoriteIds((current) => {
        const next = new Set(current);
        next.delete(playlistId);
        return next;
      });
    }
  }

  function getEmptyStateMessage() {
    if (query.trim()) return "No public playlists match your search.";
    if (activeTab === "Favorites") {
      return "You have not favorited any community playlists yet.";
    }
    if (selectedCategory !== "All") {
      return `No public playlists are assigned to ${selectedCategory} yet.`;
    }
    return "No public playlists yet.";
  }

  return (
    <>
      <style>{`
        .community-page {
          height: calc(100vh - var(--filmwave-header-height, 56px));
          margin-top: var(--filmwave-header-height, 56px);
          display: grid;
          grid-template-columns: 276px minmax(0, 1fr);
          overflow: hidden;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .community-page.is-player-visible {
          height: calc(100vh - var(--filmwave-header-height, 56px) - 72px);
        }

        .community-sidebar {
          border-right-color: var(--border) !important;
        }

        .community-sidebar-section + .community-sidebar-section {
          border-top-color: var(--border) !important;
        }

        .community-content {
          padding-top: 22px !important;
          padding-bottom: 0 !important;
        }

        .community-title-style-scope.playlists-page {
          position: static !important;
          display: block !important;
          min-height: 0 !important;
          margin: 0 !important;
          overflow: visible !important;
          background: transparent !important;
        }

        .community-title-style-scope.playlists-page .playlists-hero {
          padding: 0 !important;
          margin: 0 !important;
        }

        .community-title-style-scope.playlists-page .playlists-title::before {
          content: "Community Playlists";
        }

        .community-sidebar-heading {
          color: var(--text-muted) !important;
          font-family: inherit !important;
          font-size: 10.5px !important;
          font-weight: 600 !important;
          letter-spacing: 0.09em !important;
          line-height: normal !important;
          text-transform: uppercase !important;
        }

        .community-categories nav {
          gap: 0 !important;
        }

        .community-categories .fw-filter-rail-item {
          width: 100%;
          border: 0;
          background: transparent;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
        }

        .community-categories .fw-filter-rail-item.is-active {
          background: var(--bg-hover) !important;
          background-color: var(--bg-hover) !important;
          color: var(--text-primary) !important;
        }

        .community-category-count {
          margin-left: auto;
          color: var(--text-muted);
          font-size: 10px;
        }

        .community-categories .fw-filter-rail-item.is-active .community-category-count {
          color: var(--text-secondary);
        }

        .community-featured {
          min-height: 0 !important;
          height: auto !important;
          flex: 0 0 auto !important;
          overflow: visible !important;
          padding-bottom: 32px !important;
        }

        .community-featured-list {
          min-height: 0 !important;
          flex: 0 0 auto !important;
          overflow: visible !important;
          overscroll-behavior: auto !important;
          padding-bottom: 0 !important;
        }

        .community-track-count {
          margin-top: 5px !important;
        }

        .community-footer-wrap {
          padding-top: 48px;
          padding-bottom: 0;
        }

        .community-empty-state {
          grid-column: 1 / -1;
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 12px;
        }

        .community-avatar-image {
          display: block;
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          border-radius: 50%;
          object-fit: cover;
        }

        .community-cover {
          transition: transform 0.7s ease;
        }

        .community-card:hover .community-cover {
          transform: scale(1.025);
        }

        .community-like {
          z-index: 2;
          transition: transform 150ms ease, opacity 150ms ease;
        }

        .community-like:hover,
        .community-like:focus-visible {
          transform: scale(1.08);
          outline: none;
        }

        .community-like.is-liked {
          --favorite-icon-color: #fff;
        }

        .community-like:disabled {
          cursor: default;
        }

        @media (max-width: 1040px) {
          .community-page {
            grid-template-columns: 220px minmax(0, 1fr);
          }
        }

        @media (max-width: 760px) {
          .community-page,
          .community-page.is-player-visible {
            height: auto;
            min-height: calc(100vh - var(--filmwave-header-height, 56px));
            display: block;
            overflow: visible;
          }
        }
      `}</style>

      <main className={`community-page${playerVisible ? " is-player-visible" : ""}`}>
        <aside className="community-sidebar" aria-label="Community playlist discovery">
          <section className="community-sidebar-section community-categories">
            <p className="community-sidebar-heading">Categories</p>
            <nav aria-label="Community playlist categories">
              <button
                type="button"
                className={`fw-filter-rail-item${selectedCategory === "All" ? " is-active" : ""}`}
                aria-pressed={selectedCategory === "All"}
                onClick={() => setSelectedCategory("All")}
              >
                <span className="fw-filter-rail-label">All</span>
                <span className="community-category-count">{playlists.length}</span>
                <span className="fw-filter-rail-chevron" aria-hidden="true">
                  <FilterRailChevron />
                </span>
              </button>
              {COMMUNITY_PLAYLIST_CATEGORIES.map((category) => (
                <button
                  type="button"
                  className={`fw-filter-rail-item${selectedCategory === category ? " is-active" : ""}`}
                  key={category}
                  aria-pressed={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                >
                  <span className="fw-filter-rail-label">{category}</span>
                  <span className="community-category-count">
                    {categoryCounts.get(category) ?? 0}
                  </span>
                  <span className="fw-filter-rail-chevron" aria-hidden="true">
                    <FilterRailChevron />
                  </span>
                </button>
              ))}
            </nav>
          </section>

          <section className="community-sidebar-section community-featured">
            <p className="community-sidebar-heading">Featured Playlists</p>
            <div className="community-featured-list">
              {featured.map((playlist) => (
                <a className="community-featured-item" href="#community-grid" key={playlist.id}>
                  {playlist.cover_image_url ? (
                    <img src={playlist.cover_image_url} alt="" />
                  ) : (
                    <span className="community-featured-placeholder" aria-hidden="true" />
                  )}
                  <span>
                    <strong>{playlist.name}</strong>
                    <small>{playlist.song_count} songs</small>
                  </span>
                </a>
              ))}
            </div>
          </section>
        </aside>

        <section className="community-content">
          <div className="community-heading-row">
            <div className="community-title-style-scope playlists-page">
              <div className="playlists-hero">
                <h1 className="playlists-title">Playlists</h1>
              </div>
            </div>
            <label className="community-search">
              <SearchIcon size={13} />
              <input
                type="text"
                value={query}
                placeholder="Search community playlists..."
                aria-label="Search community playlists"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  className="community-search-clear"
                  aria-label="Clear community playlist search"
                  onClick={() => setQuery("")}
                >
                  ×
                </button>
              )}
            </label>
          </div>

          <div className="community-tabs" role="tablist" aria-label="Community playlist sorting">
            {COMMUNITY_TABS.map((tab) => (
              <button
                type="button"
                role="tab"
                key={tab}
                className={activeTab === tab ? "is-active" : ""}
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="community-grid" id="community-grid">
            {!loading && filteredPlaylists.length === 0 && (
              <div className="community-empty-state">{getEmptyStateMessage()}</div>
            )}

            {filteredPlaylists.map((playlist) => {
              const isFavorite = favoritePlaylistIds.has(playlist.id);
              const isPending = pendingFavoriteIds.has(playlist.id);

              return (
                <article className="community-card" key={playlist.id}>
                  <div className="community-cover-wrap">
                    {playlist.cover_image_url && (
                      <img className="community-cover" src={playlist.cover_image_url} alt="" />
                    )}
                    <button
                      className={`community-like${isFavorite ? " is-liked" : ""}`}
                      type="button"
                      aria-label={`${isFavorite ? "Remove from favorites" : "Add to favorites"}: ${playlist.name}`}
                      aria-pressed={isFavorite}
                      disabled={isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        void togglePlaylistFavorite(playlist.id);
                      }}
                    >
                      <HeartIcon filled={isFavorite} />
                    </button>
                  </div>
                  <div className="community-card-title-row">
                    <h2>{playlist.name}</h2>
                    <button
                      className="community-more playlist-menu-btn-grid"
                      type="button"
                      aria-label={`More options for ${playlist.name}`}
                    >
                      <MoreIcon />
                    </button>
                  </div>
                  <p className="community-track-count">{playlist.song_count} songs</p>
                  <div className="community-creator">
                    {playlist.creator.imageUrl ? (
                      <img className="community-avatar-image" src={playlist.creator.imageUrl} alt="" />
                    ) : (
                      <span className="community-avatar" aria-hidden="true" />
                    )}
                    <span>by {playlist.creator.name}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="community-footer-wrap">
            <Footer playerPadding={false} />
          </div>
        </section>
      </main>
    </>
  );
}
