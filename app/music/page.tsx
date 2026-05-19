"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { BpmFilterValue, KeyFilterValue, PlaylistRef } from "@/lib/types";
import {
  MOOD_OPTIONS,
  GENRE_OPTIONS,
  INSTRUMENT_OPTIONS,
  BUILD_OPTIONS,
  VOCALS_OPTIONS,
  QUICK_FILTERS,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
} from "@/lib/constants";
import {
  includesAll,
  matchesDurationFilter,
  matchesBpmFilter,
  matchesKeyFilter,
} from "@/lib/filterUtils";
import {
  EDIT_POINT_FILTER_OPTIONS,
  songMatchesEditPointFilters,
} from "@/lib/editPointUtils";
import { getRecord, getStringFromRecord } from "@/lib/utils";

import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import { useSongs } from "@/hooks/useSongs";

import { usePlayer } from "@/context/PlayerContext";

import FilterTags from "@/components/FilterTags";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import MusicIcon from "@/components/icons/MusicIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import {
  iconButtonClass,
  primaryPillButtonClass,
  quickFilterButtonClass,
  quickFilterButtonActiveClass,
} from "@/components/uiClasses";
import { filterDotClass } from "@/components/filterUiClasses";

type TagFilterCategoryId =
  | "moods"
  | "genres"
  | "vocals"
  | "duration"
  | "bpm"
  | "key"
  | "instruments"
  | "builds"
  | "cuePoints";

type TagFilterOption = {
  label: string;
  count: number;
  active: boolean;
  onToggle: () => void;
};

type TagFilterCategory = {
  id: TagFilterCategoryId;
  label: string;
  activeCount: number;
  options: TagFilterOption[];
};

const DURATION_TAG_OPTIONS = [
  "0:00 - 1:00",
  "1:00 - 2:00",
  "2:00 - 3:00",
  "3:00 - 4:00",
  "4:00+",
];

const BPM_TAG_OPTIONS: { label: string; value: BpmFilterValue }[] = [
  { label: "Under 80", value: { mode: "range", low: 1, high: 80, exact: 1 } },
  { label: "80 - 100", value: { mode: "range", low: 80, high: 100, exact: 1 } },
  { label: "100 - 120", value: { mode: "range", low: 100, high: 120, exact: 1 } },
  { label: "120 - 140", value: { mode: "range", low: 120, high: 140, exact: 1 } },
  { label: "140+", value: { mode: "range", low: 140, high: 300, exact: 1 } },
];

const KEY_TAG_OPTIONS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
];

function getSongIdentityValues(song: unknown) {
  const record = getRecord(song);
  const fields =
    typeof record.fields === "object" && record.fields !== null
      ? getRecord(record.fields)
      : null;

  const values = [
    getStringFromRecord(record, [
      "id",
      "songId",
      "song_id",
      "airtableId",
      "airtable_id",
      "airtableRecordId",
      "recordId",
    ]),
    fields
      ? getStringFromRecord(fields, [
          "id",
          "songId",
          "song_id",
          "airtableId",
          "airtable_id",
          "airtableRecordId",
          "recordId",
        ])
      : "",
  ];

  return values.filter(Boolean);
}

function getSongStableId(song: unknown, fallbackIndex = 0) {
  return getSongIdentityValues(song)[0] || String(fallbackIndex);
}

