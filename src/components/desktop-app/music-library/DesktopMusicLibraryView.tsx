import { useEffect, useMemo, useRef, useState } from "react";
import SearchIconSmall from "../../icons/SearchIconSmall";
import {
  desktopSongs,
  getFilmwaveSongs,
  type DesktopSong,
} from "../../../lib/desktopSongs";
import DesktopFilterDropdown from "./DesktopFilterDropdown";
import DesktopFilterTags from "./DesktopFilterTags";
import DesktopMusicPlayer from "./DesktopMusicPlayer";
import DesktopSongCard from "./DesktopSongCard";
import type { DesktopMusicFilterKey, DesktopMusicFilterState } from "./musicLibraryTypes";
import {
  EMPTY_FILTERS,
  FILTER_TITLES,
  QUICK_GENRES,
  filterDesktopMusicSongs,
  getDesktopMusicFilterOptions,
  shuffleDesktopMusicSongs,
} from "./musicLibraryUtils";
import "./DesktopMusicLibraryView.css";
import "./DesktopMusicLibraryRefinements.css";
import "./DesktopMusicLibrarySpacing.css";

export default function DesktopMusicLibraryView({
  apiBaseUrl,
}: {
  apiBaseUrl?: string | null;
}) {
  const [songs, setSongs] = useState<DesktopSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DesktopMusicFilterState>(EMPTY_FILTERS);
  const [openDropdown, setOpenDropdown] = useState<DesktopMusicFilterKey | null>(null);
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSongs() {
      setSongsLoading(true);
      setSongsError(null);

      try {
        const realSongs = await getFilmwaveSongs(apiBaseUrl);
        if (cancelled) return;
        setSongs(realSongs);
        setFavoriteIds(
          (current) =>
            new Set(
              [...current].filter((songId) =>
                realSongs.some((song) => song.id === songId),
              ),
            ),
        );
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setSongs(desktopSongs);
        setSongsError(
          error instanceof Error ? error.message : "Could not load Filmwave songs.",
        );
      } finally {
        if (!cancelled) setSongsLoading(false);
      }
    }

    void loadSongs();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const filterOptions = useMemo(
    () => getDesktopMusicFilterOptions(songs),
    [songs],
  );

  const filteredSongs = useMemo(
    () => filterDesktopMusicSongs(songs, filters),
    [songs, filters],
  );

  const displayedSongs = useMemo(() => {
    if (!shuffleOrderIds) return filteredSongs;

    const orderMap = new Map(shuffleOrderIds.map((songId, index) => [songId, index]));

    return [...filteredSongs].sort((a, b) => {
      const aOrder = orderMap.get(a.id);
      const bOrder = orderMap.get(b.id);

      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;

      return aOrder - bOrder;
    });
  }, [filteredSongs, shuffleOrderIds]);

  const activeSong = useMemo(
    () => songs.find((song) => song.id === activeSongId) ?? null,
    [activeSongId, songs],
  );

  const activeSongIndex = useMemo(
    () => displayedSongs.findIndex((song) => song.id === activeSongId),
    [activeSongId, displayedSongs],
  );

  const filterKeys = Object.keys(FILTER_TITLES) as DesktopMusicFilterKey[];

  function setFilterValue(key: DesktopMusicFilterKey, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  function removeFilterValue(key: DesktopMusicFilterKey, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].filter((item) => item !== value),
    }));
  }

  function toggleShuffle() {
    const nextOrder = shuffleDesktopMusicSongs(filteredSongs).map((song) => song.id);
    setShuffleOrderIds(nextOrder);
    setFilters((current) => ({ ...current, shuffle: true }));
  }

  function removeShuffle() {
    setShuffleOrderIds(null);
    setFilters((current) => ({ ...current, shuffle: false }));
  }

  function toggleFavorite(songId: string) {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }

  function playSong(song: DesktopSong) {
    if (activeSongId === song.id) {
      setPlayerPlaying((playing) => !playing);
      return;
    }

    setActiveSongId(song.id);
    setPlayerPlaying(true);
  }

  function playSongAtIndex(index: number) {
    if (!displayedSongs.length) return;
    const normalizedIndex = (index + displayedSongs.length) % displayedSongs.length;
    setActiveSongId(displayedSongs[normalizedIndex].id);
    setPlayerPlaying(true);
  }

  function playPreviousSong() {
    playSongAtIndex(activeSongIndex <= 0 ? displayedSongs.length - 1 : activeSongIndex - 1);
  }

  function playNextSong() {
    playSongAtIndex(activeSongIndex < 0 ? 0 : activeSongIndex + 1);
  }

  return (
    <section className={`desktop-music-page${activeSong ? " has-player" : ""}`}>
      <div className="desktop-music-sticky-bar">
        <div
          className="desktop-music-search-row"
          onClick={() => searchInputRef.current?.focus()}
        >
          <div className="desktop-music-search-shell">
            <SearchIconSmall size={13} className="desktop-music-search-icon" />
            <input
              ref={searchInputRef}
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Search Music Library"
              className="desktop-music-search-input"
            />
          </div>

          <DesktopFilterTags
            filters={filters}
            onRemoveFilter={removeFilterValue}
            onRemoveMarkers={() =>
              setFilters((current) => ({ ...current, markers: false }))
            }
            onRemoveShuffle={removeShuffle}
          />
        </div>

        <div className="desktop-music-filter-row">
          {filterKeys.map((filterKey) => (
            <DesktopFilterDropdown
              key={filterKey}
              filterKey={filterKey}
              label={FILTER_TITLES[filterKey]}
              options={filterOptions[filterKey]}
              selected={filters[filterKey]}
              open={openDropdown === filterKey}
              onOpenChange={(open) => setOpenDropdown(open ? filterKey : null)}
              onToggleOption={(value) => setFilterValue(filterKey, value)}
            />
          ))}

          <button
            type="button"
            className={`desktop-filter-trigger desktop-filter-trigger-markers${filters.markers ? " is-active" : ""}`}
            onClick={() =>
              setFilters((current) => ({ ...current, markers: !current.markers }))
            }
            aria-pressed={filters.markers}
          >
            <span>Markers</span>
            {filters.markers && <span className="desktop-filter-count">1</span>}
          </button>

          <button
            type="button"
            className={`desktop-shuffle-button${filters.shuffle ? " is-active" : ""}`}
            onClick={toggleShuffle}
            aria-label="Shuffle songs"
            aria-pressed={filters.shuffle}
          >
            <ShuffleIcon />
          </button>
        </div>
      </div>

      <div className="desktop-music-quick-filters">
        {QUICK_GENRES.map((genre) => {
          const active = filters.genre.includes(genre);

          return (
            <button
              key={genre}
              type="button"
              className={`desktop-quick-filter${active ? " is-active" : ""}`}
              onClick={() => setFilterValue("genre", genre)}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {songsError && (
        <div className="desktop-music-load-notice">
          Could not load live songs. Showing sample tracks. {songsError}
        </div>
      )}

      <div className="desktop-music-list">
        {songsLoading && (
          <div className="desktop-music-empty-state">
            <h3>Loading music library</h3>
            <p>Fetching published Filmwave songs from the website.</p>
          </div>
        )}

        {!songsLoading &&
          displayedSongs.map((song) => (
            <DesktopSongCard
              key={song.id}
              song={song}
              favorite={favoriteIds.has(song.id)}
              markersVisible={filters.markers}
              isPlaying={activeSongId === song.id && playerPlaying}
              onFavoriteToggle={() => toggleFavorite(song.id)}
              onPlay={() => playSong(song)}
            />
          ))}

        {!songsLoading && displayedSongs.length === 0 && (
          <div className="desktop-music-empty-state">
            <h3>No songs found</h3>
            <p>Clear a filter or search for a different cue.</p>
          </div>
        )}
      </div>

      {activeSong && (
        <DesktopMusicPlayer
          song={activeSong}
          isPlaying={playerPlaying}
          favorite={favoriteIds.has(activeSong.id)}
          onFavoriteToggle={() => toggleFavorite(activeSong.id)}
          onPlayPause={() => setPlayerPlaying((playing) => !playing)}
          onPrevious={playPreviousSong}
          onNext={playNextSong}
        />
      )}
    </section>
  );
}

function ShuffleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      fill="currentColor"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.6 9.6 0 0 0 7.556 8a9.6 9.6 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.6 10.6 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.6 9.6 0 0 0 6.444 8a9.6 9.6 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5"
      />
      <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192m0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192" />
    </svg>
  );
}
