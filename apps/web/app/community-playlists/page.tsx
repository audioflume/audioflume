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
  play_count: number;
  like_count: number;
  seven_day_like_count: number;
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

function PlayCountIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M5.25 3.4a1 1 0 0 1 1.53-.84l8.4 6.1a1.65 1.65 0 0 1 0 2.68l-8.4 6.1a1 1 0 0 1-1.53-.84V3.4Z" />
    </svg>
  );
}

function LikeCountIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.2 17.1H4.55a1.35 1.35 0 0 1-1.35-1.35V9.4c0-.75.6-1.35 1.35-1.35H7.2v9.05Zm1.4 0V8.02l2.28-4.23c.35-.66 1.12-.98 1.83-.77.78.23 1.25 1.02 1.08 1.82l-.65 3.02h2.1c1.2 0 2.08 1.12 1.8 2.29l-1.25 5.35a2.08 2.08 0 0 1-2.03 1.6H8.6Z"
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

function formatCompactCount(value: number) {
  const count = Math.max(0, Number(value) || 0);
  if (count < 1000) return String(count);
  if (count < 1_000_000) {
    const compact = count / 1000;
    return `${compact >= 10 ? Math.round(compact) : compact.toFixed(1).replace(/\.0$/, "")}K`;
  }
  const compact = count / 1_000_000;
  return `${compact >= 10 ? Math.round(compact) : compact.toFixed(1).replace(/\.0$/, "")}M`;
}

function getPublishedTime(value: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
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
  const [recentFavoritePlaylistIds, setRecentFavoritePlaylistIds] = useState<Set<number>>(
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
        let recentFavoriteIds: number[] = [];
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json();
          favoriteIds = parseFavoriteIds(favoritesData?.favorite_playlist_ids);
          recentFavoriteIds = parseFavoriteIds(
            favoritesData?.recent_favorite_playlist_ids,
          );
        }

        if (!cancelled) {
          setPlaylists(playlistsData?.playlists ?? []);
          setFavoritePlaylistIds(new Set(favoriteIds));
          setRecentFavoritePlaylistIds(new Set(recentFavoriteIds));
        }
      } catch (error) {
        console.warn("Community playlists request failed", error);
        if (!cancelled) {
          setPlaylists([]);
          setFavoritePlaylistIds(new Set());
          setRecentFavoritePlaylistIds(new Set());
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
    const filtered = playlists.filter((playlist) => {
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

    if (activeTab === "Trending") {
      return [...filtered].sort((a, b) => {
        const recentLikeDifference =
          b.seven_day_like_count - a.seven_day_like_count;
        if (recentLikeDifference !== 0) return recentLikeDifference;

        const playDifference = b.play_count - a.play_count;
        if (playDifference !== 0) return playDifference;

        const publishedDifference =
          getPublishedTime(b.published_at) - getPublishedTime(a.published_at);
        if (publishedDifference !== 0) return publishedDifference;

        return b.id - a.id;
      });
    }

    if (activeTab === "Recent") {
      return [...filtered].sort((a, b) => {
        const publishedDifference =
          getPublishedTime(b.published_at) - getPublishedTime(a.published_at);
        if (publishedDifference !== 0) return publishedDifference;
        return b.id - a.id;
      });
    }

    if (activeTab === "Most Liked") {
      return [...filtered].sort((a, b) => {
        const likeDifference = b.like_count - a.like_count;
        if (likeDifference !== 0) return likeDifference;
        return b.play_count - a.play_count;
      });
    }

    return filtered;
  }, [activeTab, favoritePlaylistIds, playlists, query, selectedCategory]);

  const featured = playlists.slice(0, 10);

  async function togglePlaylistFavorite(playlistId: number) {
    if (pendingFavoriteIds.has(playlistId)) return;

    const wasFavorite = favoritePlaylistIds.has(playlistId);
    const wasRecentFavorite = recentFavoritePlaylistIds.has(playlistId);
    const countDelta = wasFavorite ? -1 : 1;
    const recentCountDelta = wasFavorite ? (wasRecentFavorite ? -1 : 0) : 1;

    setPendingFavoriteIds((current) => new Set(current).add(playlistId));
    setFavoritePlaylistIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(playlistId);
      else next.add(playlistId);
      return next;
    });
    setRecentFavoritePlaylistIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(playlistId);
      else next.add(playlistId);
      return next;
    });
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              like_count: Math.max(0, playlist.like_count + countDelta),
              seven_day_like_count: Math.max(
                0,
                playlist.seven_day_like_count + recentCountDelta,
              ),
            }
          : playlist,
      ),
    );

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
      setRecentFavoritePlaylistIds((current) => {
        const next = new Set(current);
        if (wasRecentFavorite) next.add(playlistId);
        else next.delete(playlistId);
        return next;
      });
      setPlaylists((current) =>
        current.map((playlist) =>
          playlist.id === playlistId
            ? {
                ...playlist,
                like_count: Math.max(0, playlist.like_count - countDelta),
                seven_day_like_count: Math.max(
                  0,
                  playlist.seven_day_like_count - recentCountDelta,
                ),
              }
            : playlist,
        ),
      );
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

        .community-engagement {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 9px;
          color: var(--text-muted);
          font-size: 11px;
          line-height: 1;
        }

        .community-engagement-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .community-engagement-item svg {
          display: block;
          width: 14px;
          height: 14px;
          flex: 0 0 14px;
        }

        .community-creator-overlay {
          position: absolute;
          right: 8px;
          bottom: 8px;
          z-index: 2;
          display: inline-flex;
          max-width: calc(100% - 16px);
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          background: rgba(12, 12, 12, 0.72);
          padding: 5px 8px 5px 5px;
          color: #fff;
          font-size: 10.5px;
          line-height: 1;
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
        }

        .community-creator-overlay > span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .community-avatar-image,
        .community-creator-overlay .community-avatar {
          display: block;
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          border-radius: 50%;
          object-fit: cover;
        }

        .community-creator-overlay .community-avatar {
          background: #808080;
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

        .community-cover {
          transition: transform 0.7s ease;
        }

        .community-card:hover .community-cover {
          transform: scale(1.025);
        }

        .community-like {
          z-index: 3;
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
                    <div className="community-creator-overlay">
                      {playlist.creator.imageUrl ? (
                        <img className="community-avatar-image" src={playlist.creator.imageUrl} alt="" />
                      ) : (
                        <span className="community-avatar" aria-hidden="true" />
                      )}
                      <span>{playlist.creator.name}</span>
                    </div>
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
                  <div className="community-engagement" aria-label="Playlist engagement">
                    <span className="community-engagement-item" title={`${playlist.play_count} plays`}>
                      <PlayCountIcon />
                      <span>{formatCompactCount(playlist.play_count)}</span>
                    </span>
                    <span className="community-engagement-item" title={`${playlist.like_count} likes`}>
                      <LikeCountIcon />
                      <span>{formatCompactCount(playlist.like_count)}</span>
                    </span>
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
