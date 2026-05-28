import { useEffect, useMemo, useRef, useState } from "react";
import ArrowUpRightIcon from "../icons/ArrowUpRightIcon";
import DownloadIconSmall from "../icons/DownloadIconSmall";
import HeartIcon from "../icons/HeartIcon";
import MoreIcon from "../icons/MoreIcon";
import MusicIcon from "../icons/MusicIcon";
import SearchIconSmall from "../icons/SearchIconSmall";
import { desktopSongs, type DesktopSong } from "../../lib/desktopSongs";
import "./DesktopMusicLibraryView.css";

type FilterKey =
  | "playlist"
  | "mood"
  | "genre"
  | "instrument"
  | "vocal"
  | "build"
  | "bpm"
  | "key"
  | "duration"
  | "cuePoint";

type DesktopMusicFilterState = Record<FilterKey, string[]> & {
  search: string;
  markers: boolean;
  shuffle: boolean;
};

const QUICK_GENRES = ["Ambient", "Cinematic", "Commercial", "Indie"];

const FILTER_TITLES: Record<FilterKey, string> = {
  playlist: "Playlists",
  mood: "Mood",
  genre: "Genre",
  instrument: "Instruments",
  vocal: "Vocals",
  build: "Build",
  bpm: "BPM",
  key: "Key",
  duration: "Duration",
  cuePoint: "Cue Points",
};

const MUSIC_HERO_IMAGE =
  "https://images.unsplash.com/photo-1556139930-c23fa4a4f934?q=80&w=2070&auto=format&fit=crop";
const DESKTOP_SYNC_IMAGE =
  "https://images.unsplash.com/photo-1686519093104-3140c6dcf284?q=80&w=2070&auto=format&fit=crop";

const EMPTY_FILTERS: DesktopMusicFilterState = {
  search: "",
  playlist: [],
  mood: [],
  genre: [],
  instrument: [],
  vocal: [],
  build: [],
  bpm: [],
  key: [],
  duration: [],
  cuePoint: [],
  markers: false,
  shuffle: false,
};

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function getDurationSeconds(duration: string) {
  const [minutes, seconds] = duration.split(":").map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0;
  return minutes * 60 + seconds;
}

function matchesDurationFilter(duration: string, selected: string[]) {
  if (!selected.length) return true;
  const seconds = getDurationSeconds(duration);

  return selected.some((value) => {
    if (value === "Under 2:00") return seconds > 0 && seconds < 120;
    if (value === "2:00–3:00") return seconds >= 120 && seconds <= 180;
    if (value === "Over 3:00") return seconds > 180;
    return true;
  });
}

function shuffleSongList(songs: DesktopSong[]) {
  const nextSongs = [...songs];

  for (let i = nextSongs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [nextSongs[i], nextSongs[j]] = [nextSongs[j], nextSongs[i]];
  }

  return nextSongs;
}

