"use client";

import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import FilterTags from "@/components/FilterTags";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import ShuffleIconSmall from "@/components/icons/ShuffleIconSmall";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
  quickFilterButtonClass,
  quickFilterButtonActiveClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const { currentSong, setQueue } = usePlayer();
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
    return favoriteSongs.filter((song) => {
      const query = search.trim().toLowerCase();

      if (!query) return true;

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
    const indexedSongs = searchedSongs.map((song, index) => ({
      song,
      index,
    }));

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
      `[aria-label="Play song"], [aria-label="Pause song"]`,
    );

    firstSongButton?.click();
  }

  function shuffleFavorites() {
    if (displayedSongs.length < 2) return;

    const shuffledSongs = shuffleSongList(displayedSongs);
    setShuffleOrderIds(shuffledSongs.map((song) => song.id));
    setQueue(shuffledSongs.filter((song) => song.audioUrl));
  }

  return (
    <>
      <style>{`
        .favorites-page {
          position: relative;
          margin-left: var(--sidebar-width);
          margin-top: 56px;
          min-height: calc(100vh - 56px);
          overflow-x: clip;
          overflow-y: visible;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: margin-left 0.2s ease;
        }

        .favorites-shell {
          position: relative;
          z-index: 1;
          padding: 0 32px;
        }

        .favorites-hero {
          display: block;
          padding: 88px 0 0;
        }

        .favorites-kicker {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .favorites-title {
          margin-top: 8px;
          max-width: 640px;
          font-family: var(--font-aktiv-grotesk);
          font-size: 56px;
          font-weight: 500;
          line-height: 0.94;
          letter-spacing: -0.055em;
          color: var(--text-primary);
        }

        .favorites-meta {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .favorites-dot {
          color: var(--text-muted);
        }

        .favorites-actions {
          margin-top: 24px;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .favorites-search-sticky {
          position: sticky;
          top: 55px;
          z-index: 90;
          margin-left: -32px;
          margin-right: -32px;
          background: var(--bg-primary);
        }

        .favorites-search-row {
          display: flex;
          min-height: 49px;
          align-items: center;
          gap: 3px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 0 28px;
          cursor: text;
        }

        .favorites-search-inner {
          display: flex;
          width: 320px;
          flex-shrink: 0;
          align-items: center;
          gap: 8px;
          padding: 12px 16px 12px 0;
          cursor: text;
        }

        .favorites-search-input {
          width: 100%;
          background: transparent;
          font-size: 15px;
          font-weight: 300;
          color: var(--text-primary);
          outline: none;
        }

        .favorites-search-input::placeholder {
          color: var(--text-muted);
        }

        .favorites-quick-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-left: -32px;
          margin-right: -32px;
          background: var(--bg-primary);
          padding: 16px 28px;
        }

        .favorites-section {
          margin-left: -32px;
          margin-right: -32px;
        }

        .favorites-empty {
          display: flex;
          min-height: 280px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-secondary);
        }

        .favorites-empty h2 {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .favorites-empty p {
          margin-top: 6px;
          max-width: 320px;
          font-size: 12px;
          line-height: 1.6;
        }

        .favorites-footer-wrap {
          padding-top: 40px;
        }

        @media (max-width: 720px) {
          .favorites-hero {
            padding-top: 88px;
          }

          .favorites-actions {
            margin-bottom: 32px;
          }
        }

        @media (max-width: 760px) {
          .favorites-search-inner {
            width: 100%;
            padding-right: 0;
          }
        }
      `}</style>

      <main className="favorites-page">
        <div className="favorites-shell">
          <section className="favorites-hero">
            <div className="favorites-kicker">Favorites</div>

            <h1 className="favorites-title">Favorites</h1>

            <div className="favorites-meta">
              <span>{formatSongCount(displayedSongs.length)}</span>

              {topGenres.length > 0 && (
                <>
                  <span className="favorites-dot">·</span>
                  <span>{topGenres.join(" · ")}</span>
                </>
              )}
            </div>

            <div className="favorites-actions">
              <button
                type="button"
                onClick={playFirstSong}
                disabled={displayedSongs.length === 0}
                className={`${primaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
              >
                <PlayIconSmall />
                Play
              </button>

              <button
                type="button"
                onClick={shuffleFavorites}
                disabled={displayedSongs.length < 2}
                className={`${secondaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
              >
                <ShuffleIconSmall />
                Shuffle
              </button>
            </div>
          </section>

          <div className="favorites-search-sticky">
            <div
              className="favorites-search-row"
              onClick={() => searchInputRef.current?.focus()}
            >
              <label className="favorites-search-inner">
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
                  className="favorites-search-input"
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

          <div className="favorites-quick-row">
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

          <section className="favorites-section">
            {showSongSkeleton && <SkeletonSongList />}

            {songsError && !songsLoading && favoritesLoaded && (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-8 text-center">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Couldn&apos;t load favorites
                </div>

                <div className="max-w-[320px] text-xs leading-5 text-[var(--text-secondary)]">
                  {songsError}
                </div>

                <button
                  type="button"
                  onClick={refetchSongs}
                  className={primaryPillButtonClass}
                >
                  Try Again
                </button>
              </div>
            )}

            {!songsError &&
              !showSongSkeleton &&
              displayedSongs.length === 0 && (
                <div className="favorites-empty">
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
              )}

            {!songsError &&
              !showSongSkeleton &&
              displayedSongs.map((song, index) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isFirst={index === 0}
                  isLast={index === displayedSongs.length - 1}
                />
              ))}
          </section>

          {!showSongSkeleton && (
            <div
              className="favorites-footer-wrap"
              style={{
                paddingBottom: playerVisible ? "72px" : "8px",
              }}
            >
              <Footer />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
