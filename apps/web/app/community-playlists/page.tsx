"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/context/PlayerContext";
import Footer from "@/components/Footer";
import RecentPlaylistCards from "@/components/RecentPlaylistCards";
import Toast from "@/components/Toast";
import XIcon from "@/components/icons/XIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import {
  COMMUNITY_PLAYLIST_CATEGORIES,
  type CommunityPlaylistCategory,
} from "@/lib/communityPlaylistCategories";
import type { Song } from "@/lib/types";
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
    id: string;
    name: string;
    imageUrl: string | null;
  };
};

type CommunityPlaylistRanking = Pick<
  CommunityPlaylist,
  "like_count" | "seven_day_like_count" | "play_count" | "published_at"
>;

type CommunityPlaylistPlaybackResponse = {
  songs?: Song[];
  error?: string;
};

type CategoryFilter = "All" | CommunityPlaylistCategory;
type CommunityTab =
  | "Featured"
  | "All"
  | "Trending"
  | "Recent"
  | "Most Liked"
  | "Favorites";

const COMMUNITY_TABS: CommunityTab[] = [
  "Trending",
  "Recent",
  "Most Liked",
  "Favorites",
];

const RECENT_COMMUNITY_PLAYLISTS_KEY =
  "filmwave-recent-community-playlists";

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

function CommunityCategoryIcon({ category }: { category: CategoryFilter }) {
  const commonProps = {
    viewBox: "0 0 20 20",
    width: 15,
    height: 15,
    fill: "none",
    "aria-hidden": true,
  } as const;

  const strokeProps = {
    stroke: "currentColor",
    strokeWidth: 1.45,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (category) {
    case "All":
      return (
        <svg
          {...commonProps}
          width={14}
          height={14}
          style={{ width: 14, height: 14 }}
        >
          <path
            d="m10 2.8 2.1 4.25 4.7.68-3.4 3.32.8 4.68-4.2-2.2-4.2 2.2.8-4.68-3.4-3.32 4.7-.68Z"
            {...strokeProps}
          />
        </svg>
      );
    case "Documentary":
      return (
        <svg {...commonProps}>
          <path d="M5 2.75h6l4 4v10.5H5Z" {...strokeProps} />
          <path d="M11 2.75v4h4M7.5 10h5M7.5 13h5" {...strokeProps} />
        </svg>
      );
    case "Travel":
      return (
        <svg {...commonProps}>
          <circle cx="10" cy="10" r="7" {...strokeProps} />
          <path d="m12.8 7.2-1.9 3.7-3.7 1.9 1.9-3.7Z" {...strokeProps} />
        </svg>
      );
    case "Ambient":
      return (
        <svg {...commonProps}>
          <path d="M3 8.2c2-2 4-2 6 0s4 2 8 0M3 11.8c2-2 4-2 6 0s4 2 8 0" {...strokeProps} />
        </svg>
      );
    case "Cinematic":
      return (
        <svg {...commonProps}>
          <path d="M3 6.5h14v10H3Z" {...strokeProps} />
          <path d="m4 3.5 2.2 3M8 3.5l2.2 3M12 3.5l2.2 3M16 3.5l1 1.4" {...strokeProps} />
        </svg>
      );
    case "Urban":
      return (
        <svg {...commonProps}>
          <path d="M3 17V8h5v9M8 17V4h5v13M13 17v-6h4v6" {...strokeProps} />
        </svg>
      );
    case "Commercial":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="6.5" width="13" height="9" rx="1.5" {...strokeProps} />
          <path d="M7.5 6.5V5c0-.8.7-1.5 1.5-1.5h2c.8 0 1.5.7 1.5 1.5v1.5M3.5 10h13M8.5 10v1.5h3V10" {...strokeProps} />
        </svg>
      );
    case "Background":
      return (
        <svg {...commonProps}>
          <path d="m10 3 7 4-7 4-7-4 7-4Z" {...strokeProps} />
          <path d="m4.5 10.75 5.5 3 5.5-3M4.5 13.5l5.5 3 5.5-3" {...strokeProps} />
        </svg>
      );
    case "Electronic":
      return (
        <svg {...commonProps}>
          <path d="M3 10h2l1.5-4 2.5 8 2-6 1.5 4H17" {...strokeProps} />
        </svg>
      );
    case "Acoustic":
      return (
        <svg {...commonProps}>
          <path d="M12.5 3.5v9.2" {...strokeProps} />
          <path d="M12.5 5.2 16 4.3" {...strokeProps} />
          <ellipse cx="9.8" cy="13.6" rx="2.7" ry="2" {...strokeProps} />
        </svg>
      );
    case "Hip-Hop":
      return (
        <svg {...commonProps}>
          <rect x="7" y="3" width="6" height="9" rx="3" {...strokeProps} />
          <path d="M5 9.5a5 5 0 0 0 10 0M10 14.5V17M7.5 17h5" {...strokeProps} />
        </svg>
      );
    case "Sports":
      return (
        <svg {...commonProps}>
          <path d="M6 3h8v3.5c0 3-1.6 5.2-4 5.2S6 9.5 6 6.5V3Z" {...strokeProps} />
          <path d="M6 5H3.5c0 2.6 1.2 4 3.2 4M14 5h2.5c0 2.6-1.2 4-3.2 4M10 11.7V15M7 17h6" {...strokeProps} />
        </svg>
      );
    case "Emotional":
      return (
        <svg {...commonProps}>
          <path d="M10 16.5 4.7 11.4C2.8 9.6 3 6.6 5 5.2c1.7-1.2 3.9-.6 5 1 1.1-1.6 3.3-2.2 5-1 2 1.4 2.2 4.4.3 6.2Z" {...strokeProps} />
        </svg>
      );
    case "Tension":
      return (
        <svg {...commonProps}>
          <path d="M11.5 2.8 5.8 10h4l-1.3 7.2 5.7-7.2h-4Z" {...strokeProps} />
        </svg>
      );
    case "Uplifting":
      return (
        <svg {...commonProps}>
          <circle cx="10" cy="10" r="3.2" {...strokeProps} />
          <path d="M10 2.5V5M10 15v2.5M2.5 10H5M15 10h2.5M4.7 4.7l1.8 1.8M13.5 13.5l1.8 1.8M15.3 4.7l-1.8 1.8M6.5 13.5l-1.8 1.8" {...strokeProps} />
        </svg>
      );
    default:
      return null;
  }
}

function BookmarkGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 3.25h9v13.5L10 14l-4.5 2.75V3.25Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayCountIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M6 4.5 14.5 10 6 15.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function LikeCountIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 16.25 4.45 10.9C2.8 9.3 2.7 6.75 4.2 5.25c1.45-1.45 3.8-1.4 5.2.1L10 6l.6-.65c1.4-1.5 3.75-1.55 5.2-.1 1.5 1.5 1.4 4.05-.25 5.65Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function SongCountIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M4 8v4M7 5.5v9M10 3.5v13M13 6.5v7M16 8v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="square"
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

function getStoredRecentPlaylistIds() {
  if (typeof window === "undefined") return [];

  try {
    const storedValue = window.localStorage.getItem(
      RECENT_COMMUNITY_PLAYLISTS_KEY,
    );
    return storedValue
      ? parseFavoriteIds(JSON.parse(storedValue)).slice(0, 10)
      : [];
  } catch {
    return [];
  }
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

function CommunityPlaylistsLoadingSkeleton() {
  return (
    <section className="community-skeleton-grid-wrap" aria-hidden="true">
      <div className="community-skeleton-grid">
        {Array.from({ length: 10 }, (_, index) => (
          <div className="community-skeleton-card" key={index}>
            <div className="community-skeleton-card-image" />
            <div className="community-skeleton-card-title" />
            <div className="community-skeleton-card-creator">
              <span />
              <i />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function recordCommunityPlaylistPlay(playlistId: number, songId: string) {
  void fetch(
    `/api/community-playlists/${encodeURIComponent(String(playlistId))}/play`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song_id: songId }),
    },
  ).catch((error) => {
    console.warn("Community playlist play tracking failed", error);
  });
}

export default function CommunityPlaylistsPage() {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const playlistPlaybackCacheRef = useRef(new Map<number, Song[]>());
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("All");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>("All");
  const [playlists, setPlaylists] = useState<CommunityPlaylist[]>([]);
  const [rankingSnapshot, setRankingSnapshot] = useState<
    Record<number, CommunityPlaylistRanking>
  >({});
  const [favoritePlaylistIds, setFavoritePlaylistIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [recentFavoritePlaylistIds, setRecentFavoritePlaylistIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [recentPlaylistIds, setRecentPlaylistIds] = useState<number[]>([]);
  const [activePlaybackPlaylistId, setActivePlaybackPlaylistId] = useState<number | null>(null);
  const [loadingPlaybackPlaylistId, setLoadingPlaybackPlaylistId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [communityShelfState, setCommunityShelfState] = useState<
    Record<
      string,
      {
        canScrollPrev: boolean;
        canScrollNext: boolean;
        imageCenterY: number | null;
      }
    >
  >({});
  const playerVisible = !!currentSong;

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

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
          const loadedPlaylists: CommunityPlaylist[] =
            playlistsData?.playlists ?? [];

          setPlaylists(loadedPlaylists);
          setRankingSnapshot(
            loadedPlaylists.reduce<Record<number, CommunityPlaylistRanking>>(
              (snapshot, playlist) => {
                snapshot[playlist.id] = {
                  like_count: playlist.like_count,
                  seven_day_like_count: playlist.seven_day_like_count,
                  play_count: playlist.play_count,
                  published_at: playlist.published_at,
                };
                return snapshot;
              },
              {},
            ),
          );
          setFavoritePlaylistIds(new Set(favoriteIds));
          setRecentFavoritePlaylistIds(new Set(recentFavoriteIds));
        }
      } catch (error) {
        console.warn("Community playlists request failed", error);
        if (!cancelled) {
          setPlaylists([]);
          setRankingSnapshot({});
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

  useEffect(() => {
    function syncRecentPlaylistIds() {
      setRecentPlaylistIds(getStoredRecentPlaylistIds());
    }

    syncRecentPlaylistIds();
    window.addEventListener("focus", syncRecentPlaylistIds);
    window.addEventListener("pageshow", syncRecentPlaylistIds);
    window.addEventListener("storage", syncRecentPlaylistIds);

    return () => {
      window.removeEventListener("focus", syncRecentPlaylistIds);
      window.removeEventListener("pageshow", syncRecentPlaylistIds);
      window.removeEventListener("storage", syncRecentPlaylistIds);
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
      if (selectedCreatorId && playlist.creator.id !== selectedCreatorId) {
        return false;
      }
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

    if (activeTab === "Featured" || activeTab === "Trending") {
      return [...filtered].sort((a, b) => {
        const aRanking = rankingSnapshot[a.id] ?? a;
        const bRanking = rankingSnapshot[b.id] ?? b;
        const recentLikeDifference =
          bRanking.seven_day_like_count - aRanking.seven_day_like_count;
        if (recentLikeDifference !== 0) return recentLikeDifference;

        const playDifference = bRanking.play_count - aRanking.play_count;
        if (playDifference !== 0) return playDifference;

        const publishedDifference =
          getPublishedTime(bRanking.published_at) -
          getPublishedTime(aRanking.published_at);
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
        const aRanking = rankingSnapshot[a.id] ?? a;
        const bRanking = rankingSnapshot[b.id] ?? b;
        const likeDifference = bRanking.like_count - aRanking.like_count;
        if (likeDifference !== 0) return likeDifference;
        return bRanking.play_count - aRanking.play_count;
      });
    }

    return filtered;
  }, [
    activeTab,
    favoritePlaylistIds,
    playlists,
    query,
    rankingSnapshot,
    selectedCategory,
    selectedCreatorId,
  ]);

  const communityShelves = useMemo(() => {
    if (
      activeTab !== "Featured" ||
      selectedCategory !== "All" ||
      selectedCreatorId ||
      query.trim()
    ) {
      return [];
    }

    const trending = [...playlists]
      .sort((a, b) => {
        const aRanking = rankingSnapshot[a.id] ?? a;
        const bRanking = rankingSnapshot[b.id] ?? b;
        const recentLikeDifference =
          bRanking.seven_day_like_count - aRanking.seven_day_like_count;
        if (recentLikeDifference !== 0) return recentLikeDifference;

        const playDifference = bRanking.play_count - aRanking.play_count;
        if (playDifference !== 0) return playDifference;

        const publishedDifference =
          getPublishedTime(bRanking.published_at) -
          getPublishedTime(aRanking.published_at);
        if (publishedDifference !== 0) return publishedDifference;

        return b.id - a.id;
      });

    const recent = [...playlists]
      .sort((a, b) => {
        const publishedDifference =
          getPublishedTime(b.published_at) - getPublishedTime(a.published_at);
        if (publishedDifference !== 0) return publishedDifference;
        return b.id - a.id;
      });

    const mostLiked = [...playlists]
      .sort((a, b) => {
        const aRanking = rankingSnapshot[a.id] ?? a;
        const bRanking = rankingSnapshot[b.id] ?? b;
        const likeDifference = bRanking.like_count - aRanking.like_count;
        if (likeDifference !== 0) return likeDifference;
        return bRanking.play_count - aRanking.play_count;
      });

    return [
      { key: "trending", title: "Trending", playlists: trending },
      { key: "recent", title: "Recently Added", playlists: recent },
      { key: "most-liked", title: "Most Liked", playlists: mostLiked },
    ];
  }, [
    activeTab,
    playlists,
    query,
    rankingSnapshot,
    selectedCategory,
    selectedCreatorId,
  ]);

  const activeFilterLabel = useMemo(() => {
    if (selectedCreatorId) {
      return (
        playlists.find((playlist) => playlist.creator.id === selectedCreatorId)
          ?.creator.name ?? "Creator"
      );
    }

    if (selectedCategory !== "All") return selectedCategory;
    if (activeTab === "Recent") return "Recently Added";
    if (activeTab !== "All") return activeTab;
    if (query.trim()) return "Search Results";
    return null;
  }, [activeTab, playlists, query, selectedCategory, selectedCreatorId]);

  const topContributors = useMemo(() => {
    const contributors = new Map<
      string,
      {
        id: string;
        name: string;
        imageUrl: string | null;
        playlistCount: number;
      }
    >();

    for (const playlist of playlists) {
      const existing = contributors.get(playlist.creator.id);
      if (existing) {
        existing.playlistCount += 1;
        continue;
      }

      contributors.set(playlist.creator.id, {
        id: playlist.creator.id,
        name: playlist.creator.name,
        imageUrl: playlist.creator.imageUrl,
        playlistCount: 1,
      });
    }

    return [...contributors.values()].sort((a, b) => {
      const countDifference = b.playlistCount - a.playlistCount;
      if (countDifference !== 0) return countDifference;
      return a.name.localeCompare(b.name);
    });
  }, [playlists]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const scrollers = document.querySelectorAll<HTMLElement>(
      "[data-community-shelf]",
    );

    scrollers.forEach((scroller) => {
      const shelfKey = scroller.dataset.communityShelf;
      if (!shelfKey) return;

      const visual = scroller.querySelector<HTMLElement>(
        ".community-cover-wrap, .community-contributor-image-frame",
      );

      const updateShelfState = () => {
        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
        const nextState = {
          canScrollPrev: scroller.scrollLeft > 4,
          canScrollNext: scroller.scrollLeft < maxScrollLeft - 4,
          imageCenterY: visual ? visual.getBoundingClientRect().height / 2 : null,
        };

        setCommunityShelfState((current) => {
          const previous = current[shelfKey];
          if (
            previous &&
            previous.canScrollPrev === nextState.canScrollPrev &&
            previous.canScrollNext === nextState.canScrollNext &&
            previous.imageCenterY === nextState.imageCenterY
          ) {
            return current;
          }

          return { ...current, [shelfKey]: nextState };
        });
      };

      updateShelfState();
      scroller.addEventListener("scroll", updateShelfState, { passive: true });
      window.addEventListener("resize", updateShelfState);

      const resizeObserver = visual ? new ResizeObserver(updateShelfState) : null;
      if (visual && resizeObserver) resizeObserver.observe(visual);

      cleanups.push(() => {
        scroller.removeEventListener("scroll", updateShelfState);
        window.removeEventListener("resize", updateShelfState);
        resizeObserver?.disconnect();
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [communityShelves, topContributors]);

  const recentPlaylists = useMemo(
    () =>
      recentPlaylistIds
        .map((playlistId) =>
          playlists.find((playlist) => playlist.id === playlistId),
        )
        .filter(
          (playlist): playlist is CommunityPlaylist => Boolean(playlist),
        )
        .slice(0, 10),
    [playlists, recentPlaylistIds],
  );

  async function togglePlaylistFavorite(playlistId: number) {
    if (pendingFavoriteIds.has(playlistId)) return;

    const playlistName =
      playlists.find((playlist) => playlist.id === playlistId)?.name || "Playlist";
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

      showToast(
        wasFavorite
          ? `"${playlistName}" removed from favorites`
          : `"${playlistName}" added to favorites`,
      );
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
      showToast(
        error instanceof Error
          ? error.message
          : "Could not update favorite playlist",
      );
    } finally {
      setPendingFavoriteIds((current) => {
        const next = new Set(current);
        next.delete(playlistId);
        return next;
      });
    }
  }

  async function togglePlaylistPlayback(playlist: CommunityPlaylist) {
    if (loadingPlaybackPlaylistId === playlist.id) return;

    const cachedSongs = playlistPlaybackCacheRef.current.get(playlist.id) ?? [];
    const currentSongBelongsToPlaylist = Boolean(
      currentSong && cachedSongs.some((song) => song.id === currentSong.id),
    );

    if (
      activePlaybackPlaylistId === playlist.id &&
      currentSongBelongsToPlaylist &&
      currentSong
    ) {
      togglePlayPause(currentSong);
      return;
    }

    setLoadingPlaybackPlaylistId(playlist.id);

    try {
      let songs = playlistPlaybackCacheRef.current.get(playlist.id);

      if (!songs) {
        const response = await fetch(
          `/api/community-playlists/${encodeURIComponent(String(playlist.id))}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as CommunityPlaylistPlaybackResponse;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load community playlist");
        }

        songs = Array.isArray(data?.songs) ? data.songs : [];
        playlistPlaybackCacheRef.current.set(playlist.id, songs);
      }

      const playableSongs = songs.filter((song) => Boolean(song.audioUrl));
      const firstSong = playableSongs[0];
      if (!firstSong) return;

      setQueue(playableSongs);
      setActivePlaybackPlaylistId(playlist.id);
      recordCommunityPlaylistPlay(playlist.id, firstSong.id);
      togglePlayPause(firstSong);
    } catch (error) {
      console.warn("Community playlist card playback failed", error);
    } finally {
      setLoadingPlaybackPlaylistId(null);
    }
  }

  function scrollCommunityShelf(shelfKey: string, direction: -1 | 1) {
    const shelf = document.querySelector<HTMLElement>(
      `[data-community-shelf="${shelfKey}"]`,
    );
    if (!shelf) return;

    const amount = Math.max(shelf.clientWidth * 0.82, 320);

    shelf.scrollBy({
      left: amount * direction,
      behavior: "smooth",
    });
  }

  function showFeaturedView() {
    setActiveTab("Featured");
    setSelectedCategory("All");
    setSelectedCreatorId(null);
    setQuery("");
  }

  function showAllView() {
    setActiveTab("All");
    setSelectedCategory("All");
    setSelectedCreatorId(null);
    setQuery("");
  }

  function filterByCreator(creator: CommunityPlaylist["creator"]) {
    setSelectedCreatorId(creator.id);
  }

  function clearCommunitySearch() {
    setQuery("");
  }

  function clearCommunityFilters() {
    showAllView();
  }

  function renderPlaylistCard(playlist: CommunityPlaylist) {
    const isFavorite = favoritePlaylistIds.has(playlist.id);
    const isPending = pendingFavoriteIds.has(playlist.id);
    const cachedPlaylistSongs =
      playlistPlaybackCacheRef.current.get(playlist.id) ?? [];
    const isCurrentPlaylist = Boolean(
      activePlaybackPlaylistId === playlist.id &&
        currentSong &&
        cachedPlaylistSongs.some((song) => song.id === currentSong.id),
    );
    const isPlaylistPlaying = isCurrentPlaylist && isPlaying;
    const isPlaylistLoading = loadingPlaybackPlaylistId === playlist.id;

    return (
      <article className="community-card" key={playlist.id}>
        <div
          className="community-cover-wrap"
          style={{ borderRadius: "6px" }}
        >
          <Link
            className="community-cover-link"
            href={`/community-playlists/${playlist.id}`}
            aria-label={`Open ${playlist.name}`}
          >
            {playlist.cover_image_url && (
              <img className="community-cover" src={playlist.cover_image_url} alt="" />
            )}
          </Link>
          <button
            className={`community-like${isFavorite ? " is-liked" : ""}`}
            type="button"
            aria-label={`${isFavorite ? "Remove from saved" : "Save"}: ${playlist.name}`}
            aria-pressed={isFavorite}
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              void togglePlaylistFavorite(playlist.id);
            }}
          >
            <BookmarkGlyph filled={isFavorite} />
          </button>
          <button
            className="community-play"
            type="button"
            aria-label={`${isPlaylistPlaying ? "Pause" : "Play"} ${playlist.name}`}
            aria-pressed={isPlaylistPlaying}
            aria-busy={isPlaylistLoading}
            data-playlist-playing={isPlaylistPlaying ? "true" : "false"}
            disabled={isPlaylistLoading}
            onClick={(event) => {
              event.stopPropagation();
              void togglePlaylistPlayback(playlist);
            }}
          >
            {isPlaylistPlaying ? (
              <PauseIcon size={18} />
            ) : (
              <PlayIconSmall size={18} />
            )}
          </button>
          <div
            className="community-card-count-overlay"
            aria-label="Playlist engagement"
          >
            <span
              className="community-engagement-item"
              title={`${playlist.play_count} plays`}
            >
              <PlayCountIcon />
              <span>{formatCompactCount(playlist.play_count)}</span>
            </span>
            <span
              className="community-engagement-item"
              title={`${playlist.like_count} likes`}
            >
              <LikeCountIcon />
              <span>{formatCompactCount(playlist.like_count)}</span>
            </span>
            <span
              className="community-engagement-item"
              title={`${playlist.song_count} songs`}
            >
              <SongCountIcon />
              <span>{formatCompactCount(playlist.song_count)}</span>
            </span>
          </div>
        </div>
        <div className="community-card-title-row">
          <h2>
            <Link
              className="community-title-link"
              href={`/community-playlists/${playlist.id}`}
            >
              {playlist.name}
            </Link>
          </h2>
        </div>
        <div className="community-card-meta">
          <button
            type="button"
            className={`community-card-creator${selectedCreatorId === playlist.creator.id ? " is-active" : ""}`}
            aria-pressed={selectedCreatorId === playlist.creator.id}
            onClick={() => filterByCreator(playlist.creator)}
          >
            {playlist.creator.imageUrl ? (
              <img
                className="community-card-creator-meta-avatar"
                src={playlist.creator.imageUrl}
                alt=""
              />
            ) : (
              <span
                className="community-card-creator-meta-avatar community-card-creator-meta-avatar-placeholder"
                aria-hidden="true"
              />
            )}
            <span className="community-card-creator-meta-name">
              {playlist.creator.name}
            </span>
          </button>
        </div>
      </article>
    );
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
          grid-template-columns: 0 minmax(0, 1fr);
          grid-template-rows: var(--filmwave-header-height, 75px) minmax(0, 1fr);
          overflow: hidden;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: grid-template-columns 180ms ease;
        }

        .community-page.is-sidebar-open {
          grid-template-columns: 248px minmax(0, 1fr);
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

        .community-heading-row {
          display: flex;
          height: 36px;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .community-heading-row > .community-title-style-scope {
          flex: 0 0 320px;
          min-width: 0;
        }

        .community-sidebar-search {
          margin-bottom: 24px;
        }

        .community-sidebar-search > .filmwave-header-search-wrap {
          width: 100% !important;
          margin-left: 0 !important;
        }

        .community-sidebar-search > .filmwave-header-search-wrap .filmwave-header-search  {
          width: 100% !important;
        }

        .community-sidebar-search > .filmwave-header-search-wrap .filmwave-header-search-base {
          min-height: 32px !important;
          height: 32px !important;
          border-radius: 10px !important;
        }

        .community-sidebar-search > .filmwave-header-search-wrap .filmwave-header-search-lead {
          width: 28px !important;
          margin-left: 6px !important;
        }

        .community-sidebar-search > .filmwave-header-search-wrap .filmwave-header-search-input {
          font-size: 10px !important;
        }

        .community-sidebar-search > .filmwave-header-search-wrap .filmwave-header-search-icon {
          width: 16px !important;
          height: 16px !important;
        }

        .community-sidebar-search > .filmwave-header-search-wrap .filmwave-header-search-clear {
          width: 24px !important;
          height: 24px !important;
          margin-right: 4px !important;
        }

        .community-sidebar-search > .filmwave-header-search-wrap .filmwave-header-search-clear svg {
          width: 12px !important;
          height: 12px !important;
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
          color: #fff !important;
          font-family: var(--font-aktiv-grotesk), sans-serif !important;
          font-size: 14px !important;
          font-weight: 400 !important;
          font-kerning: normal !important;
          letter-spacing: 0 !important;
          line-height: 1.1 !important;
          text-transform: none !important;
        }

        :where(html.light, html[data-theme="light"]) .community-sidebar-heading {
          color: var(--text-primary) !important;
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

        .community-jump-back {
          margin-top: 14px;
        }

        .community-jump-back-heading {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 500;
          line-height: 1.2;
          letter-spacing: -0.035em;
        }

        .community-jump-back .recent-playlist-card-list {
          margin-top: 16px;
        }

        .community-cover-link {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .community-title-link {
          color: inherit;
          text-decoration: none;
          transition: opacity 150ms ease;
        }

        .community-title-link:hover,
        .community-title-link:focus-visible {
          opacity: 0.62;
          outline: none;
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
          opacity: 0.6;
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
          position: absolute;
          top: 10px;
          right: 10px;
          left: auto;
          z-index: 5;
          grid-column: auto;
          grid-row: auto;
          color: #fff;
          transition: transform 150ms ease, opacity 150ms ease;
        }

        .community-like:hover,
        .community-like:focus-visible {
          transform: scale(1.08);
          outline: none;
        }

        .community-like:disabled {
          cursor: default;
        }

        .community-card-title-row {
          grid-template-columns: minmax(0, 1fr) 24px;
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

      <main
        className={`community-page${sidebarOpen ? " is-sidebar-open" : ""}${playerVisible ? " is-player-visible" : ""}`}
      >
        <div
          className={`community-searchbar-row${sidebarOpen ? " is-filters-open" : ""}`}
        >
          <button
            type="button"
            className="community-searchbar-filter-button"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span className="community-searchbar-filter-icon" aria-hidden="true">
              <svg
                className="community-searchbar-filter-open-icon"
                viewBox="0 0 24 24"
              >
                <path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" />
              </svg>
              <XIcon
                className="community-searchbar-filter-close-icon"
                size={22}
              />
            </span>
            <span>Filters</span>
          </button>

          <div className="community-searchbar-search">
            <label className="audioflume-home-reference-searchbar-field">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder="Search playlists or creators"
                aria-label="Search community playlists"
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  className="audioflume-home-reference-searchbar-clear"
                  onClick={clearCommunitySearch}
                  aria-label="Clear community playlist search"
                >
                  <XIcon size={8} />
                </button>
              ) : null}
            </label>
          </div>

          <div
            className="community-tabs community-searchbar-tabs"
            role="tablist"
            aria-label="Community playlist sorting"
          >
            {COMMUNITY_TABS.map((tab) => (
              <button
                type="button"
                role="tab"
                key={tab}
                className={`community-feed-tab${activeTab === tab ? " is-active" : ""}`}
                aria-selected={activeTab === tab}
                onClick={() => {
                  if (tab === "All") {
                    showAllView();
                    return;
                  }
                  setActiveTab(tab);
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <aside
          className="community-sidebar"
          aria-label="Community playlist discovery"
          aria-hidden={!sidebarOpen}
        >
          <section className="community-sidebar-section community-categories">
            <nav aria-label="Community playlist categories">
              <button
                type="button"
                className={`fw-filter-rail-item${selectedCategory === "All" && activeTab === "All" ? " is-active" : ""}`}
                aria-pressed={selectedCategory === "All" && activeTab === "All"}
                onClick={showAllView}
              >
                <span className="fw-filter-rail-label">All</span>
                <span className="community-category-count">{playlists.length}</span>
                <span className="community-filter-rail-chevron" aria-hidden="true">
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
                  <span className="community-category-icon" aria-hidden="true">
                    <CommunityCategoryIcon category={category} />
                  </span>
                  <span className="fw-filter-rail-label">{category}</span>
                  <span className="community-category-count">
                    {categoryCounts.get(category) ?? 0}
                  </span>
                  <span className="community-filter-rail-chevron" aria-hidden="true">
                    <FilterRailChevron />
                  </span>
                </button>
              ))}
            </nav>
          </section>

        </aside>

        <section className="community-content">

          {recentPlaylists.length > 0 && (
            <section
              className="community-jump-back"
              aria-label="Jump Back In"
            >
              <RecentPlaylistCards
                playlists={recentPlaylists.slice(0, 4).map((playlist) => ({
                  key: `community:${playlist.id}`,
                  href: `/community-playlists/${playlist.id}`,
                  name: playlist.name,
                  coverImageUrl: playlist.cover_image_url,
                  metadata: `${playlist.creator.name} · ${playlist.song_count} songs`,
                }))}
              />
            </section>
          )}

          {loading ? (
            <CommunityPlaylistsLoadingSkeleton />
          ) : communityShelves.length > 0 ? (
            <div className="community-shelves" id="community-grid">
              {communityShelves.map((shelf) => (
                <section className="community-shelf" key={shelf.key}>
                  <div className="community-shelf-heading-row">
                    <h2>{shelf.title}</h2>
                  </div>
                  <div className="community-shelf-viewport">
                    {communityShelfState[shelf.key]?.imageCenterY !== null && (
                      <>
                        <button
                          type="button"
                          className="community-shelf-arrow is-left"
                          aria-label={`Scroll ${shelf.title} left`}
                          disabled={!communityShelfState[shelf.key]?.canScrollPrev}
                          style={{
                            top:
                              communityShelfState[shelf.key]?.imageCenterY ??
                              undefined,
                          }}
                          onClick={() => scrollCommunityShelf(shelf.key, -1)}
                        >
                          <ChevronLeftIcon size={18} />
                        </button>
                        <button
                          type="button"
                          className="community-shelf-arrow is-right"
                          aria-label={`Scroll ${shelf.title} right`}
                          disabled={!communityShelfState[shelf.key]?.canScrollNext}
                          style={{
                            top:
                              communityShelfState[shelf.key]?.imageCenterY ??
                              undefined,
                          }}
                          onClick={() => scrollCommunityShelf(shelf.key, 1)}
                        >
                          <ChevronRightIcon size={18} />
                        </button>
                      </>
                    )}
                    <div
                      className="community-shelf-row"
                      data-community-shelf={shelf.key}
                    >
                      {shelf.playlists.map((playlist) =>
                        renderPlaylistCard(playlist),
                      )}
                    </div>
                  </div>
                </section>
              ))}

              {topContributors.length > 0 && (
                <section className="community-shelf community-contributor-shelf">
                  <div className="community-shelf-heading-row">
                    <h2>Top Contributors</h2>
                  </div>
                  <div className="community-shelf-viewport community-contributor-viewport">
                    {communityShelfState.contributors?.imageCenterY !== null && (
                      <>
                        <button
                          type="button"
                          className="community-shelf-arrow is-left"
                          aria-label="Scroll Top Contributors left"
                          disabled={!communityShelfState.contributors?.canScrollPrev}
                          style={{
                            top:
                              communityShelfState.contributors?.imageCenterY ??
                              undefined,
                          }}
                          onClick={() => scrollCommunityShelf("contributors", -1)}
                        >
                          <ChevronLeftIcon size={18} />
                        </button>
                        <button
                          type="button"
                          className="community-shelf-arrow is-right"
                          aria-label="Scroll Top Contributors right"
                          disabled={!communityShelfState.contributors?.canScrollNext}
                          style={{
                            top:
                              communityShelfState.contributors?.imageCenterY ??
                              undefined,
                          }}
                          onClick={() => scrollCommunityShelf("contributors", 1)}
                        >
                          <ChevronRightIcon size={18} />
                        </button>
                      </>
                    )}
                    <div
                      className="community-contributor-row"
                      data-community-shelf="contributors"
                    >
                      {topContributors.map((contributor) => (
                        <button
                          type="button"
                          className="community-contributor-card"
                          key={contributor.id}
                          onClick={() =>
                            filterByCreator({
                              id: contributor.id,
                              name: contributor.name,
                              imageUrl: contributor.imageUrl,
                            })
                          }
                        >
                          <span className="community-contributor-image-frame">
                            {contributor.imageUrl ? (
                              <img
                                className="community-contributor-image"
                                src={contributor.imageUrl}
                                alt=""
                              />
                            ) : (
                              <span
                                className="community-contributor-image community-contributor-image-placeholder"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          <span className="community-contributor-name">
                            {contributor.name}
                          </span>
                          <span className="community-contributor-count">
                            {contributor.playlistCount} {contributor.playlistCount === 1 ? "playlist" : "playlists"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          ) : (
            <section className="community-filtered-section">
              {activeFilterLabel ? (
                <div className="community-filtered-section-heading">
                  <button
                    type="button"
                    className="community-filter-pill"
                    onClick={clearCommunityFilters}
                    aria-label={`Clear ${activeFilterLabel} filter`}
                  >
                    <span>{activeFilterLabel}</span>
                    <XIcon size={13} />
                  </button>
                </div>
              ) : null}
              <div className="community-grid" id="community-grid">
                {filteredPlaylists.length === 0 && (
                  <div className="community-empty-state">{getEmptyStateMessage()}</div>
                )}

                {filteredPlaylists.map((playlist) =>
                  renderPlaylistCard(playlist),
                )}
              </div>
            </section>
          )}

          <div className="community-footer-wrap">
            <Footer playerPadding={false} />
          </div>
        </section>
      </main>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "88px" : "24px"}
      />
    </>
  );
}
