"use client";

import {
  BUILD_OPTIONS,
  EDIT_POINT_FILTER_OPTIONS,
  filterMusicLibrarySongs,
  GENRE_OPTIONS,
  getMusicLibrarySearchPlaceholder,
  getMusicSongIdentityValues,
  getMusicSongStableId,
  getPlaylistSongIdsFromResponse,
  INSTRUMENT_OPTIONS,
  isCoreEditPointType,
  MOOD_OPTIONS,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
  MusicFilterPanel,
  MusicListShell,
  MusicQuickChip,
  MusicQuickChips,
  QUICK_FILTERS,
  REGION_OPTIONS,
  songMatchesEditPointFilter,
  VOCALS_OPTIONS,
} from "@filmwave/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { BpmFilterValue, KeyFilterValue } from "@/lib/types";

import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useSongs } from "@/hooks/useSongs";

import { usePlayer } from "@/context/PlayerContext";

import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import XIcon from "@/components/icons/XIcon";

import "./music-library-redesign.css";

const INSTRUMENTAL_VOCAL_FILTER_OPTION = "Instrumental";
const LYRICAL_VOCAL_FILTER_OPTION = "Lyrical";
const VOCAL_FILTER_OPTIONS = [
  INSTRUMENTAL_VOCAL_FILTER_OPTION,
  LYRICAL_VOCAL_FILTER_OPTION,
  ...VOCALS_OPTIONS,
];
const LICENSE_FILTER_STORAGE_KEY = "filmwave-license-filter";
const LICENSE_FILTER_CHANGE_EVENT = "filmwave:license-filter-change";
const LICENSE_FILTER_VALUES = ["standard", "premium"] as const;
const SEMANTIC_SEARCH_DEBOUNCE_MS = 350;
const MIN_SEMANTIC_SEARCH_LENGTH = 2;

type LicenseFilterValue = (typeof LICENSE_FILTER_VALUES)[number];
type SemanticSearchState =
  | {
      query: string;
      status: "success";
      songIds: string[];
    }
  | {
      query: string;
      status: "failed";
      songIds: [];
    };

function getStoredLicenseFilters(): LicenseFilterValue[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(LICENSE_FILTER_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed)].filter(
      (value): value is LicenseFilterValue =>
        value === "standard" || value === "premium",
    );
  } catch {
    return [];
  }
}

function normalizeFilterValue(value: string) {
  return value.trim().toLowerCase();
}

const DIRECT_FILTER_SEARCH_TERMS = new Set(
  [
    ...MOOD_OPTIONS,
    ...GENRE_OPTIONS,
    ...REGION_OPTIONS,
    ...INSTRUMENT_OPTIONS,
    ...BUILD_OPTIONS,
    ...VOCALS_OPTIONS,
  ].map(normalizeFilterValue),
);

function isDirectFilterSearch(value: string) {
  return DIRECT_FILTER_SEARCH_TERMS.has(normalizeFilterValue(value));
}

function toFilterStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(toFilterStringArray);
  }

  if (typeof value !== "string") return [];

  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSongField(song: unknown, field: string) {
  if (!song || typeof song !== "object") return undefined;
  return (song as Record<string, unknown>)[field];
}

function getSongFilterValues(song: unknown, fields: string[]) {
  return fields.flatMap((field) =>
    toFilterStringArray(getSongField(song, field)),
  );
}

function optionIsUsedBySongValues(values: string[], option: string) {
  const normalizedOption = normalizeFilterValue(option);

  return values.some(
    (value) => normalizeFilterValue(value) === normalizedOption,
  );
}

function filterOptionsWithSongs<T extends string>(
  options: readonly T[],
  songs: readonly unknown[],
  fields: string[],
) {
  return options.filter((option) =>
    songs.some((song) =>
      optionIsUsedBySongValues(getSongFilterValues(song, fields), option),
    ),
  );
}

