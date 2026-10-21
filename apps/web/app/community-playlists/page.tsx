"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MusicLibrarySortControl } from "@filmwave/shared";
import { usePlayer } from "@/context/PlayerContext";
import Footer from "@/components/Footer";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
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
import "@/components/curated/curated-browse-filters.css";
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

const COMMUNITY_SORT_OPTIONS = COMMUNITY_TABS.map((value) => ({
  value,
  label: value,
}));

const COMMUNITY_FEATURE_BANNER_IMAGE =
  "https://images.filmwave.io/images/community-playlists/nik-shuliahin-Lg_oC6gDCjU-unsplash.jpg";

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
  const communityContentRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
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

  const selectedCreator = useMemo(
    () =>
      selectedCreatorId
        ? playlists.find((playlist) => playlist.creator.id === selectedCreatorId)
            ?.creator ?? null
        : null,
    [playlists, selectedCreatorId],
  );

  const activeFilterLabel = useMemo(() => {
    if (selectedCreator) return selectedCreator.name;
    if (selectedCategory !== "All") return selectedCategory;
    if (activeTab === "Recent") return "Recently Added";
    if (activeTab !== "All") return activeTab;
    if (query.trim()) return "Search Results";
    return null;
  }, [activeTab, query, selectedCategory, selectedCreator]);

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
    setActiveTab("All");
    setSelectedCategory("All");
    setFilterMenuOpen(false);
    setSelectedCreatorId(creator.id);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function clearCommunitySearch() {
    setQuery("");
  }

  function clearCommunityFilters() {
    showAllView();
  }

  const filterIsActive =
    filterMenuOpen || selectedCategory !== "All";
  const communitySubfiltersOpen =
    filterIsActive || Boolean(selectedCreator);

  const communityMainFilters: CommunityTab[] = [
    "Trending",
    "Recent",
    "Most Liked",
    "Favorites",
  ];

  const showAllBanner =
    activeTab === "All" &&
    selectedCategory === "All" &&
    !selectedCreatorId &&
    !query.trim();

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
        <div className="community-cover-wrap">
          <Link
            className="community-cover-link"
            href={`/community-playlists/${playlist.id}`}
            aria-label={`Open ${playlist.name}`}
          >
            {playlist.cover_image_url ? (
              <img
                className="community-cover"
                src={playlist.cover_image_url}
                alt=""
              />
            ) : (
              <span className="community-cover-placeholder" aria-hidden="true" />
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

        <div className="community-card-details">
          <div className="community-card-copy">
            <Link
              className="community-title-link"
              href={`/community-playlists/${playlist.id}`}
            >
              <h2>{playlist.name}</h2>
            </Link>

            <button
              type="button"
              className={`community-card-creator${
                selectedCreatorId === playlist.creator.id ? " is-active" : ""
              }`}
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
    <main className="community-playlists-page-root">
      <GlobalSearchBar layer="high" />

      <section className="community-playlists-page-layer">
        <div className="community-playlists-page-inner">
          {!loading && playlists.length > 0 && (
            <div className="discover-mood-browser curated-page-pill-browser community-page-pill-browser">
              <p className="discover-category-description">
                A growing collection of playlists made by the community, built
                around moods, genres, scenes, and whatever inspires you.
              </p>

              <div
                className="discover-mood-pill-list"
                role="group"
                aria-label="Community playlist filters"
              >
                <button
                  type="button"
                  className={`curated-main-filter-pill community-main-filter-pill${
                    filterIsActive ? " is-active" : ""
                  }`}
                  aria-pressed={filterIsActive}
                  onClick={() => {
                    if (filterIsActive) {
                      setFilterMenuOpen(false);
                      setSelectedCategory("All");
                    } else {
                      setActiveTab("All");
                      setFilterMenuOpen(true);
                    }
                  }}
                >
                  <svg
                    className="community-filter-pill-icon"
                    viewBox="0 0 18 18"
                    aria-hidden="true"
                  >
                    <path d="M3 5h12M3 9h12M3 13h12" />
                  </svg>
                  <span>Filter</span>
                </button>

                {communityMainFilters.map((tab) => {
                  const isActive = activeTab === tab;

                  return (
                    <button
                      key={tab}
                      type="button"
                      className={`curated-main-filter-pill${
                        isActive ? " is-active" : ""
                      }`}
                      aria-pressed={isActive}
                      onClick={() => {
                        setActiveTab(isActive ? "All" : tab);
                        setFilterMenuOpen(false);
                        setSelectedCategory("All");
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              <div
                className={`curated-page-subfilter-reveal${
                  communitySubfiltersOpen ? " is-open" : ""
                }`}
              >
                <div className="curated-page-subfilter-reveal-inner">
                  <div
                    className="discover-mood-pill-list curated-page-subfilter-list community-page-subfilter-list"
                    role="group"
                    aria-label="Community playlist subfilters"
                  >
                    {selectedCreator ? (
                      <button
                        type="button"
                        className="discover-category-filter-pill curated-subfilter-pill community-creator-filter-pill is-active"
                        onClick={() => setSelectedCreatorId(null)}
                        aria-label={`Clear ${selectedCreator.name} filter`}
                      >
                        {selectedCreator.imageUrl ? (
                          <img
                            className="community-creator-filter-avatar"
                            src={selectedCreator.imageUrl}
                            alt=""
                          />
                        ) : (
                          <span
                            className="community-creator-filter-avatar community-creator-filter-avatar-placeholder"
                            aria-hidden="true"
                          />
                        )}
                        <span>{selectedCreator.name}</span>
                        <XIcon size={11} />
                      </button>
                    ) : filterIsActive ? (
                      <>
                        <button
                          type="button"
                          className={`discover-category-filter-pill curated-subfilter-pill${
                            selectedCategory === "All" ? " is-active" : ""
                          }`}
                          aria-pressed={selectedCategory === "All"}
                          onClick={() => setSelectedCategory("All")}
                        >
                          All
                        </button>

                        {COMMUNITY_PLAYLIST_CATEGORIES.map((category) => {
                          const isActive = selectedCategory === category;

                          return (
                            <button
                              type="button"
                              key={category}
                              className={`discover-category-filter-pill curated-subfilter-pill${
                                isActive ? " is-active" : ""
                              }`}
                              aria-pressed={isActive}
                              onClick={() =>
                                setSelectedCategory(isActive ? "All" : category)
                              }
                            >
                              {category}
                            </button>
                          );
                        })}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <CommunityPlaylistsLoadingSkeleton />
          ) : filteredPlaylists.length > 0 ? (
            <section className="community-page-grid-group">
              <div className="community-page-playlist-grid" id="community-grid">
                {filteredPlaylists.map((playlist) =>
                  renderPlaylistCard(playlist),
                )}
              </div>
            </section>
          ) : (
            <div className="community-page-empty-state">
              {getEmptyStateMessage()}
            </div>
          )}

          {!loading && playlists.length > 0 && (
            <section className="community-page-reference-search">
              <div className="community-page-reference-search-heading">
                <span>Search by song</span>
              </div>
              <div className="community-page-reference-search-card">
                <GlobalReferenceSearch embedded />
              </div>
            </section>
          )}
        </div>
      </section>

      <Footer />

      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </main>
  );
}
