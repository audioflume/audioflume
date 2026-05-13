"use client";

import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import { useEffect, useMemo, useRef, useState } from "react";

const QUICK_FILTERS = [
  "Cinematic",
  "YouTube",
  "Background",
  "Ambient",
  "Hip Hop",
];

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 38.31 38.31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-[var(--text-muted)]"
      aria-hidden="true"
    >
      <path
        d="M38.31,35.48l-11.75-11.74c1.89-2.49,3.03-5.58,3.03-8.94C29.6,6.64,22.96,0,14.8,0S0,6.64,0,14.8s6.64,14.8,14.8,14.8c3.36,0,6.45-1.14,8.94-3.03l11.75,11.74,2.83-2.83ZM14.8,25.6c-5.96,0-10.8-4.84-10.8-10.8S8.84,4,14.8,4s10.8,4.85,10.8,10.8-4.84,10.8-10.8,10.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5V19L19 12L8 5Z" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7H7.2C9.2 7 10.6 8.2 12 10.2L12.8 11.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M17 5L20 8L17 11"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 8H20"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M4 17H7.2C9.2 17 10.6 15.8 12 13.8L12.8 12.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M17 13L20 16L17 19"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 16H20"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
  const { currentSong, setQueue } = usePlayer();
  const playerVisible = !!currentSong;

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<string[]>(
    [],
  );
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const query = search.trim().toLowerCase();

      if (query) {
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

        if (!searchableText.includes(query)) return false;
      }

      if (
        selectedQuickFilters.length > 0 &&
        !selectedQuickFilters.every((filter) => song.genres.includes(filter))
      ) {
        return false;
      }

      return true;
    });
  }, [songs, search, selectedQuickFilters]);

  const displayedSongs = useMemo(() => {
    const placeholderFavorites = [...filteredSongs].reverse();

    if (!shuffleOrderIds) return placeholderFavorites;

    const orderMap = new Map(
      shuffleOrderIds.map((songId, index) => [songId, index]),
    );

    return [...placeholderFavorites].sort((a, b) => {
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

  const showSongSkeleton = !songsError && songsLoading && songs.length === 0;

  useEffect(() => {
    setQueue(displayedSongs.filter((song) => song.audioUrl));
  }, [displayedSongs, setQueue]);

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

  function toggleQuickFilter(filter: string) {
    setSelectedQuickFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
    setShuffleOrderIds(null);
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
          padding: 0 28px;
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
          font-family: var(--font-instrument-sans);
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
          margin-left: -28px;
          margin-right: -28px;
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
          margin-left: -28px;
          margin-right: -28px;
          background: var(--bg-primary);
          padding: 16px 28px;
        }

        .favorites-quick-pill {
          cursor: pointer;
          border-radius: 6px;
          background: var(--bg-elevated);
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          transition:
            background-color 0.15s ease,
            color 0.15s ease;
        }

        .favorites-quick-pill:hover,
        .favorites-quick-pill.is-active {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .favorites-section {
          margin-left: -28px;
          margin-right: -28px;
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
          .favorites-shell {
            padding: 0 18px;
          }

          .favorites-search-sticky,
          .favorites-quick-row,
          .favorites-section {
            margin-left: -18px;
            margin-right: -18px;
          }

          .favorites-search-row {
            padding-left: 18px;
            padding-right: 18px;
          }

          .favorites-quick-row {
            padding-left: 18px;
            padding-right: 18px;
          }

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

              <span className="favorites-dot">·</span>
              <span>Temporary master list</span>
            </div>

            <div className="favorites-actions">
              <button
                type="button"
                onClick={playFirstSong}
                disabled={displayedSongs.length === 0}
                className={`${primaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
              >
                <PlayIcon />
                Play
              </button>

              <button
                type="button"
                onClick={shuffleFavorites}
                disabled={displayedSongs.length < 2}
                className={`${secondaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
              >
                <ShuffleIcon />
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
                <SearchIcon />

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
            </div>
          </div>

          <div className="favorites-quick-row">
            {QUICK_FILTERS.map((filter) => {
              const isActive = selectedQuickFilters.includes(filter);

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => toggleQuickFilter(filter)}
                  className={`favorites-quick-pill ${
                    isActive ? "is-active" : ""
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <section className="favorites-section">
            {showSongSkeleton && <SkeletonSongList />}

            {songsError && !songsLoading && (
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
                  <h2>No songs found</h2>
                  <p>
                    Try searching for a different title, artist, genre, mood, or
                    tag.
                  </p>
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

          {!songsLoading && (
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