function getArtistFilterOptions(songs: readonly unknown[]) {
  const artists = new Map<string, string>();

  songs.forEach((song) => {
    const artist = String(getSongField(song, "artist") ?? "").trim();
    if (!artist) return;

    const normalizedArtist = normalizeFilterValue(artist);
    if (!artists.has(normalizedArtist)) artists.set(normalizedArtist, artist);
  });

  return [...artists.values()].sort((a, b) => a.localeCompare(b));
}

function songIsInstrumental(song: unknown) {
  return getSongField(song, "instrumental") === true;
}

function songIsLyrical(song: unknown) {
  return !songIsInstrumental(song);
}

export default function MusicPage() {
  const { userId, isLoaded } = useAuth();
  const musicFilterStorageKey = userId
    ? `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${userId}`
    : null;

  const {
    filters,
    setFilters,
    hydrated: filtersHydrated,
  } = useFilterPersistence({
    storageKey: musicFilterStorageKey,
    authLoaded: isLoaded,
  });

  const { songs, loading: songsLoading, error: songsError } = useSongs();
  const { playlists } = usePlaylists();

  const { currentSong, setQueue } = usePlayer();
  const playerVisible = Boolean(currentSong);

  const [playlistSongIdsByPlaylistId, setPlaylistSongIdsByPlaylistId] =
    useState<Record<string, Set<string>>>({});
  const [selectedPlaylistSongIds, setSelectedPlaylistSongIds] =
    useState<Set<string> | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLicenseFilters, setSelectedLicenseFilters] =
    useState<LicenseFilterValue[]>([]);
  const [semanticSearchState, setSemanticSearchState] =
    useState<SemanticSearchState | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function syncLicenseFilters() {
      setSelectedLicenseFilters(getStoredLicenseFilters());
    }

    syncLicenseFilters();
    window.addEventListener(LICENSE_FILTER_CHANGE_EVENT, syncLicenseFilters);

    return () => {
      window.removeEventListener(LICENSE_FILTER_CHANGE_EVENT, syncLicenseFilters);
    };
  }, []);

  const search = filters.search;
  const directFilterSearch = isDirectFilterSearch(search);
  const selectedMoods = filters.selectedMoods;
  const selectedGenres = filters.selectedGenres;
  const selectedArtists = filters.selectedArtists;
  const selectedRegions = filters.selectedRegions;
  const selectedInstruments = filters.selectedInstruments;
  const selectedBuilds = filters.selectedBuilds;
  const selectedVocals = filters.selectedVocals;
  const selectedDurations = filters.selectedDurations;
  const selectedEditPoints = filters.selectedEditPoints;
  const instrumental = filters.instrumental;
  const bpmValue = filters.bpmValue;
  const keyValue = filters.keyValue;
  const selectedPlaylist = filters.selectedPlaylist;
  const selectedPlaylistId = selectedPlaylist?.id ?? null;

  const highlightedEditPointTypes =
    selectedEditPoints.filter(isCoreEditPointType);

  const setSearch = (value: string) =>
    setFilters((current) => ({ ...current, search: value }));
  const setSelectedMoods = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedMoods: values }));
  const setSelectedGenres = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedGenres: values }));
  const setSelectedArtists = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedArtists: values }));
  const setSelectedRegions = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedRegions: values }));
  const setSelectedInstruments = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedInstruments: values }));
  const setSelectedBuilds = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedBuilds: values }));
  const setSelectedVocals = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedVocals: values }));
  const setSelectedDurations = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedDurations: values }));
  const setSelectedEditPoints = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedEditPoints: values }));
  const setInstrumental = (value: boolean) =>
    setFilters((current) => ({ ...current, instrumental: value }));
  const setBpmValue = (value: BpmFilterValue | null) =>
    setFilters((current) => ({ ...current, bpmValue: value }));
  const setKeyValue = (value: KeyFilterValue | null) =>
    setFilters((current) => ({ ...current, keyValue: value }));
  const setShowEditPointMarkers = (value: boolean) =>
    setFilters((current) => ({ ...current, showEditPointMarkers: value }));

  const availableFilterOptions = useMemo(() => {
    const moods = filterOptionsWithSongs(MOOD_OPTIONS, songs, [
      "moods",
      "mood",
    ]);
    const genres = filterOptionsWithSongs(GENRE_OPTIONS, songs, [
      "genres",
      "genre",
    ]);
    const artists = getArtistFilterOptions(songs);
    const regions = filterOptionsWithSongs(REGION_OPTIONS, songs, [
      "regions",
      "region",
    ]);
    const instruments = filterOptionsWithSongs(INSTRUMENT_OPTIONS, songs, [
      "instruments",
    ]);
    const builds = filterOptionsWithSongs(BUILD_OPTIONS, songs, [
      "builds",
      "build",
    ]);
    const vocals = filterOptionsWithSongs(VOCALS_OPTIONS, songs, ["vocals"]);
    const vocalFilters = [
      ...(songs.some(songIsInstrumental)
        ? [INSTRUMENTAL_VOCAL_FILTER_OPTION]
        : []),
      ...(songs.some(songIsLyrical) ? [LYRICAL_VOCAL_FILTER_OPTION] : []),
      ...vocals,
    ];
    const cuePoints = EDIT_POINT_FILTER_OPTIONS.filter((option) =>
      songs.some((song) => songMatchesEditPointFilter(song, option.type)),
    );
    const quickFilters = [...QUICK_FILTERS];

    return {
      moods,
      genres,
      artists,
      regions,
      instruments,
      builds,
      vocals: vocalFilters,
      cuePoints,
      quickFilters,
    };
  }, [songs]);

  const selectedVocalFilters = instrumental
    ? [INSTRUMENTAL_VOCAL_FILTER_OPTION, ...selectedVocals]
    : selectedVocals;

  function toggleVocalFilter(option: string) {
    if (option === INSTRUMENTAL_VOCAL_FILTER_OPTION) {
      setFilters((current) => {
        const nextInstrumental = !current.instrumental;

        return {
          ...current,
          instrumental: nextInstrumental,
          selectedVocals: nextInstrumental
            ? current.selectedVocals.filter(
                (value) => value !== LYRICAL_VOCAL_FILTER_OPTION,
              )
            : current.selectedVocals,
        };
      });
      return;
    }

    if (option === LYRICAL_VOCAL_FILTER_OPTION) {
      setFilters((current) => {
        const isSelected = current.selectedVocals.includes(
          LYRICAL_VOCAL_FILTER_OPTION,
        );

        return {
          ...current,
          instrumental: false,
          selectedVocals: isSelected
            ? current.selectedVocals.filter(
                (value) => value !== LYRICAL_VOCAL_FILTER_OPTION,
              )
            : [...current.selectedVocals, LYRICAL_VOCAL_FILTER_OPTION],
        };
      });
      return;
    }

    setFilters((current) => ({
      ...current,
      selectedVocals: current.selectedVocals.includes(option)
        ? current.selectedVocals.filter((value) => value !== option)
        : [...current.selectedVocals, option],
    }));
  }

  function toggleIn(values: string[], setValues: (next: string[]) => void) {
    return (option: string) =>
      setValues(
        values.includes(option)
          ? values.filter((item) => item !== option)
          : [...values, option],
      );
  }

  const playlistChipOptions = useMemo(
    () =>
      playlists.map((playlist) => ({
        id: String(playlist.id),
        name: playlist.name,
      })),
    [playlists],
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedMoods.length > 0 ||
    selectedGenres.length > 0 ||
    selectedArtists.length > 0 ||
    selectedRegions.length > 0 ||
    selectedInstruments.length > 0 ||
    selectedBuilds.length > 0 ||
    selectedVocals.length > 0 ||
    selectedDurations.length > 0 ||
    selectedEditPoints.length > 0 ||
    instrumental ||
    bpmValue !== null ||
    keyValue !== null ||
    selectedPlaylist !== null;

  const hasActiveClearableFilters =
    selectedMoods.length > 0 ||
    selectedGenres.length > 0 ||
    selectedArtists.length > 0 ||
    selectedRegions.length > 0 ||
    selectedInstruments.length > 0 ||
    selectedBuilds.length > 0 ||
    selectedVocals.length > 0 ||
    selectedDurations.length > 0 ||
    selectedEditPoints.length > 0 ||
    instrumental ||
    bpmValue !== null ||
    keyValue !== null ||
    selectedPlaylist !== null ||
    selectedLicenseFilters.length > 0;

  const activeFilterCount =
    selectedMoods.length +
    selectedGenres.length +
    selectedArtists.length +
    selectedRegions.length +
    selectedInstruments.length +
    selectedVocalFilters.length +
    selectedBuilds.length +
    selectedDurations.length +
    selectedEditPoints.length +
    selectedLicenseFilters.length +
    (bpmValue !== null ? 1 : 0) +
    (keyValue !== null ? 1 : 0) +
    (selectedPlaylist !== null ? 1 : 0);

  function clearLicenseFilters() {
    setSelectedLicenseFilters([]);

    try {
      window.localStorage.removeItem(LICENSE_FILTER_STORAGE_KEY);
    } catch {
      // Ignore storage failures; local state is already cleared.
    }

    window.dispatchEvent(new Event(LICENSE_FILTER_CHANGE_EVENT));
  }

  function clearAllFilters() {
    setFilters((current) => ({
      ...current,
      selectedMoods: [],
      selectedGenres: [],
      selectedArtists: [],
      selectedRegions: [],
      selectedInstruments: [],
      selectedBuilds: [],
      selectedVocals: [],
      selectedDurations: [],
      selectedEditPoints: [],
      instrumental: false,
      bpmValue: null,
      keyValue: null,
      selectedPlaylist: null,
    }));
    clearLicenseFilters();
  }

  const searchPlaceholder = getMusicLibrarySearchPlaceholder(
    selectedPlaylist?.name,
  );

  const effectiveShowEditPointMarkers = filters.showEditPointMarkers;

  useEffect(() => {
    const query = search.trim();

    if (
      !userId ||
      !filtersHydrated ||
      directFilterSearch ||
      query.length < MIN_SEMANTIC_SEARCH_LENGTH
    ) {
      setSemanticSearchState(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/music/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Semantic search request failed");
        }

        const data = await response.json();
        const songIds = Array.isArray(data?.matches)
          ? data.matches.flatMap((match: unknown) => {
              if (!match || typeof match !== "object") return [];
              const songId = (match as Record<string, unknown>).songId;
              return typeof songId === "string" && songId ? [songId] : [];
            })
          : [];

        setSemanticSearchState({ query, status: "success", songIds });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Semantic music search failed:", error);
        setSemanticSearchState({ query, status: "failed", songIds: [] });
      }
    }, SEMANTIC_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [directFilterSearch, filtersHydrated, search, userId]);

  useEffect(() => {
    if (!userId || !selectedPlaylistId) return;

    const playlistId = selectedPlaylistId;

    if (playlistSongIdsByPlaylistId[playlistId]) {
      setSelectedPlaylistSongIds(playlistSongIdsByPlaylistId[playlistId]);
      return;
    }

    let cancelled = false;

    async function loadPlaylistSongs() {
      setSelectedPlaylistSongIds(null);

      try {
        const res = await fetch(`/api/playlists/${playlistId}/songs`);
        if (!res.ok) throw new Error("Failed to load playlist songs");
        const data = await res.json();
        const ids = getPlaylistSongIdsFromResponse(data);

        if (cancelled) return;
        setPlaylistSongIdsByPlaylistId((current) => ({
          ...current,
          [playlistId]: ids,
        }));
        setSelectedPlaylistSongIds(ids);
      } catch (error) {
        console.error(error);
        if (!cancelled) setSelectedPlaylistSongIds(new Set());
      }
    }

    void loadPlaylistSongs();

    return () => {
      cancelled = true;
    };
  }, [playlistSongIdsByPlaylistId, selectedPlaylistId, userId]);

  useEffect(() => {
    if (!selectedPlaylistId) setSelectedPlaylistSongIds(null);
  }, [selectedPlaylistId]);

  useEffect(() => {
    if (!filtersHydrated || songsLoading || songs.length === 0) return;

    setFilters((current) => {
      const availableMoods = availableFilterOptions.moods as readonly string[];
      const availableGenres =
        availableFilterOptions.genres as readonly string[];
      const availableArtists =
        availableFilterOptions.artists as readonly string[];
      const availableRegions =
        availableFilterOptions.regions as readonly string[];
      const availableInstruments =
        availableFilterOptions.instruments as readonly string[];
      const availableBuilds =
        availableFilterOptions.builds as readonly string[];
      const availableVocals =
        availableFilterOptions.vocals as readonly string[];

      const nextSelectedMoods = current.selectedMoods.filter((value) =>
        availableMoods.includes(value),
      );
      const nextSelectedGenres = current.selectedGenres.filter((value) =>
        availableGenres.includes(value),
      );
      const nextSelectedArtists = current.selectedArtists.filter((value) =>
        availableArtists.includes(value),
      );
      const nextSelectedRegions = current.selectedRegions.filter((value) =>
        availableRegions.includes(value),
      );
      const nextSelectedInstruments = current.selectedInstruments.filter(
        (value) => availableInstruments.includes(value),
      );
      const nextSelectedBuilds = current.selectedBuilds.filter((value) =>
        availableBuilds.includes(value),
      );
      const nextSelectedVocals = current.selectedVocals.filter((value) =>
        availableVocals.includes(value),
      );
      const nextSelectedEditPoints = current.selectedEditPoints.filter((type) =>
        availableFilterOptions.cuePoints.some((option) => option.type === type),
      );
      const nextInstrumental =
        current.instrumental &&
        availableVocals.includes(INSTRUMENTAL_VOCAL_FILTER_OPTION);

      const changed =
        nextSelectedMoods.length !== current.selectedMoods.length ||
        nextSelectedGenres.length !== current.selectedGenres.length ||
        nextSelectedArtists.length !== current.selectedArtists.length ||
        nextSelectedRegions.length !== current.selectedRegions.length ||
        nextSelectedInstruments.length !== current.selectedInstruments.length ||
        nextSelectedBuilds.length !== current.selectedBuilds.length ||
        nextSelectedVocals.length !== current.selectedVocals.length ||
        nextSelectedEditPoints.length !== current.selectedEditPoints.length ||
        nextInstrumental !== current.instrumental;

      if (!changed) return current;

      return {
        ...current,
        selectedMoods: nextSelectedMoods,
        selectedGenres: nextSelectedGenres,
        selectedArtists: nextSelectedArtists,
        selectedRegions: nextSelectedRegions,
        selectedInstruments: nextSelectedInstruments,
        selectedBuilds: nextSelectedBuilds,
        selectedVocals: nextSelectedVocals,
        selectedEditPoints: nextSelectedEditPoints,
        instrumental: nextInstrumental,
      };
    });
  }, [
    availableFilterOptions,
    filtersHydrated,
    setFilters,
    songs.length,
    songsLoading,
  ]);

  const filteredSongs = useMemo(() => {
    if (!filtersHydrated) return [];

    const playlistSongs = selectedPlaylistId
      ? songs.filter((song) => {
          if (!selectedPlaylistSongIds) return false;
          const identityValues = getMusicSongIdentityValues(song);
          return identityValues.some((id) => selectedPlaylistSongIds.has(id));
        })
      : songs;

    const licenseSongs =
      selectedLicenseFilters.length === 0 || selectedLicenseFilters.length === 2
        ? playlistSongs
        : playlistSongs.filter((song) => {
            const licenseType: LicenseFilterValue =
              song.licenseType === "premium" ? "premium" : "standard";
            return selectedLicenseFilters.includes(licenseType);
          });

    const artistSongs =
      selectedArtists.length === 0
        ? licenseSongs
        : licenseSongs.filter((song) => {
            const artist = normalizeFilterValue(String(song.artist ?? ""));
            return selectedArtists.some(
              (selectedArtist) =>
                normalizeFilterValue(selectedArtist) === artist,
            );
          });
    const lyrical = selectedVocals.includes(LYRICAL_VOCAL_FILTER_OPTION);
    const selectedVocalCharacteristics = selectedVocals.filter(
      (value) => value !== LYRICAL_VOCAL_FILTER_OPTION,
    );
    const vocalTypeSongs = lyrical
      ? artistSongs.filter(songIsLyrical)
      : artistSongs;

    const cleanSearch = search.trim();
    const semanticSongIds =
      semanticSearchState?.status === "success" &&
      semanticSearchState.query === cleanSearch
        ? semanticSearchState.songIds
        : null;
    const semanticOrder = semanticSongIds
      ? new Map(semanticSongIds.map((songId, index) => [songId, index]))
      : null;

    const nextSongs = filterMusicLibrarySongs(vocalTypeSongs, {
      search: semanticOrder ? "" : search,
      selectedMoods,
      selectedGenres,
      selectedRegions,
      selectedInstruments,
      selectedBuilds,
      selectedVocals: selectedVocalCharacteristics,
      selectedDurations,
      selectedEditPoints,
      instrumental,
      bpmValue,
      keyValue,
    });

    if (!semanticOrder) return nextSongs;

    return nextSongs
      .flatMap((song) => {
        const order = getMusicSongIdentityValues(song).reduce<number | null>(
          (currentOrder, id) => {
            const nextOrder = semanticOrder.get(id);
            if (nextOrder === undefined) return currentOrder;
            if (currentOrder === null) return nextOrder;
            return Math.min(currentOrder, nextOrder);
          },
          null,
        );

        return order === null ? [] : [{ song, order }];
      })
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.song);
  }, [
    bpmValue,
    filtersHydrated,
    instrumental,
    keyValue,
    search,
    selectedArtists,
    selectedBuilds,
    selectedDurations,
    selectedEditPoints,
    selectedGenres,
    selectedInstruments,
    selectedLicenseFilters,
    selectedMoods,
    selectedPlaylistId,
    selectedPlaylistSongIds,
    selectedRegions,
    selectedVocals,
    semanticSearchState,
    songs,
  ]);

  const displayedSongs = filteredSongs;

  useEffect(() => {
    setQueue(displayedSongs);
  }, [displayedSongs, setQueue]);

  const loadingPlaylistSongs =
    !!selectedPlaylistId && selectedPlaylistSongIds === null;

  const showSongSkeleton =
    !songsError &&
    ((songsLoading && songs.length === 0) || loadingPlaylistSongs);

  const filterChipGroups = [
    {
      id: "mood",
      label: "Scene",
      options: availableFilterOptions.moods,
      selected: selectedMoods,
      onToggle: toggleIn(selectedMoods, setSelectedMoods),
    },
    {
      id: "genre",
      label: "Genre",
      options: availableFilterOptions.genres,
      selected: selectedGenres,
      onToggle: toggleIn(selectedGenres, setSelectedGenres),
    },
    {
      id: "artist",
      label: "Artists",
      options: availableFilterOptions.artists,
      selected: selectedArtists,
      onToggle: toggleIn(selectedArtists, setSelectedArtists),
    },
    {
      id: "region",
      label: "Region",
      options: availableFilterOptions.regions,
      selected: selectedRegions,
      onToggle: toggleIn(selectedRegions, setSelectedRegions),
    },
    {
      id: "instruments",
      label: "Instruments",
      options: availableFilterOptions.instruments,
      selected: selectedInstruments,
      onToggle: toggleIn(selectedInstruments, setSelectedInstruments),
    },
    {
      id: "vocals",
      label: "Vocals",
      options: availableFilterOptions.vocals,
      selected: selectedVocalFilters,
      onToggle: toggleVocalFilter,
    },
    {
      id: "build",
      label: "Build",
      options: availableFilterOptions.builds,
      selected: selectedBuilds,
      onToggle: toggleIn(selectedBuilds, setSelectedBuilds),
    },
    {
      id: "cuePoints",
      label: "Cue Points",
      options: availableFilterOptions.cuePoints.map((option) => option.label),
      selected: availableFilterOptions.cuePoints
        .filter((option) => selectedEditPoints.includes(option.type))
        .map((option) => option.label),
      onToggle: (label: string) => {
        const option = availableFilterOptions.cuePoints.find(
          (item) => item.label === label,
        );
        if (!option) return;

        setSelectedEditPoints(
          selectedEditPoints.includes(option.type)
            ? selectedEditPoints.filter((type) => type !== option.type)
            : [...selectedEditPoints, option.type],
        );
      },
    },
  ];

  return (
    <main className="audioflume-music-page min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div
        className={`audioflume-music-page-searchbar${filtersOpen ? " is-filters-open" : ""}`}
      >
        <button
          type="button"
          className="audioflume-home-reference-searchbar-filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" />
          </svg>
          <span>Filters</span>
        </button>

        <label className="audioflume-home-reference-searchbar-field">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {search.length > 0 ? (
            <button
              type="button"
              className="audioflume-home-reference-searchbar-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <XIcon size={8} />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          className="audioflume-home-reference-searchbar-song"
          aria-label="Search by song"
        >
          Search by song
        </button>
      </div>

      <section
        className={`min-h-screen pt-14 transition-[margin-left] duration-200 ${
          filtersOpen ? "ml-[var(--sidebar-width)]" : "ml-0"
        }`}
      >
        <div className="fw-music-content-column">
          <MusicFilterPanel
            open={filtersOpen}
            accordion
            groups={filterChipGroups}
            playlists={playlistChipOptions}
            selectedPlaylistId={
              selectedPlaylistId ? String(selectedPlaylistId) : null
            }
            onSelectPlaylist={(playlist) =>
              setFilters((current) => ({
                ...current,
                selectedPlaylist: playlist
                  ? { id: playlist.id, name: playlist.name }
                  : null,
              }))
            }
            bpmValue={bpmValue}
            onBpmChange={setBpmValue}
            keyValue={keyValue}
            onKeyChange={setKeyValue}
            selectedDurations={selectedDurations}
            onDurationsChange={setSelectedDurations}
            groupAdvancedControls
            advancedGroupIds={["build", "region"]}
            markersActive={effectiveShowEditPointMarkers}
            markersDisabled={!filtersHydrated}
            onToggleMarkers={() =>
              setShowEditPointMarkers(!effectiveShowEditPointMarkers)
            }
            hasActive={hasActiveClearableFilters}
            onClearAll={clearAllFilters}
            onClose={() => setFiltersOpen(false)}
          />
          <MusicQuickChips>
            {availableFilterOptions.quickFilters.map((filter) => {
              const isActive = selectedGenres.includes(filter);

              return (
                <MusicQuickChip
                  key={filter}
                  active={isActive}
                  onClick={() =>
                    setSelectedGenres(
                      isActive
                        ? selectedGenres.filter((genre) => genre !== filter)
                        : [...selectedGenres, filter],
                    )
                  }
                >
                  {filter}
                </MusicQuickChip>
              );
            })}
          </MusicQuickChips>

          {songsError && (
            <div className="px-5 py-4 text-sm text-[var(--danger)]">
              Failed to load songs. Showing cached results where available.
            </div>
          )}

          <MusicListShell
            title={selectedPlaylist ? selectedPlaylist.name : "All tracks"}
            meta={`${displayedSongs.length} of ${songs.length} tracks`}
          >
            {showSongSkeleton ? (
              <SkeletonSongList />
            ) : (
              displayedSongs.map((song, index) => (
                <SongCard
                  key={getMusicSongStableId(song, index)}
                  song={song}
                  highlightedEditPointTypes={highlightedEditPointTypes}
                  showEditPointMarkers={effectiveShowEditPointMarkers}
                />
              ))
            )}
          </MusicListShell>
        </div>

        <Footer playerPadding={playerVisible} />
      </section>
    </main>
  );
}
