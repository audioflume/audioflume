"use client";

import { MusicListShell } from "@filmwave/shared";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import FilterTags from "@/components/FilterTags";
import HeartIcon from "@/components/icons/HeartIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import ShuffleIconSmall from "@/components/icons/ShuffleIconSmall";
import {
  primaryPillButtonClass,
  quickFilterButtonClass,
  quickFilterButtonActiveClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import { useEffect, useMemo, useRef, useState } from "react";

import artistDrawerStyles from "@/components/artists/PublicArtistCollectionDrawer.module.css";
import "@/app/music/music-library-redesign.css";
import "@/app/playlist-detail-unified.css";

const QUICK_FILTERS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

type QuickFilterValue = (typeof QUICK_FILTERS)[number]["value"];

function formatSongCount(count: number) {
  return `${count} song${count === 1 ? "" : "s"}`;
}

function getTopGenres<T extends { genres: string[] }>(songs: T[]) {
  const counts = new Map<string, number>();

  songs.forEach((song) => {
    song.genres.forEach((genre) => {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([genre]) => genre);
}

function shuffleSongList<T>(songs: T[]) {
  if (songs.length < 2) return [...songs];

  let bestShuffle = [...songs];
  let bestMovedCount = -1;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = [...songs];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    const movedCount = shuffled.filter(
      (song, index) => song !== songs[index],
    ).length;

    if (movedCount > bestMovedCount) {
      bestShuffle = shuffled;
      bestMovedCount = movedCount;
    }

    if (movedCount >= Math.floor(songs.length * 0.85)) {
      break;
    }
  }

  return bestShuffle;
}

export default function FavoritesPage() {
  const {
    songs,
    loading: songsLoading,
    error: songsError,
    refetchSongs,
  } = useSongs();
  const { favoriteIds, favoriteIdSet, favoritesLoaded } = useFavorites();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const playerVisible = !!currentSong;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("newest");
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);

  const favoriteSongs = useMemo(() => {
    const songsById = new Map(songs.map((song) => [song.id, song]));

    return favoriteIds
      .map((songId) => songsById.get(songId))
      .filter((song): song is (typeof songs)[number] => Boolean(song));
  }, [songs, favoriteIds]);

  const searchedSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return favoriteSongs;

    return favoriteSongs.filter((song) => {
      const searchableText = [
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
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [favoriteSongs, search]);

  const filteredSongs = useMemo(() => {
    const indexedSongs = searchedSongs.map((song, index) => ({ song, index }));
    const nextSongs =
      quickFilter === "liked"
        ? indexedSongs.filter(({ song }) => favoriteIdSet.has(song.id))
        : indexedSongs;

    const sortedSongs = [...nextSongs].sort((a, b) => {
      if (quickFilter === "alphabetical") {
        return a.song.title.localeCompare(b.song.title, undefined, {
          sensitivity: "base",
        });
      }

      return quickFilter === "oldest" ? b.index - a.index : a.index - b.index;
    });

    return sortedSongs.map(({ song }) => song);
  }, [searchedSongs, quickFilter, favoriteIdSet]);

  const displayedSongs = useMemo(() => {
    if (!shuffleOrderIds) return filteredSongs;

    const orderMap = new Map(
      shuffleOrderIds.map((songId, index) => [songId, index]),
    );

    return [...filteredSongs].sort((a, b) => {
      const aOrder = orderMap.get(a.id);
      const bOrder = orderMap.get(b.id);

      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;
      return aOrder - bOrder;
    });
  }, [filteredSongs, shuffleOrderIds]);

  const topGenres = useMemo(
    () => getTopGenres(displayedSongs),
    [displayedSongs],
  );
  const showSongSkeleton = !songsError && (!favoritesLoaded || songsLoading);
  const hasAnyFavorites = favoriteIdSet.size > 0;
  const shuffleActive = shuffleOrderIds !== null;
  const currentSongInFavorites = Boolean(
    currentSong && favoriteSongs.some((song) => song.id === currentSong.id),
  );
  const favoritesIsPlaying = currentSongInFavorites && isPlaying;

  useEffect(() => {
    setQueue(displayedSongs.filter((song) => song.audioUrl));
  }, [displayedSongs, setQueue]);

  useEffect(() => {
    setShuffleOrderIds(null);
  }, [favoriteIds, quickFilter, search]);

  function playFirstSong() {
    const firstSong = displayedSongs[0];
    if (!firstSong) return;

    const firstSongButton = document.querySelector<HTMLButtonElement>(
      '[aria-label="Play song"], [aria-label="Pause song"]',
    );
    firstSongButton?.click();
  }

  function toggleFavoritesPlayback() {
    if (favoritesIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }
    playFirstSong();
  }

  function shuffleFavorites() {
    if (displayedSongs.length < 2) return;

    const shuffledSongs = shuffleSongList(displayedSongs);
    setShuffleOrderIds(shuffledSongs.map((song) => song.id));
    setQueue(shuffledSongs.filter((song) => song.audioUrl));
  }

  return (
    <main className="playlist-detail-page">
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
                placeholder="Search Favorites"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setShuffleOrderIds(null);
                }}
                className="playlist-detail-search-input"
              />
            </label>
            <FilterTags
              selectedMoods={[]}
              selectedGenres={[]}
              selectedInstruments={[]}
              selectedBuilds={[]}
              selectedVocals={[]}
              selectedDurations={[]}
              instrumental={false}
              bpmValue={null}
              keyValue={null}
              selectedPlaylist={null}
              shuffleActive={shuffleActive}
              onRemoveMood={() => {}}
              onRemoveGenre={() => {}}
              onRemoveInstrument={() => {}}
              onRemoveBuild={() => {}}
              onRemoveVocal={() => {}}
              onRemoveDuration={() => {}}
              onRemoveInstrumental={() => {}}
              onRemoveBpm={() => {}}
              onRemoveKey={() => {}}
              onRemovePlaylist={() => {}}
              onRemoveShuffle={() => setShuffleOrderIds(null)}
            />
          </div>
        </div>
      </div>

      <div className="playlist-detail-stage is-system-playlist">
        <div className="playlist-detail-card">
          <div className="playlist-detail-card-inner">
            <section className="playlist-detail-hero">
              <div className="playlist-detail-cover playlist-detail-system-cover">
                <HeartIcon size={52} filled />
              </div>

              <div className="min-w-0">
                <span className="playlist-detail-kicker">Playlist</span>
                <h1 className="playlist-detail-title">Favorites</h1>
                <p className="playlist-detail-meta">
                  <span>{formatSongCount(displayedSongs.length)}</span>
                  {topGenres.length > 0 && (
                    <>
                      <span className="playlist-detail-dot">·</span>
                      <span>{topGenres.join(" · ")}</span>
                    </>
                  )}
                </p>

                <div className="playlist-detail-actions">
                  <button
                    type="button"
                    onClick={toggleFavoritesPlayback}
                    disabled={displayedSongs.length === 0}
                    className={artistDrawerStyles.roundAction}
                    aria-label={`${favoritesIsPlaying ? "Pause" : "Play"} Favorites`}
                    aria-pressed={favoritesIsPlaying}
                  >
                    {favoritesIsPlaying ? (
                      <PauseIcon size={15} />
                    ) : (
                      <PlayIconSmall size={15} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={shuffleFavorites}
                    disabled={displayedSongs.length < 2}
                    className={artistDrawerStyles.roundAction}
                    aria-label="Shuffle Favorites"
                  >
                    <ShuffleIconSmall />
                  </button>
                </div>
              </div>
            </section>

            <div className="playlist-detail-quick-row">
              {QUICK_FILTERS.map((filter) => {
                const isActive = !shuffleActive && quickFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      setQuickFilter(filter.value);
                      setShuffleOrderIds(null);
                    }}
                    className={`${quickFilterButtonClass} ${
                      isActive ? quickFilterButtonActiveClass : ""
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <section className="playlist-detail-section">
              {showSongSkeleton ? (
                <SkeletonSongList />
              ) : songsError ? (
                <div className="playlist-detail-empty">
                  <h2>Couldn&apos;t load favorites</h2>
                  <p>{songsError}</p>
                  <button
                    type="button"
                    onClick={refetchSongs}
                    className={primaryPillButtonClass}
                  >
                    Try Again
                  </button>
                </div>
              ) : displayedSongs.length === 0 ? (
                <div className="playlist-detail-empty">
                  {hasAnyFavorites ? (
                    <>
                      <h2>No songs found</h2>
                      <p>
                        Try searching for a different title, artist, genre,
                        mood, tag, or filter.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2>No favorites yet</h2>
                      <p>
                        Click the heart icon on any song to add it to your
                        favorites.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <MusicListShell title={null}>
                  {displayedSongs.map((song, index) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      isFirst={index === 0}
                      isLast={index === displayedSongs.length - 1}
                      showDivider={false}
                    />
                  ))}
                </MusicListShell>
              )}
            </section>
          </div>
        </div>
      </div>

      {!showSongSkeleton && (
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
