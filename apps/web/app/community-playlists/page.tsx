"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import Footer from "@/components/Footer";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import "../../../../packages/shared/styles/music-side-filter.css";
import "../playlists/playlists-tabs-rail.css";
import "./community-playlists.css";

type CommunityPlaylist = {
  id: number;
  name: string;
  cover_image_url: string | null;
  published_at: string | null;
  song_count: number;
  creator: {
    name: string;
    imageUrl: string | null;
  };
};

type CategoryIconName =
  | "cinematic"
  | "documentary"
  | "travelAmbient"
  | "commercial"
  | "urban"
  | "background"
  | "drama";

const COMMUNITY_LIKES_STORAGE_KEY = "filmwave-community-playlist-likes";

const categories: Array<{ label: string; icon: CategoryIconName }> = [
  { label: "Cinematic", icon: "cinematic" },
  { label: "Documentary", icon: "documentary" },
  { label: "TravelAmbient", icon: "travelAmbient" },
  { label: "Commercial", icon: "commercial" },
  { label: "Urban", icon: "urban" },
  { label: "Background", icon: "background" },
  { label: "Drama", icon: "drama" },
];

function CategoryIcon({ name }: { name: CategoryIconName }) {
  const paths: Record<CategoryIconName, React.ReactNode> = {
    cinematic: (
      <>
        <path d="M3 8h18v11H3z" />
        <path d="m4 8 3-4h4L8 8m5 0 3-4h4l-3 4" />
        <path d="M8 13h8" />
      </>
    ),
    documentary: (
      <>
        <rect x="3" y="6" width="13" height="12" rx="1" />
        <path d="m16 10 5-3v10l-5-3z" />
        <circle cx="8" cy="10" r="1.5" />
      </>
    ),
    travelAmbient: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9z" />
      </>
    ),
    commercial: (
      <>
        <rect x="3" y="7" width="18" height="12" rx="1" />
        <path d="M9 7V5h6v2M3 12h18M10 12v2h4v-2" />
      </>
    ),
    urban: (
      <>
        <path d="M4 20V9h6v11M10 20V4h7v16M17 20v-8h3v8" />
        <path d="M7 12h1M7 15h1M13 8h1M13 11h1M13 14h1" />
      </>
    ),
    background: (
      <>
        <path d="m12 4 8 4-8 4-8-4z" />
        <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
      </>
    ),
    drama: (
      <>
        <path d="M4 5h7v6c0 3-1.5 5-3.5 6C5.5 16 4 14 4 11z" />
        <path d="M13 5h7v6c0 3-1.5 5-3.5 6-1.1-.6-2-1.4-2.6-2.5" />
        <path d="M6 9h1M9 9h1M15 9h1M18 9h1M6.5 13c.7-.5 1.3-.5 2 0M15 13c.7.5 1.3.5 2 0" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "0 0 15px" }}
    >
      {paths[name]}
    </svg>
  );
}

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

export default function CommunityPlaylistsPage() {
  const { currentSong } = usePlayer();
  const [query, setQuery] = useState("");
  const [playlists, setPlaylists] = useState<CommunityPlaylist[]>([]);
  const [likedPlaylistIds, setLikedPlaylistIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const playerVisible = !!currentSong;

  useEffect(() => {
    try {
      const storedLikes = window.localStorage.getItem(
        COMMUNITY_LIKES_STORAGE_KEY,
      );
      const parsedLikes = storedLikes ? JSON.parse(storedLikes) : [];

      if (Array.isArray(parsedLikes)) {
        setLikedPlaylistIds(
          new Set(
            parsedLikes.filter(
              (playlistId): playlistId is number =>
                typeof playlistId === "number" && Number.isFinite(playlistId),
            ),
          ),
        );
      }
    } catch {
      setLikedPlaylistIds(new Set());
    } finally {
      setLikesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!likesLoaded) return;

    window.localStorage.setItem(
      COMMUNITY_LIKES_STORAGE_KEY,
      JSON.stringify([...likedPlaylistIds]),
    );
  }, [likedPlaylistIds, likesLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function loadCommunityPlaylists() {
      try {
        const response = await fetch("/api/community-playlists", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data?.error || "Could not load playlists");
        if (!cancelled) setPlaylists(data?.playlists ?? []);
      } catch (error) {
        console.warn("Community playlists request failed", error);
        if (!cancelled) setPlaylists([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCommunityPlaylists();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPlaylists = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return playlists;

    return playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(cleanQuery) ||
        playlist.creator.name.toLowerCase().includes(cleanQuery),
    );
  }, [playlists, query]);

  const featured = playlists.slice(0, 10);

  function togglePlaylistLike(playlistId: number) {
    setLikedPlaylistIds((current) => {
      const next = new Set(current);

      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }

      return next;
    });
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
              {categories.map((category) => (
                <a
                  className="fw-filter-rail-item"
                  key={category.label}
                  href={`#${category.label.toLowerCase()}`}
                >
                  <CategoryIcon name={category.icon} />
                  <span className="fw-filter-rail-label">{category.label}</span>
                  <span className="fw-filter-rail-chevron" aria-hidden="true">
                    <FilterRailChevron />
                  </span>
                </a>
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
            {["Trending", "Recent", "Most Liked", "Staff Picks", "Favorites"].map((tab, index) => (
              <button type="button" key={tab} className={index === 0 ? "is-active" : ""}>{tab}</button>
            ))}
          </div>

          <div className="community-grid" id="community-grid">
            {!loading && filteredPlaylists.length === 0 && (
              <div className="community-empty-state">
                {query.trim() ? "No public playlists match your search." : "No public playlists yet."}
              </div>
            )}

            {filteredPlaylists.map((playlist) => {
              const isLiked = likedPlaylistIds.has(playlist.id);

              return (
                <article className="community-card" key={playlist.id}>
                  <div className="community-cover-wrap">
                    {playlist.cover_image_url && (
                      <img className="community-cover" src={playlist.cover_image_url} alt="" />
                    )}
                    <button
                      className={`community-like${isLiked ? " is-liked" : ""}`}
                      type="button"
                      aria-label={`${isLiked ? "Unlike" : "Like"} ${playlist.name}`}
                      aria-pressed={isLiked}
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePlaylistLike(playlist.id);
                      }}
                    >
                      <HeartIcon filled={isLiked} />
                    </button>
                  </div>
                  <div className="community-card-title-row">
                    <h2>{playlist.name}</h2>
                    <button className="community-more playlist-menu-btn-grid" type="button" aria-label={`More options for ${playlist.name}`}>
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
