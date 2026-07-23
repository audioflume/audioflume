"use client";

import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import ShuffleIconSmall from "@/components/icons/ShuffleIconSmall";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
  quickFilterButtonActiveClass,
  quickFilterButtonClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { CommunityPlaylistCategory } from "@/lib/communityPlaylistCategories";
import type { Song } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const RECENT_COMMUNITY_PLAYLISTS_KEY =
  "filmwave-recent-community-playlists";

const QUICK_FILTERS = [
  { label: "Default", value: "default" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

type QuickFilterValue = (typeof QUICK_FILTERS)[number]["value"];

type CommunityPlaylistDetail = {
  id: number;
  name: string;
  cover_image_url: string | null;
  published_at: string | null;
  primary_category: CommunityPlaylistCategory | null;
  secondary_categories: CommunityPlaylistCategory[];
  song_count: number;
  play_count: number;
  like_count: number;
  creator: {
    name: string;
    imageUrl: string | null;
  };
};

type CommunityPlaylistSong = Song & {
  position: number;
};

type CommunityPlaylistDetailResponse = {
  playlist: CommunityPlaylistDetail;
  songs: CommunityPlaylistSong[];
};

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5L8 12L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlaylistDetailSkeleton() {
  return (
    <>
      <section className="community-detail-hero community-detail-skeleton-hero">
        <div className="community-detail-cover community-detail-skeleton-cover skeleton-block" />
        <div className="min-w-0">
          <div className="community-detail-skeleton-kicker skeleton-block" />
          <div className="community-detail-skeleton-title skeleton-block" />
          <div className="community-detail-skeleton-meta">
            <div className="community-detail-skeleton-meta-line skeleton-block" />
            <div className="community-detail-skeleton-meta-line short skeleton-block" />
          </div>
          <div className="community-detail-actions">
            <div className="community-detail-skeleton-button skeleton-block" />
            <div className="community-detail-skeleton-button secondary skeleton-block" />
          </div>
        </div>
      </section>
      <section className="community-detail-section">
        <SkeletonSongList />
      </section>
    </>
  );
}

function parseRecentPlaylistIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((playlistId) => Number(playlistId))
    .filter((playlistId) => Number.isInteger(playlistId) && playlistId > 0);
}

function getStoredRecentPlaylistIds() {
  try {
    const storedValue = window.localStorage.getItem(
      RECENT_COMMUNITY_PLAYLISTS_KEY,
    );
    return storedValue
      ? parseRecentPlaylistIds(JSON.parse(storedValue))
      : [];
  } catch {
    return [];
  }
}

function storeRecentPlaylist(playlistId: number) {
  const nextPlaylistIds = [
    playlistId,
    ...getStoredRecentPlaylistIds().filter(
      (storedPlaylistId) => storedPlaylistId !== playlistId,
    ),
  ].slice(0, 5);

  try {
    window.localStorage.setItem(
      RECENT_COMMUNITY_PLAYLISTS_KEY,
      JSON.stringify(nextPlaylistIds),
    );
  } catch {
    // Browsing the playlist should still work if storage is unavailable.
  }
}

function removeRecentPlaylist(playlistId: number) {
  try {
    const nextPlaylistIds = getStoredRecentPlaylistIds().filter(
      (storedPlaylistId) => storedPlaylistId !== playlistId,
    );
    window.localStorage.setItem(
      RECENT_COMMUNITY_PLAYLISTS_KEY,
      JSON.stringify(nextPlaylistIds),
    );
  } catch {
    // Ignore storage failures while handling an unavailable playlist.
  }
}

function getTopGenres(songs: CommunityPlaylistSong[]) {
  const counts = new Map<string, number>();

  for (const song of songs) {
    for (const genre of song.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([genre]) => genre);
}

function formatSongCount(count: number) {
  return `${count} song${count === 1 ? "" : "s"}`;
}

function shuffleSongList<T>(songs: T[]) {
  if (songs.length < 2) return [...songs];

  const shuffled = [...songs];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

export default function CommunityPlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentSong, setQueue } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { showEditPointMarkers, setShowEditPointMarkers } =
    useUserPreferences();

  const playlistId = String(params.playlistId || "");
  const playerVisible = Boolean(currentSong);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [playlist, setPlaylist] = useState<CommunityPlaylistDetail | null>(null);
  const [songs, setSongs] = useState<CommunityPlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] =
    useState<QuickFilterValue>("default");
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const shuffleActive = shuffleOrderIds !== null;

  useEffect(() => {
    let cancelled = false;

    async function loadPlaylist() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/community-playlists/${encodeURIComponent(playlistId)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as
          | CommunityPlaylistDetailResponse
          | { error?: string };

        if (!response.ok) {
          if (response.status === 404) {
            removeRecentPlaylist(Number(playlistId));
          }
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Failed to load community playlist",
          );
        }

        if (
          !("playlist" in data) ||
          !("songs" in data) ||
          !Array.isArray(data.songs)
        ) {
          throw new Error("Invalid community playlist response");
        }

        if (!cancelled) {
          setPlaylist(data.playlist);
          setSongs(data.songs);
          storeRecentPlaylist(data.playlist.id);
        }
      } catch (loadError) {
        if (!cancelled) {
          setPlaylist(null);
          setSongs([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load community playlist",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (playlistId) void loadPlaylist();
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  const searchedSongs = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    if (!cleanSearch) return songs;

    return songs.filter((song) =>
      [
        song.title,
        song.artist,
        song.key,
        ...song.genres,
        ...song.moods,
        ...song.instruments,
        ...song.builds,
        ...song.vocals,
      ]
        .join(" ")
        .toLowerCase()
        .includes(cleanSearch),
    );
  }, [search, songs]);

  const filteredSongs = useMemo(() => {
    let nextSongs = [...searchedSongs];

    if (quickFilter === "liked") {
      nextSongs = nextSongs.filter((song) => favoriteIdSet.has(song.id));
    } else if (quickFilter === "alphabetical") {
      nextSongs.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
    } else {
      nextSongs.sort((a, b) => a.position - b.position);
    }

    if (!shuffleOrderIds) return nextSongs;

    const orderById = new Map(
      shuffleOrderIds.map((songId, index) => [songId, index]),
    );
    return [...nextSongs].sort((a, b) => {
      const aOrder = orderById.get(a.id);
      const bOrder = orderById.get(b.id);
      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;
      return aOrder - bOrder;
    });
  }, [favoriteIdSet, quickFilter, searchedSongs, shuffleOrderIds]);

  const topGenres = useMemo(() => getTopGenres(songs), [songs]);
  const categories = playlist
    ? [
        ...(playlist.primary_category ? [playlist.primary_category] : []),
        ...playlist.secondary_categories,
      ]
    : [];

  useEffect(() => {
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  useEffect(() => {
    setShuffleOrderIds(null);
  }, [quickFilter, search]);

  function playFirstSong() {
    const firstSongButton = document.querySelector<HTMLButtonElement>(
      '[aria-label="Play song"], [aria-label="Pause song"]',
    );
    firstSongButton?.click();
  }

  function shufflePlaylist() {
    if (filteredSongs.length < 2) return;

    const shuffledSongs = shuffleSongList(filteredSongs);
    setShuffleOrderIds(shuffledSongs.map((song) => song.id));
    setQueue(shuffledSongs.filter((song) => song.audioUrl));
  }

  return (
    <>
      <style>{`
        .community-detail-page {
          margin-left: var(--sidebar-width);
          margin-top: 56px;
          min-height: calc(100vh - 56px);
          overflow-x: clip;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: margin-left 0.2s ease;
        }

        .community-detail-shell {
          position: relative;
          padding: 0 28px;
        }

        .community-detail-top-actions {
          display: flex;
          min-height: 32px;
          align-items: center;
          padding-top: 24px;
        }

        .community-detail-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          padding: 0;
          color: var(--text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          transition: color 150ms ease;
        }

        .community-detail-back:hover,
        .community-detail-back:focus-visible {
          color: var(--text-primary);
          outline: none;
        }

        .community-detail-hero {
          display: grid;
          grid-template-columns: 162px minmax(0, 1fr);
          align-items: stretch;
          gap: 32px;
          padding: 36px 0 30px;
        }

        .community-detail-cover {
          position: relative;
          min-height: 162px;
          overflow: hidden;
          border-radius: 18px;
          background: var(--bg-secondary);
        }

        .community-detail-cover img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .community-detail-kicker {
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .community-detail-title {
          max-width: 680px;
          margin: 8px 0 0;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk);
          font-size: 56px;
          font-weight: 500;
          line-height: 0.94;
          letter-spacing: -0.055em;
        }

        .community-detail-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          color: var(--text-secondary);
          font-size: 11px;
        }

        .community-detail-creator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .community-detail-creator img,
        .community-detail-creator-placeholder {
          display: block;
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          border-radius: 50%;
          object-fit: cover;
          background: var(--bg-elevated);
        }

        .community-detail-dot {
          color: var(--text-muted);
        }

        .community-detail-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
        }

        .community-detail-search-sticky {
          position: sticky;
          top: 55px;
          z-index: 90;
          margin-right: -28px;
          margin-left: -28px;
          background: var(--bg-primary);
        }

        .community-detail-search-row {
          display: flex;
          min-height: 49px;
          align-items: center;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 0 28px;
          cursor: text;
        }

        .community-detail-search-inner {
          display: flex;
          width: 320px;
          align-items: center;
          gap: 8px;
          padding: 12px 16px 12px 0;
        }

        .community-detail-search-input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 15px;
          font-weight: 300;
        }

        .community-detail-search-input::placeholder {
          color: var(--text-muted);
        }

        .community-detail-quick-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-right: -28px;
          margin-left: -28px;
          padding: 16px 28px;
          background: var(--bg-primary);
        }

        .community-detail-section {
          margin-right: -28px;
          margin-left: -28px;
        }

        .community-detail-empty {
          display: flex;
          min-height: 280px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          text-align: center;
        }

        .community-detail-empty h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
        }

        .community-detail-empty p {
          max-width: 340px;
          margin: 6px 0 0;
          font-size: 12px;
          line-height: 1.6;
        }

        .community-detail-skeleton-cover {
          background: var(--bg-elevated);
        }

        .community-detail-skeleton-kicker {
          width: 82px;
          height: 8px;
          margin-top: 2px;
        }

        .community-detail-skeleton-title {
          width: min(420px, 72%);
          height: 52px;
          margin-top: 13px;
        }

        .community-detail-skeleton-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
        }

        .community-detail-skeleton-meta-line {
          width: 72px;
          height: 8px;
        }

        .community-detail-skeleton-meta-line.short {
          width: 140px;
        }

        .community-detail-skeleton-button {
          width: 70px;
          height: 36px;
          border-radius: 999px;
        }

        .community-detail-skeleton-button.secondary {
          width: 92px;
        }

        @media (max-width: 760px) {
          .community-detail-page {
            margin-left: 0;
          }

          .community-detail-shell {
            padding: 0 18px;
          }

          .community-detail-hero {
            grid-template-columns: minmax(0, 1fr);
            gap: 0;
          }

          .community-detail-cover {
            display: none;
          }

          .community-detail-title {
            font-size: 42px;
          }

          .community-detail-search-sticky,
          .community-detail-quick-row,
          .community-detail-section {
            margin-right: -18px;
            margin-left: -18px;
          }

          .community-detail-search-row,
          .community-detail-quick-row {
            padding-right: 18px;
            padding-left: 18px;
          }

          .community-detail-search-inner {
            width: 100%;
            padding-right: 0;
          }
        }
      `}</style>

      <main className="community-detail-page">
        <div className="community-detail-shell">
          <div className="community-detail-top-actions">
            <button
              type="button"
              className="community-detail-back"
              onClick={() => router.push("/community-playlists")}
            >
              <BackIcon />
              Back to community playlists
            </button>
          </div>

          {loading ? (
            <PlaylistDetailSkeleton />
          ) : error ? (
            <div className="community-detail-empty">
              <h2>Couldn&apos;t load playlist</h2>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <section className="community-detail-hero">
                <div
                  className="community-detail-cover"
                  style={{
                    background: playlist?.cover_image_url
                      ? "var(--media-overlay-solid)"
                      : "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)",
                  }}
                >
                  {playlist?.cover_image_url && (
                    <img src={playlist.cover_image_url} alt={playlist.name} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="community-detail-kicker">
                    Community Playlist
                  </div>
                  <h1 className="community-detail-title">
                    {playlist?.name || "Playlist"}
                  </h1>

                  <div className="community-detail-meta">
                    <span className="community-detail-creator">
                      {playlist?.creator.imageUrl ? (
                        <img src={playlist.creator.imageUrl} alt="" />
                      ) : (
                        <span
                          className="community-detail-creator-placeholder"
                          aria-hidden="true"
                        />
                      )}
                      <span>{playlist?.creator.name}</span>
                    </span>
                    <span className="community-detail-dot">·</span>
                    <span>{formatSongCount(songs.length)}</span>
                    {categories.length > 0 && (
                      <>
                        <span className="community-detail-dot">·</span>
                        <span>{categories.join(" · ")}</span>
                      </>
                    )}
                    {topGenres.length > 0 && (
                      <>
                        <span className="community-detail-dot">·</span>
                        <span>{topGenres.join(" · ")}</span>
                      </>
                    )}
                  </div>

                  <div className="community-detail-actions">
                    <button
                      type="button"
                      onClick={playFirstSong}
                      disabled={filteredSongs.length === 0}
                      className={`${primaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
                    >
                      <PlayIconSmall />
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={shufflePlaylist}
                      disabled={filteredSongs.length < 2}
                      className={`${secondaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
                    >
                      <ShuffleIconSmall />
                      Shuffle
                    </button>
                  </div>
                </div>
              </section>

              <div className="community-detail-search-sticky">
                <div
                  className="community-detail-search-row"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  <label className="community-detail-search-inner">
                    <SearchIcon className="shrink-0 text-[var(--text-muted)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search}
                      placeholder="Search Playlist"
                      className="community-detail-search-input"
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="community-detail-quick-row">
                {QUICK_FILTERS.map((filter) => {
                  const isActive =
                    !shuffleActive && quickFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      className={`${quickFilterButtonClass} ${
                        isActive ? quickFilterButtonActiveClass : ""
                      }`}
                      onClick={() => {
                        setQuickFilter(filter.value);
                        setShuffleOrderIds(null);
                      }}
                    >
                      {filter.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className={`${quickFilterButtonClass} ${
                    showEditPointMarkers ? quickFilterButtonActiveClass : ""
                  }`}
                  aria-pressed={showEditPointMarkers}
                  onClick={() =>
                    setShowEditPointMarkers(!showEditPointMarkers)
                  }
                >
                  markers
                </button>
              </div>

              <section className="community-detail-section">
                {songs.length === 0 ? (
                  <div className="community-detail-empty">
                    <h2>No songs yet</h2>
                    <p>This community playlist doesn&apos;t have any songs yet.</p>
                  </div>
                ) : filteredSongs.length === 0 ? (
                  <div className="community-detail-empty">
                    <h2>No songs found</h2>
                    <p>
                      Try searching for a different title, artist, genre, mood,
                      or tag.
                    </p>
                  </div>
                ) : (
                  <div>
                    {filteredSongs.map((song, index) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isFirst={index === 0}
                        isLast={index === filteredSongs.length - 1}
                        showEditPointMarkers={showEditPointMarkers}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {!loading && (
            <div
              className="pt-10"
              style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
            >
              <Footer />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
