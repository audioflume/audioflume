import { useEffect, useMemo, useRef, useState } from "react";
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
  | "build";

type DesktopMusicFilterState = {
  search: string;
  playlist: string[];
  mood: string[];
  genre: string[];
  instrument: string[];
  vocal: string[];
  build: string[];
};

const QUICK_GENRES = ["Ambient", "Cinematic", "Commercial", "Indie"];

const FILTER_TITLES: Record<FilterKey, string> = {
  playlist: "Playlists",
  mood: "Mood",
  genre: "Genre",
  instrument: "Instruments",
  vocal: "Vocals",
  build: "Build",
};

const SHELL_FILTERS = ["BPM", "Key", "Duration", "Cue Points", "Markers"];

const MUSIC_HERO_IMAGE =
  "https://images.unsplash.com/photo-1556139930-c23fa4a4f934?q=80&w=2070&auto=format&fit=crop";
const DESKTOP_SYNC_IMAGE =
  "https://images.unsplash.com/photo-1686519093104-3140c6dcf284?q=80&w=2070&auto=format&fit=crop";

export default function DesktopMusicLibraryView() {
  const [filters, setFilters] = useState<DesktopMusicFilterState>({
    search: "",
    playlist: [],
    mood: [],
    genre: [],
    instrument: [],
    vocal: [],
    build: [],
  });
  const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);
  const [musicHeroHovered, setMusicHeroHovered] = useState(false);
  const [desktopSyncHovered, setDesktopSyncHovered] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(desktopSongs.filter((song) => song.isFavorite).map((song) => song.id)),
  );

  const filterOptions = useMemo(() => {
    const unique = (items: string[]) => [...new Set(items)].sort((a, b) => a.localeCompare(b));
    return {
      playlist: unique(desktopSongs.flatMap((song) => song.playlists)),
      mood: unique(desktopSongs.map((song) => song.mood)),
      genre: unique(desktopSongs.map((song) => song.genre)),
      instrument: unique(desktopSongs.flatMap((song) => song.instruments)),
      vocal: unique(desktopSongs.map((song) => song.vocals)),
      build: unique(desktopSongs.map((song) => song.build)),
    };
  }, []);

  const filteredSongs = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return desktopSongs.filter((song) => {
      const searchableText = [song.title, song.artist, song.genre, song.mood, ...song.instruments].join(" ").toLowerCase();
      if (q && !searchableText.includes(q)) return false;
      if (filters.playlist.length && !filters.playlist.some((value) => song.playlists.includes(value))) return false;
      if (filters.mood.length && !filters.mood.includes(song.mood)) return false;
      if (filters.genre.length && !filters.genre.includes(song.genre)) return false;
      if (filters.instrument.length && !filters.instrument.some((value) => song.instruments.includes(value))) return false;
      if (filters.vocal.length && !filters.vocal.includes(song.vocals)) return false;
      if (filters.build.length && !filters.build.includes(song.build)) return false;
      return true;
    });
  }, [filters]);

  const hasActiveFilters = Boolean(
    filters.search.trim() ||
      filters.playlist.length ||
      filters.mood.length ||
      filters.genre.length ||
      filters.instrument.length ||
      filters.vocal.length ||
      filters.build.length,
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
    setFilters((current) => ({ ...current, [key]: current[key].filter((item) => item !== value) }));
  }

  return (
    <section className="desktop-music-page">
      <div className="desktop-music-top sticky">
        <div className="desktop-music-search-shell">
          <SearchIconSmall size={13} className="desktop-music-search-icon" />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search Music Library"
            className="desktop-music-search-input"
          />
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

          {SHELL_FILTERS.map((label) => (
            <button key={label} type="button" className="desktop-filter-trigger is-shell">
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="desktop-music-filter-tags">
        {(Object.keys(FILTER_TITLES) as FilterKey[]).flatMap((key) =>
          filters[key].map((value) => (
            <button key={`${key}-${value}`} className="desktop-tag-chip" type="button" onClick={() => removeTag(key, value)}>
              {value} <span aria-hidden="true">×</span>
            </button>
          )),
        )}
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

      <div className={`desktop-music-hero-wrap${hasActiveFilters ? " is-hidden" : ""}`}>
        <div className="desktop-music-hero-grid">
          <article
            className="desktop-music-hero"
            onMouseEnter={() => setMusicHeroHovered(true)}
            onMouseLeave={() => setMusicHeroHovered(false)}
            style={{ backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.38)), url(${MUSIC_HERO_IMAGE})`, backgroundSize: musicHeroHovered ? "104%" : "100%" }}
          >
            <div className="desktop-hero-pill"><MusicIcon size={11} /> Music Library</div>
            <h1>Find the cue that fits the cut.</h1>
            <p>Move through the library like a visual treatment — documentary warmth, after-dark tension, open travel cues, and polished brand motion.</p>
          </article>
          <article
            className="desktop-sync-hero"
            onMouseEnter={() => setDesktopSyncHovered(true)}
            onMouseLeave={() => setDesktopSyncHovered(false)}
            style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.78)), url(${DESKTOP_SYNC_IMAGE})`, backgroundSize: desktopSyncHovered ? "104%" : "100%" }}
          >
            <div className="desktop-hero-pill">Desktop Sync</div>
            <h2>Local files, ready to cut.</h2>
          </article>
        </div>
      </div>

      <div className="desktop-music-list">
        {filteredSongs.map((song) => (
          <DesktopSongRow key={song.id} song={song} favorite={favoriteIds.has(song.id)} onFavoriteToggle={() => {
            setFavoriteIds((current) => {
              const next = new Set(current);
              if (next.has(song.id)) next.delete(song.id);
              else next.add(song.id);
              return next;
            });
          }} />
        ))}
      </div>
    </section>
  );
}

function FilterDropdownButton({ label, options, selected, open, onOpenChange, onToggleOption }: { label: string; options: string[]; selected: string[]; open: boolean; onOpenChange: (open: boolean) => void; onToggleOption: (value: string) => void; }) {
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
      <button type="button" className={`desktop-filter-trigger${open || selected.length ? " is-active" : ""}`} onClick={() => onOpenChange(!open)}>
        {label}
      </button>
      {open && (
        <div className="desktop-filter-menu">
          {options.map((option) => (
            <button key={option} type="button" className={`desktop-filter-option${selected.includes(option) ? " is-selected" : ""}`} onClick={() => onToggleOption(option)}>
              <span>{option}</span>
              {selected.includes(option) && <span>•</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DesktopSongRow({ song, favorite, onFavoriteToggle }: { song: DesktopSong; favorite: boolean; onFavoriteToggle: () => void }) {
  return (
    <article className="desktop-song-row">
      <button type="button" className="desktop-song-cover" aria-label="Play song">
        <span>▶</span>
      </button>
      <div className="desktop-song-info"><h3>{song.title}</h3><p>{song.artist}</p></div>
      <div className="desktop-song-wave">{song.waveform.map((h, i) => <span key={i} style={{ height: `${Math.max(12, h)}%` }} />)}</div>
      <div className="desktop-song-meta"><span>{song.genre}</span><span>{song.key || "—"}</span><span>{song.bpm ? `${song.bpm} BPM` : "—"}</span><span>{song.duration}</span></div>
      <div className="desktop-song-actions"><button type="button" onClick={onFavoriteToggle}><HeartIcon size={14} filled={favorite} /></button><button type="button"><MoreIcon size={14} /></button><button type="button"><DownloadIconSmall size={12} /></button></div>
    </article>
  );
}
