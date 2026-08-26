"use client";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import {
  quickFilterButtonActiveClass,
  quickFilterButtonClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { CommunityPlaylistCategory } from "@/lib/communityPlaylistCategories";
import type { Song } from "@/lib/types";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import "@/app/music/music-library-redesign.css";
import "@/app/playlist-detail-unified.css";
import "@/app/curated-playlists/[playlistId]/curated-playlist-detail.css";

const RECENT_COMMUNITY_PLAYLISTS_KEY =
  "filmwave-recent-community-playlists";
const FALLBACK_BACKGROUND =
  "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)";

const QUICK_FILTERS = [
  { label: "Default", value: "default" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

type QuickFilterValue = (typeof QUICK_FILTERS)[number]["value"];
type SimilarSoundTag = {
  type: "genre" | "mood";
  value: string;
};

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

function NortheastArrowGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 17L17 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 7H17V15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlaylistDetailSkeleton() {
  return (
    <div className="playlist-detail-card">
      <div className="playlist-detail-card-inner">
        <section className="playlist-detail-hero playlist-detail-skeleton-hero">
          <div className="playlist-detail-cover playlist-detail-skeleton-cover skeleton-block" />
          <div className="min-w-0">
            <div className="playlist-detail-skeleton-kicker skeleton-block" />
            <div className="playlist-detail-skeleton-title skeleton-block" />
            <div className="playlist-detail-skeleton-meta">
              <div className="playlist-detail-skeleton-meta-line skeleton-block" />
              <div className="playlist-detail-skeleton-meta-line short skeleton-block" />
            </div>
            <div className="playlist-detail-actions">
              <div className="playlist-detail-skeleton-button skeleton-block" />
              <div className="playlist-detail-skeleton-button secondary skeleton-block" />
            </div>
          </div>
        </section>
        <section className="playlist-detail-section">
          <SkeletonSongList />
        </section>
      </div>
    </div>
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
    return storedValue ? parseRecentPlaylistIds(JSON.parse(storedValue)) : [];
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
  ].slice(0, 10);

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

function getTopSimilarSoundTags(songs: CommunityPlaylistSong[]) {
  const counts = new Map<string, { tag: SimilarSoundTag; count: number }>();

  songs.forEach((song) => {
    song.genres.forEach((genre) => {
      const value = genre.trim();
      if (!value) return;
      const key = `genre:${value.toLowerCase()}`;
      const current = counts.get(key);
      counts.set(key, {
        tag: current?.tag ?? { type: "genre", value },
        count: (current?.count ?? 0) + 1,
      });
    });

    song.moods.forEach((mood) => {
      const value = mood.trim();
      if (!value) return;
      const key = `mood:${value.toLowerCase()}`;
      const current = counts.get(key);
      counts.set(key, {
        tag: current?.tag ?? { type: "mood", value },
        count: (current?.count ?? 0) + 1,
      });
    });
  });

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(({ tag }) => tag);
}

function buildSimilarSoundsHref(tags: SimilarSoundTag[]) {
  if (tags.length === 0) return "/music";

  const params = new URLSearchParams();
  tags.forEach((tag) => params.append(tag.type, tag.value));
  return `/music?${params.toString()}`;
}

function formatSongCount(count: number) {
  return `${count} song${count === 1 ? "" : "s"}`;
}

export default function CommunityPlaylistDetailPage() {
  const params = useParams();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { showEditPointMarkers, setShowEditPointMarkers } = useUserPreferences();

  const playlistId = String(params.playlistId || "");
  const playerVisible = Boolean(currentSong);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [playlist, setPlaylist] = useState<CommunityPlaylistDetail | null>(null);
  const [songs, setSongs] = useState<CommunityPlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("default");

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

        if (!("playlist" in data) || !("songs" in data) || !Array.isArray(data.songs)) {
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
    const nextSongs = [...searchedSongs];

    if (quickFilter === "liked") {
      return nextSongs.filter((song) => favoriteIdSet.has(song.id));
    }

    if (quickFilter === "alphabetical") {
      return nextSongs.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
    }

    return nextSongs.sort((a, b) => a.position - b.position);
  }, [favoriteIdSet, quickFilter, searchedSongs]);

  const topGenres = useMemo(() => getTopGenres(songs), [songs]);
  const similarSoundTags = useMemo(() => getTopSimilarSoundTags(songs), [songs]);
  const similarSoundsHref = useMemo(
    () => buildSimilarSoundsHref(similarSoundTags),
    [similarSoundTags],
  );
  const categories = playlist
    ? [
        ...(playlist.primary_category ? [playlist.primary_category] : []),
        ...playlist.secondary_categories,
      ]
    : [];
  const currentSongInPlaylist = Boolean(
    currentSong && songs.some((song) => song.id === currentSong.id),
  );
  const playlistIsPlaying = currentSongInPlaylist && isPlaying;

  useEffect(() => {
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  function playFirstSong() {
    const firstSongButton = document.querySelector<HTMLButtonElement>(
      '[aria-label="Play song"], [aria-label="Pause song"]',
    );
    firstSongButton?.click();
  }

  function toggleCoverPlayback() {
    if (playlistIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }
    playFirstSong();
  }

  const stageStyle = playlist?.cover_image_url
    ? { backgroundImage: `url(${JSON.stringify(playlist.cover_image_url)})` }
    : { background: FALLBACK_BACKGROUND };

  return (
    <main className="playlist-detail-page community-detail-page">
      <div className="playlist-detail-shell">
        <div className="playlist-detail-search-sticky">
          <div
            className="playlist-detail-search-row"
            onClick={() => searchInputRef.current?.focus()}
          >
            <label className="playlist-detail-search-inner">
              <SearchIcon className="shrink-0 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                placeholder="Search Playlist"
                className="playlist-detail-search-input"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="playlist-detail-stage" style={stageStyle}>
        {loading ? (
          <PlaylistDetailSkeleton />
        ) : error ? (
          <div className="playlist-detail-card">
            <div className="playlist-detail-card-inner">
              <div className="playlist-detail-empty">
                <h2>Couldn&apos;t load playlist</h2>
                <p>{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="playlist-detail-card">
            <div className="playlist-detail-card-inner">
              <section className="playlist-detail-hero">
                <div
                  className="playlist-detail-cover"
                  style={{
                    background: playlist?.cover_image_url
                      ? "var(--bg-tertiary)"
                      : FALLBACK_BACKGROUND,
                  }}
                >
                  {playlist?.cover_image_url && (
                    <img src={playlist.cover_image_url} alt={playlist.name} />
                  )}

                  <button
                    type="button"
                    onClick={toggleCoverPlayback}
                    disabled={filteredSongs.length === 0}
                    className="playlist-detail-cover-play-button"
                    aria-label={`${playlistIsPlaying ? "Pause" : "Play"} ${playlist?.name || "playlist"}`}
                    aria-pressed={playlistIsPlaying}
                  >
                    {playlistIsPlaying ? (
                      <PauseIcon size={18} />
                    ) : (
                      <PlayIconSmall size={18} />
                    )}
                  </button>
                </div>

                <div className="min-w-0">
                  <span className="playlist-detail-kicker">Community Playlist</span>
                  <h1 className="playlist-detail-title">
                    {playlist?.name || "Playlist"}
                  </h1>

                  <p className="playlist-detail-meta">
                    <span className="playlist-detail-creator">
                      {playlist?.creator.imageUrl ? (
                        <img src={playlist.creator.imageUrl} alt="" />
                      ) : (
                        <span
                          className="playlist-detail-creator-placeholder"
                          aria-hidden="true"
                        />
                      )}
                      <span>{playlist?.creator.name}</span>
                    </span>
                    <span className="playlist-detail-dot">·</span>
                    <span>{formatSongCount(songs.length)}</span>
                    {categories.length > 0 && (
                      <>
                        <span className="playlist-detail-dot">·</span>
                        <span>{categories.join(" · ")}</span>
                      </>
                    )}
                    {topGenres.length > 0 && (
                      <>
                        <span className="playlist-detail-dot">·</span>
                        <span>{topGenres.join(" · ")}</span>
                      </>
                    )}
                  </p>

                  <div className="playlist-detail-actions" />

                  <div className="playlist-detail-hero-secondary-actions">
                    <Link
                      href={similarSoundsHref}
                      className="playlist-detail-hero-secondary-action playlist-detail-explore-similar-action"
                    >
                      Explore Similar Sounds
                      <NortheastArrowGlyph />
                    </Link>
                  </div>
                </div>
              </section>

              <div className="playlist-detail-quick-row">
                {QUICK_FILTERS.map((filter) => {
                  const isActive = quickFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      className={`${quickFilterButtonClass} ${
                        isActive ? quickFilterButtonActiveClass : ""
                      }`}
                      onClick={() => setQuickFilter(filter.value)}
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
                  onClick={() => setShowEditPointMarkers(!showEditPointMarkers)}
                >
                  markers
                </button>
              </div>

              <section className="playlist-detail-section">
                {songs.length === 0 ? (
                  <div className="playlist-detail-empty">
                    <h2>No songs yet</h2>
                    <p>This community playlist doesn&apos;t have any songs yet.</p>
                  </div>
                ) : filteredSongs.length === 0 ? (
                  <div className="playlist-detail-empty">
                    <h2>No songs found</h2>
                    <p>Try searching for a different title, artist, genre, mood, or tag.</p>
                  </div>
                ) : (
                  <MusicListShell title={null}>
                    {filteredSongs.map((song, index) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isFirst={index === 0}
                        isLast={index === filteredSongs.length - 1}
                        showDivider={false}
                        showEditPointMarkers={showEditPointMarkers}
                      />
                    ))}
                  </MusicListShell>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      {!loading && (
        <div
          className="playlist-detail-footer-shell"
          style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
        >
          <Footer />
        </div>
      )}
    </main>
  );
}