function getPlaylistSongIdsFromResponse(data: unknown) {
  const record = getRecord(data);

  const rows = Array.isArray(data)
    ? data
    : Array.isArray(record.songs)
      ? record.songs
      : Array.isArray(record.playlistSongs)
        ? record.playlistSongs
        : Array.isArray(record.items)
          ? record.items
          : Array.isArray(record.data)
            ? record.data
            : [];

  const ids = new Set<string>();

  rows.forEach((row) => {
    const rowRecord = getRecord(row);
    const fields =
      typeof rowRecord.fields === "object" && rowRecord.fields !== null
        ? getRecord(rowRecord.fields)
        : null;
    const song =
      typeof rowRecord.song === "object" && rowRecord.song !== null
        ? getRecord(rowRecord.song)
        : null;

    [
      getStringFromRecord(rowRecord, [
        "id",
        "songId",
        "song_id",
        "airtableId",
        "airtable_id",
        "airtableRecordId",
        "recordId",
      ]),
      fields
        ? getStringFromRecord(fields, [
            "id",
            "songId",
            "song_id",
            "airtableId",
            "airtable_id",
            "airtableRecordId",
            "recordId",
          ])
        : "",
      song
        ? getStringFromRecord(song, [
            "id",
            "songId",
            "song_id",
            "airtableId",
            "airtable_id",
            "airtableRecordId",
            "recordId",
          ])
        : "",
    ].forEach((id) => {
      if (id) ids.add(id);
    });
  });

  return ids;
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

function bpmValuesMatch(a: BpmFilterValue | null, b: BpmFilterValue) {
  return (
    !!a &&
    a.mode === b.mode &&
    a.low === b.low &&
    a.high === b.high &&
    a.exact === b.exact
  );
}

function keyValuesMatch(a: KeyFilterValue | null, b: KeyFilterValue) {
  return !!a && a.note === b.note && a.scale === b.scale;
}

function MusicTagFilterPanel({
  categories,
  activeCategoryId,
  onActiveCategoryChange,
  showEditPointMarkers,
  onToggleMarkers,
  onClearActiveCategory,
  shuffleActive,
  onShuffle,
}: {
  categories: TagFilterCategory[];
  activeCategoryId: TagFilterCategoryId | null;
  onActiveCategoryChange: (id: TagFilterCategoryId | null) => void;
  showEditPointMarkers: boolean;
  onToggleMarkers: () => void;
  onClearActiveCategory: () => void;
  shuffleActive: boolean;
  onShuffle: () => void;
}) {
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) || null;

  return (
    <div className="-mx-7 border-t border-b border-[var(--border)]">
      <div className="flex min-h-[54px] items-center gap-1 overflow-x-auto px-7 py-2">
        <button
          type="button"
          onClick={() => onActiveCategoryChange(activeCategoryId ? null : "genres")}
          className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label={activeCategory ? "Collapse filters" : "Expand filters"}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={`transition-transform ${activeCategory ? "" : "rotate-180"}`}
          >
            <path
              d="M5 15.5L12 8.5L19 15.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {categories.map((category) => {
          const selected = activeCategoryId === category.id;
          const hasActive = category.activeCount > 0;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                onActiveCategoryChange(selected ? null : category.id)
              }
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium transition ${
                selected
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span>{category.label}</span>
              {hasActive && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] ${
                    selected
                      ? "bg-[var(--bg-primary)]/15 text-[var(--bg-primary)]"
                      : "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  }`}
                >
                  {category.activeCount}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onToggleMarkers}
          className={`ml-1 flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium transition ${
            showEditPointMarkers
              ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          }`}
          aria-pressed={showEditPointMarkers}
        >
          <span>Markers</span>
          {showEditPointMarkers && <span className={filterDotClass} />}
        </button>

        <button
          type="button"
          onClick={onShuffle}
          className={`${iconButtonClass} ml-auto shrink-0 ${
            shuffleActive
              ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              : ""
          }`}
          aria-label="Shuffle songs"
          aria-pressed={shuffleActive}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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
        </button>
      </div>

      {activeCategory && (
        <div className="border-t border-[var(--border)] px-7 py-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {activeCategory.label}
            </div>

            {activeCategory.activeCount > 0 && (
              <button
                type="button"
                onClick={onClearActiveCategory}
                className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {activeCategory.options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={option.onToggle}
                className={`flex min-h-9 items-center gap-2 rounded-none px-3 text-sm font-medium transition ${
                  option.active
                    ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                    : "bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover-strong)]"
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={
                    option.active
                      ? "text-[var(--bg-primary)]/65"
                      : "text-[var(--text-secondary)]"
                  }
                >
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MusicPage() {
  const { userId, isLoaded: authLoaded } = useAuth();
  const musicFilterStorageKey = userId
    ? `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${userId}`
    : null;

  const {
    filters,
    setFilters,
    hydrated: filtersHydrated,
  } = useFilterPersistence({
    storageKey: musicFilterStorageKey,
    authLoaded,
  });

  const {
    search,
    selectedMoods,
    selectedGenres,
    selectedInstruments,
    selectedBuilds,
    selectedVocals,
    selectedDurations,
    selectedEditPoints,
    showEditPointMarkers,
    instrumental,
    bpmValue,
    keyValue,
    selectedPlaylist,
  } = filters;

  const setSearch = (v: string) => setFilters((f) => ({ ...f, search: v }));
  const setSelectedMoods = (v: string[]) =>
    setFilters((f) => ({ ...f, selectedMoods: v }));
  const setSelectedGenres = (v: string[]) =>
    setFilters((f) => ({ ...f, selectedGenres: v }));
  const setSelectedInstruments = (v: string[]) =>
    setFilters((f) => ({ ...f, selectedInstruments: v }));
  const setSelectedBuilds = (v: string[]) =>
    setFilters((f) => ({ ...f, selectedBuilds: v }));
  const setSelectedVocals = (v: string[]) =>
    setFilters((f) => ({ ...f, selectedVocals: v }));
  const setSelectedDurations = (v: string[]) =>
    setFilters((f) => ({ ...f, selectedDurations: v }));
  const setSelectedEditPoints = (v: string[]) =>
    setFilters((f) => ({ ...f, selectedEditPoints: v }));
  const setShowEditPointMarkers = (v: boolean) =>
    setFilters((f) => ({ ...f, showEditPointMarkers: v }));
  const setInstrumental = (v: boolean) =>
    setFilters((f) => ({ ...f, instrumental: v }));
  const setBpmValue = (v: BpmFilterValue | null) =>
    setFilters((f) => ({ ...f, bpmValue: v }));
  const setKeyValue = (v: KeyFilterValue | null) =>
    setFilters((f) => ({ ...f, keyValue: v }));
  const setSelectedPlaylist = (v: PlaylistRef | null) =>
    setFilters((f) => ({ ...f, selectedPlaylist: v }));

  const playlistSongIdCacheRef = useRef<Record<string, string[]>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlaylistSongIds, setSelectedPlaylistSongIds] =
    useState<Set<string> | null>(null);
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const [activeFilterCategory, setActiveFilterCategory] =
    useState<TagFilterCategoryId | null>("genres");

  const selectedPlaylistId = selectedPlaylist?.id ?? null;
  const shuffleActive = shuffleOrderIds !== null;
  const searchPlaceholder = selectedPlaylist?.name
    ? `Search "${selectedPlaylist.name}"`
    : "Search Music Library";

  const {
    songs,
    loading: songsLoading,
    error: songsError,
    refetchSongs,
  } = useSongs();

  const { currentSong, setQueue } = usePlayer();
  const playerVisible = !!currentSong;

  useEffect(() => {
    if (!selectedPlaylistId) {
      setSelectedPlaylistSongIds(null);
      return;
    }

    const playlistId = selectedPlaylistId;
    const cachedIds = playlistSongIdCacheRef.current[playlistId];

    if (cachedIds) {
      setSelectedPlaylistSongIds(new Set(cachedIds));
      return;
    }

    let cancelled = false;

    async function loadPlaylistSongs() {
      setSelectedPlaylistSongIds(null);

      try {
        const response = await fetch(
          `/api/playlists/${encodeURIComponent(playlistId)}/songs`,
        );

        if (!response.ok) {
          throw new Error("Could not load playlist songs");
        }

        const data = await response.json();
        const songIds = getPlaylistSongIdsFromResponse(data);
        const songIdList = [...songIds];

        playlistSongIdCacheRef.current[playlistId] = songIdList;

        if (!cancelled) {
          setSelectedPlaylistSongIds(songIds);
        }
      } catch {
        if (!cancelled) {
          setSelectedPlaylistSongIds(new Set());
        }
      }
    }

    loadPlaylistSongs();

    return () => {
      cancelled = true;
    };
  }, [selectedPlaylistId]);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const q = search.trim().toLowerCase();

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

      if (q && !searchableText.includes(q)) return false;
      if (!includesAll(song.moods, selectedMoods)) return false;
      if (!includesAll(song.genres, selectedGenres)) return false;
      if (!includesAll(song.instruments, selectedInstruments)) return false;
      if (!includesAll(song.builds, selectedBuilds)) return false;
      if (!includesAll(song.vocals, selectedVocals)) return false;
      if (!songMatchesEditPointFilters(song, selectedEditPoints)) return false;
      if (!matchesDurationFilter(song.duration, selectedDurations)) {
        return false;
      }
      if (!matchesBpmFilter(song.bpm, bpmValue)) return false;
      if (!matchesKeyFilter(song.key, keyValue)) return false;
      if (instrumental && !song.instrumental) return false;

      if (selectedPlaylistId) {
        if (!selectedPlaylistSongIds) return false;

        const songIds = getSongIdentityValues(song);
        const isInSelectedPlaylist = songIds.some((songId) =>
          selectedPlaylistSongIds.has(songId),
        );

        if (!isInSelectedPlaylist) return false;
      }

      return true;
    });
  }, [
    songs,
    search,
    selectedMoods,
    selectedGenres,
    selectedInstruments,
    selectedBuilds,
    selectedVocals,
    selectedDurations,
    selectedEditPoints,
    bpmValue,
    keyValue,
    instrumental,
    selectedPlaylistId,
    selectedPlaylistSongIds,
  ]);

  const displayedSongs = useMemo(() => {
    const orderedSongs = [...filteredSongs];

    if (!shuffleOrderIds) return orderedSongs;

    const orderMap = new Map(
      shuffleOrderIds.map((songId, index) => [songId, index]),
    );

    return [...orderedSongs].sort((a, b) => {
      const aOrder = orderMap.get(getSongStableId(a));
      const bOrder = orderMap.get(getSongStableId(b));

      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;

      return aOrder - bOrder;
    });
  }, [filteredSongs, shuffleOrderIds]);

  useEffect(() => {
    setQueue(displayedSongs.filter((song) => song.audioUrl));
  }, [displayedSongs, setQueue]);

  const toggleMultiValue = (selected: string[], value: string) => {
    return selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
  };

  const createMultiOptions = (
    options: string[],
    selected: string[],
    onChange: (next: string[]) => void,
    getValues: (song: (typeof songs)[number]) => string[],
  ): TagFilterOption[] =>
    options.map((option) => ({
      label: option,
      count: songs.filter((song) => getValues(song).includes(option)).length,
      active: selected.includes(option),
      onToggle: () => onChange(toggleMultiValue(selected, option)),
    }));

  const cuePointLabelByType = new Map(
    EDIT_POINT_FILTER_OPTIONS.map((option) => [option.type, option.label]),
  );

  const filterCategories: TagFilterCategory[] = [
    {
      id: "moods",
      label: "Moods",
      activeCount: selectedMoods.length,
      options: createMultiOptions(
        MOOD_OPTIONS,
        selectedMoods,
        setSelectedMoods,
        (song) => song.moods,
      ),
    },
    {
      id: "genres",
      label: "Genres",
      activeCount: selectedGenres.length,
      options: createMultiOptions(
        GENRE_OPTIONS,
        selectedGenres,
        setSelectedGenres,
        (song) => song.genres,
      ),
    },
    {
      id: "vocals",
      label: "Vocals",
      activeCount: selectedVocals.length + (instrumental ? 1 : 0),
      options: [
        ...createMultiOptions(
          VOCALS_OPTIONS,
          selectedVocals,
          setSelectedVocals,
          (song) => song.vocals,
        ),
        {
          label: "Instrumental",
          count: songs.filter((song) => song.instrumental).length,
          active: instrumental,
          onToggle: () => setInstrumental(!instrumental),
        },
      ],
    },
    {
      id: "duration",
      label: "Duration",
      activeCount: selectedDurations.length,
      options: DURATION_TAG_OPTIONS.map((option) => ({
        label: option,
        count: songs.filter((song) => matchesDurationFilter(song.duration, [option]))
          .length,
        active: selectedDurations.includes(option),
        onToggle: () =>
          setSelectedDurations(
            selectedDurations.includes(option)
              ? selectedDurations.filter((item) => item !== option)
              : [option],
          ),
      })),
    },
    {
      id: "bpm",
      label: "BPM",
      activeCount: bpmValue ? 1 : 0,
      options: BPM_TAG_OPTIONS.map((option) => ({
        label: option.label,
        count: songs.filter((song) => matchesBpmFilter(song.bpm, option.value))
          .length,
        active: bpmValuesMatch(bpmValue, option.value),
        onToggle: () =>
          setBpmValue(bpmValuesMatch(bpmValue, option.value) ? null : option.value),
      })),
    },
    {
      id: "key",
      label: "Key",
      activeCount: keyValue ? 1 : 0,
      options: KEY_TAG_OPTIONS.map((note) => {
        const value = { note, scale: null };

        return {
          label: note,
          count: songs.filter((song) => matchesKeyFilter(song.key, value)).length,
          active: keyValuesMatch(keyValue, value),
          onToggle: () =>
            setKeyValue(keyValuesMatch(keyValue, value) ? null : value),
        };
      }),
    },
    {
      id: "instruments",
      label: "Instruments",
      activeCount: selectedInstruments.length,
      options: createMultiOptions(
        INSTRUMENT_OPTIONS,
        selectedInstruments,
        setSelectedInstruments,
        (song) => song.instruments,
      ),
    },
    {
      id: "builds",
      label: "Builds",
      activeCount: selectedBuilds.length,
      options: createMultiOptions(
        BUILD_OPTIONS,
        selectedBuilds,
        setSelectedBuilds,
        (song) => song.builds,
      ),
    },
    {
      id: "cuePoints",
      label: "Cue Points",
      activeCount: selectedEditPoints.length,
      options: EDIT_POINT_FILTER_OPTIONS.map((option) => ({
        label: option.label,
        count: songs.filter((song) =>
          songMatchesEditPointFilters(song, [option.type]),
        ).length,
        active: selectedEditPoints.includes(option.type),
        onToggle: () =>
          setSelectedEditPoints(
            selectedEditPoints.includes(option.type)
              ? selectedEditPoints.filter((item) => item !== option.type)
              : [...selectedEditPoints, option.type],
          ),
      })),
    },
  ];

  const clearActiveFilterCategory = () => {
    if (activeFilterCategory === "moods") setSelectedMoods([]);
    if (activeFilterCategory === "genres") setSelectedGenres([]);
    if (activeFilterCategory === "vocals") {
      setSelectedVocals([]);
      setInstrumental(false);
    }
    if (activeFilterCategory === "duration") setSelectedDurations([]);
    if (activeFilterCategory === "bpm") setBpmValue(null);
    if (activeFilterCategory === "key") setKeyValue(null);
    if (activeFilterCategory === "instruments") setSelectedInstruments([]);
    if (activeFilterCategory === "builds") setSelectedBuilds([]);
    if (activeFilterCategory === "cuePoints") setSelectedEditPoints([]);
  };

  const loadingPlaylistSongs =
    !!selectedPlaylistId && selectedPlaylistSongIds === null;

  const showSongSkeleton =
    !songsError &&
    ((songsLoading && songs.length === 0) || loadingPlaylistSongs);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="min-h-screen pt-14 ml-[var(--sidebar-width)] transition-[margin-left] duration-200">
        <div className="sticky top-[56px] z-[90] flex w-full flex-col gap-0 bg-[var(--bg-primary)] px-7 pt-0 pb-0">
          <div
            className="flex cursor-text items-center gap-3"
            onClick={() => searchInputRef.current?.focus()}
          >
            <div className="flex w-[320px] flex-shrink-0 items-center gap-2 py-3 pr-4">
              <SearchIcon className="shrink-0 text-[var(--text-muted)]" />

              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-[15px] font-[300] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>

            <FilterTags
              selectedMoods={selectedMoods}
              selectedGenres={selectedGenres}
              selectedInstruments={selectedInstruments}
              selectedBuilds={selectedBuilds}
              selectedVocals={selectedVocals}
              selectedDurations={selectedDurations}
              selectedEditPoints={selectedEditPoints}
              instrumental={instrumental}
              bpmValue={bpmValue}
              keyValue={keyValue}
              selectedPlaylist={selectedPlaylist}
              shuffleActive={shuffleActive}
              onRemoveMood={(v) =>
                setSelectedMoods(selectedMoods.filter((item) => item !== v))
              }
              onRemoveGenre={(v) =>
                setSelectedGenres(selectedGenres.filter((item) => item !== v))
              }
              onRemoveInstrument={(v) =>
                setSelectedInstruments(
                  selectedInstruments.filter((item) => item !== v),
                )
              }
              onRemoveBuild={(v) =>
                setSelectedBuilds(selectedBuilds.filter((item) => item !== v))
              }
              onRemoveVocal={(v) =>
                setSelectedVocals(selectedVocals.filter((item) => item !== v))
              }
              onRemoveDuration={(v) =>
                setSelectedDurations(
                  selectedDurations.filter((item) => item !== v),
                )
              }
              onRemoveEditPoint={(v) =>
                setSelectedEditPoints(
                  selectedEditPoints.filter((item) => item !== v),
                )
              }
              onRemoveInstrumental={() => setInstrumental(false)}
              onRemoveBpm={() => setBpmValue(null)}
              onRemoveKey={() => setKeyValue(null)}
              onRemovePlaylist={() => setSelectedPlaylist(null)}
              onRemoveShuffle={() => setShuffleOrderIds(null)}
            />
          </div>

          <MusicTagFilterPanel
            categories={filterCategories}
            activeCategoryId={activeFilterCategory}
            onActiveCategoryChange={setActiveFilterCategory}
            showEditPointMarkers={showEditPointMarkers}
            onToggleMarkers={() => setShowEditPointMarkers(!showEditPointMarkers)}
            onClearActiveCategory={clearActiveFilterCategory}
            shuffleActive={shuffleActive}
            onShuffle={() => {
              const shuffledSongs = shuffleSongList(filteredSongs);

              setShuffleOrderIds(
                shuffledSongs.map((song, index) => getSongStableId(song, index)),
              );
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[var(--bg-primary)] px-8 pt-4 pb-0">
          {QUICK_FILTERS.map((filter) => {
            const isActive = selectedGenres.includes(filter);

            return (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setSelectedGenres(
                    isActive
                      ? selectedGenres.filter((genre) => genre !== filter)
                      : [...selectedGenres, filter],
                  )
                }
                className={`${quickFilterButtonClass} ${
                  isActive ? quickFilterButtonActiveClass : ""
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        <div className="px-8 pt-[38px] pb-[42px]">
          <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <MusicIcon size={13} />
                Music Library
              </div>

              <h1 className="max-w-[720px] font-[family-name:var(--font-instrument-sans)] text-[clamp(42px,6vw,78px)] font-medium leading-[0.9] tracking-[-0.07em] text-[var(--text-primary)]">
                Find the cue that fits the cut.
              </h1>
            </div>

            <p className="max-w-[560px] text-sm leading-6 text-[var(--text-secondary)] xl:justify-self-end">
              Move through the library like a visual treatment — documentary
              warmth, after-dark tension, open travel cues, and polished brand
              motion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <span>{displayedSongs.length} shown</span>
            <span className="text-[var(--text-muted)]">·</span>
            <span>{songs.length} songs</span>
          </div>
        </div>

        <div className="w-full border-t border-[var(--border-subtle)]">
          {showSongSkeleton && <SkeletonSongList />}

          {songsError && !songsLoading && (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                Couldn&apos;t load songs
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
            displayedSongs.map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                isFirst={index === 0}
                isLast={index === displayedSongs.length - 1}
                highlightedEditPointTypes={selectedEditPoints}
                showEditPointMarkers={showEditPointMarkers}
              />
            ))}
        </div>

        {!songsLoading && (
          <div
            className="px-8 pt-10 pb-1"
            style={{
              paddingBottom: playerVisible ? "72px" : "8px",
            }}
          >
            <Footer />
          </div>
        )}
      </section>
    </main>
  );
}