export default function DesktopMusicLibraryView() {
  const [filters, setFilters] = useState<DesktopMusicFilterState>(EMPTY_FILTERS);
  const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);
  const [musicHeroHovered, setMusicHeroHovered] = useState(false);
  const [desktopSyncHovered, setDesktopSyncHovered] = useState(false);
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () =>
      new Set(
        desktopSongs.filter((song) => song.isFavorite).map((song) => song.id),
      ),
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filterOptions = useMemo(
    () => ({
      playlist: unique(desktopSongs.flatMap((song) => song.playlists)),
      mood: unique(desktopSongs.map((song) => song.mood)),
      genre: unique(desktopSongs.map((song) => song.genre)),
      instrument: unique(desktopSongs.flatMap((song) => song.instruments)),
      vocal: unique(desktopSongs.map((song) => song.vocals)),
      build: unique(desktopSongs.map((song) => song.build)),
      bpm: ["60–90", "90–120", "120+"],
      key: unique(desktopSongs.map((song) => song.key)),
      duration: ["Under 2:00", "2:00–3:00", "Over 3:00"],
      cuePoint: ["First Hit", "Intro End", "Drop", "Break", "Button Ending"],
    }),
    [],
  );

  const filteredSongs = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return desktopSongs.filter((song) => {
      const searchableText = [
        song.title,
        song.artist,
        song.genre,
        song.mood,
        song.key,
        song.vocals,
        song.build,
        ...song.instruments,
        ...song.playlists,
      ]
        .join(" ")
        .toLowerCase();

      if (q && !searchableText.includes(q)) return false;
      if (
        filters.playlist.length &&
        !filters.playlist.some((value) => song.playlists.includes(value))
      ) {
        return false;
      }
      if (filters.mood.length && !filters.mood.includes(song.mood)) return false;
      if (filters.genre.length && !filters.genre.includes(song.genre)) return false;
      if (
        filters.instrument.length &&
        !filters.instrument.some((value) => song.instruments.includes(value))
      ) {
        return false;
      }
      if (filters.vocal.length && !filters.vocal.includes(song.vocals)) {
        return false;
      }
      if (filters.build.length && !filters.build.includes(song.build)) {
        return false;
      }
      if (filters.key.length && !filters.key.includes(song.key)) return false;
      if (!matchesDurationFilter(song.duration, filters.duration)) return false;
      if (
        filters.bpm.length &&
        !filters.bpm.some((value) => {
          if (value === "60–90") return song.bpm >= 60 && song.bpm <= 90;
          if (value === "90–120") return song.bpm >= 90 && song.bpm <= 120;
          if (value === "120+") return song.bpm >= 120;
          return true;
        })
      ) {
        return false;
      }
      if (filters.cuePoint.length && song.cuePoints <= 0) return false;

      return true;
    });
  }, [filters]);

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

  const hasActiveFilters = Boolean(
    filters.search.trim() ||
      filters.playlist.length ||
      filters.mood.length ||
      filters.genre.length ||
      filters.instrument.length ||
      filters.vocal.length ||
      filters.build.length ||
      filters.bpm.length ||
      filters.key.length ||
      filters.duration.length ||
      filters.cuePoint.length ||
      filters.markers ||
      filters.shuffle,
  );

  function toggleFilterValue(key: FilterKey, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  function removeTag(key: FilterKey, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].filter((item) => item !== value),
    }));
  }

  function toggleShuffle() {
    const nextOrder = shuffleSongList(filteredSongs).map((song) => song.id);
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

  return (
    <section className="desktop-music-page">
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
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Search Music Library"
              className="desktop-music-search-input"
            />
          </div>

          <div className="desktop-music-filter-tags" aria-label="Active filters">
            {(Object.keys(FILTER_TITLES) as FilterKey[]).flatMap((key) =>
              filters[key].map((value) => (
                <button
                  key={`${key}-${value}`}
                  className="desktop-tag-chip"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeTag(key, value);
                  }}
                >
                  {value}
                  <span aria-hidden="true">×</span>
                </button>
              )),
            )}

            {filters.markers && (
              <button
                className="desktop-tag-chip"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setFilters((current) => ({ ...current, markers: false }));
                }}
              >
                Markers
                <span aria-hidden="true">×</span>
              </button>
            )}

            {filters.shuffle && (
              <button
                className="desktop-tag-chip"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeShuffle();
                }}
              >
                Shuffle
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        </div>

        <div className="desktop-music-filter-row">
          {(Object.keys(FILTER_TITLES) as FilterKey[]).map((filterKey) => (
            <FilterDropdownButton
              key={filterKey}
              label={FILTER_TITLES[filterKey]}
              options={filterOptions[filterKey]}
              selected={filters[filterKey]}
              open={openDropdown === filterKey}
              onOpenChange={(open) => setOpenDropdown(open ? filterKey : null)}
              onToggleOption={(value) => toggleFilterValue(filterKey, value)}
            />
          ))}

          <button
            type="button"
            className={`desktop-filter-trigger${filters.markers ? " is-active" : ""}`}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                markers: !current.markers,
              }))
            }
            aria-pressed={filters.markers}
          >
            <span>Markers</span>
            {filters.markers && <span className="desktop-filter-dot" />}
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
              onClick={() => toggleFilterValue("genre", genre)}
            >
              {genre}
            </button>
          );
        })}
      </div>

      <div
        className={`desktop-music-hero-wrap${hasActiveFilters ? " is-hidden" : ""}`}
        aria-hidden={hasActiveFilters}
      >
        <div className="desktop-music-hero-grid">
          <article
            className="desktop-music-hero"
            onMouseEnter={() => setMusicHeroHovered(true)}
            onMouseLeave={() => setMusicHeroHovered(false)}
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.2) 100%), linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 100%), url("${MUSIC_HERO_IMAGE}")`,
              backgroundSize: `100% 100%, 100% 100%, ${
                musicHeroHovered ? "104%" : "100%"
              } auto`,
            }}
          >
            <div className="desktop-hero-pill">
              <MusicIcon size={11} />
              <span>Music Library</span>
            </div>

            <div>
              <h1>Find the cue that fits the cut.</h1>

              <div className="desktop-music-hero-bottom">
                <p>
                  Move through the library like a visual treatment — documentary
                  warmth, after-dark tension, open travel cues, and polished
                  brand motion.
                </p>

                <div className="desktop-music-count-pills">
                  <span>{displayedSongs.length} shown</span>
                  <span>{desktopSongs.length} songs</span>
                </div>
              </div>
            </div>
          </article>

          <article
            className="desktop-sync-hero"
            onMouseEnter={() => setDesktopSyncHovered(true)}
            onMouseLeave={() => setDesktopSyncHovered(false)}
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.78) 100%), linear-gradient(90deg, rgba(0,0,0,0.26), rgba(0,0,0,0.04)), url("${DESKTOP_SYNC_IMAGE}")`,
              backgroundSize: `100% 100%, 100% 100%, auto ${
                desktopSyncHovered ? "104%" : "100%"
              }`,
            }}
          >
            <div className="desktop-hero-pill">Desktop Sync</div>

            <div className="desktop-sync-hero-copy">
              <h2>Local files, ready to cut.</h2>
              <p>
                Sync songs to your desktop and drag them straight into Premiere,
                Resolve, or your editing timeline.
              </p>

              <button type="button" className="desktop-sync-hero-button">
                Desktop Sync
                <ArrowUpRightIcon />
              </button>
            </div>
          </article>
        </div>
      </div>

      <div
        className="desktop-music-list"
        style={{ marginTop: hasActiveFilters ? "16px" : "0px" }}
      >
        {displayedSongs.map((song, index) => (
          <DesktopSongRow
            key={song.id}
            song={song}
            favorite={favoriteIds.has(song.id)}
            isFirst={index === 0}
            isLast={index === displayedSongs.length - 1}
            markersVisible={filters.markers}
            onFavoriteToggle={() => toggleFavorite(song.id)}
          />
        ))}

        {displayedSongs.length === 0 && (
          <div className="desktop-music-empty-state">
            <h3>No songs found</h3>
            <p>Clear a filter or search for a different cue.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterDropdownButton({
  label,
  options,
  selected,
  open,
  onOpenChange,
  onToggleOption,
}: {
  label: string;
  options: string[];
  selected: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleOption: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false);
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onOpenChange]);

  return (
    <div className="desktop-filter-wrap" ref={ref}>
      <button
        type="button"
        className={`desktop-filter-trigger${open || selected.length ? " is-active" : ""}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <span>{label}</span>
        {selected.length > 0 && <span className="desktop-filter-dot" />}
      </button>

      {open && (
        <div className="desktop-filter-menu">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`desktop-filter-option${selected.includes(option) ? " is-selected" : ""}`}
              onClick={() => onToggleOption(option)}
            >
              <span>{option}</span>
              {selected.includes(option) && <span>•</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DesktopSongRow({
  song,
  favorite,
  isFirst,
  isLast,
  markersVisible,
  onFavoriteToggle,
}: {
  song: DesktopSong;
  favorite: boolean;
  isFirst: boolean;
  isLast: boolean;
  markersVisible: boolean;
  onFavoriteToggle: () => void;
}) {
  const visibleGenres = [song.genre, song.mood].filter(Boolean).join(", ");

  return (
    <article
      className={`desktop-song-row${isFirst ? " is-first" : ""}${isLast ? " is-last" : ""}`}
    >
      <button type="button" className="desktop-song-cover" aria-label="Play song">
        <span className="desktop-song-cover-text">
          {song.title.slice(0, 1).toUpperCase()}
        </span>
        <span className="desktop-song-play-overlay" aria-hidden="true">
          <PlayIcon />
        </span>
      </button>

      <div className="desktop-song-info">
        <h3>{song.title}</h3>
        <p>{song.artist}</p>
      </div>

      <div className="desktop-song-wave-wrap">
        <div className="desktop-song-stems-slot">
          {song.markers > 0 && <span>+{song.markers}</span>}
        </div>

        <div className="desktop-song-wave" aria-hidden="true">
          {song.waveform.map((height, index) => (
            <span
              key={`${song.id}-${index}`}
              style={{ height: `${Math.max(12, height)}%` }}
            />
          ))}
          {markersVisible && <i style={{ left: "34%" }} />}
          {markersVisible && <i style={{ left: "68%" }} />}
        </div>

        <span className="desktop-song-duration">{song.duration}</span>
      </div>

      <div className="desktop-song-genre-slot">
        <span>{visibleGenres}</span>
      </div>

      <div className="desktop-song-key-bpm">
        <span>{song.key || "—"}</span>
        <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>
      </div>

      <div className="desktop-song-actions">
        <button
          type="button"
          onClick={onFavoriteToggle}
          aria-label={favorite ? "Remove song from favorites" : "Favorite song"}
          className={favorite ? "is-active" : ""}
        >
          <HeartIcon size={14} filled={favorite} />
        </button>

        <button type="button" aria-label="More song actions">
          <MoreIcon size={14} />
        </button>

        <button type="button" aria-label="Download song">
          <DownloadIconSmall size={12} />
        </button>
      </div>
    </article>
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3.5L12 8L5 12.5V3.5Z" fill="currentColor" />
    </svg>
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
