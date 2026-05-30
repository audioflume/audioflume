"use client";

import {
  BUILD_OPTIONS,
  GENRE_OPTIONS,
  INSTRUMENT_OPTIONS,
  MOOD_OPTIONS,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
  QUICK_FILTERS,
  SearchFilterChrome,
  SearchFilterInput,
  SearchFilterQuickButton,
  VOCALS_OPTIONS,
} from "@filmwave/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { BpmFilterValue, KeyFilterValue, PlaylistRef, Song } from "@/lib/types";
import {
  matchesDurationFilter,
  matchesBpmFilter,
  matchesKeyFilter,
} from "@/lib/filterUtils";
import {
  EDIT_POINT_FILTER_OPTIONS,
  isCoreEditPointType,
  songMatchesEditPointFilters,
} from "@/lib/editPointUtils";
import { getRecord, getStringFromRecord } from "@/lib/utils";

import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import { useSongs } from "@/hooks/useSongs";

import { usePlayer } from "@/context/PlayerContext";

import BPMFilter from "@/components/BPMFilter";
import DurationFilter from "@/components/DurationFilter";
import FilterDropdown from "@/components/FilterDropdown";
import FilterTags from "@/components/FilterTags";
import Footer from "@/components/Footer";
import KeyFilter from "@/components/KeyFilter";
import PlaylistFilter from "@/components/PlaylistFilter";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import { iconButtonClass } from "@/components/uiClasses";
import {
  filterDotClass,
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";

const INSTRUMENTAL_VOCAL_FILTER_OPTION = "Instrumental";
const VOCAL_FILTER_OPTIONS = [
  INSTRUMENTAL_VOCAL_FILTER_OPTION,
  ...VOCALS_OPTIONS,
];

const MUSIC_HERO_IMAGE =
  "https://images.unsplash.com/photo-1556139930-c23fa4a4f934?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

const DESKTOP_SYNC_IMAGE =
  "https://images.unsplash.com/photo-1686519093104-3140c6dcf284?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

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

    if (movedCount >= Math.floor(songs.length * 0.85)) break;
  }

  return bestShuffle;
}

function selectedValuesMatch(songValues: string[], selectedValues: string[]) {
  if (selectedValues.length === 0) return true;

  const normalizedSongValues = songValues.map((value) => value.toLowerCase());
  const searchableText = normalizedSongValues.join(" ");

  return selectedValues.every((selectedValue) => {
    const normalizedSelectedValue = selectedValue.toLowerCase();

    return (
      normalizedSongValues.includes(normalizedSelectedValue) ||
      searchableText.includes(normalizedSelectedValue)
    );
  });
}

function getSongSearchText(song: Song) {
  return [
    song.title,
    song.artist,
    song.key,
    String(song.bpm),
    ...song.genres,
    ...song.moods,
    ...song.instruments,
    ...song.builds,
    ...song.vocals,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function MusicPage() {
  const { userId } = useAuth();
  const musicFilterStorageKey = userId
    ? `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${userId}`
    : null;

  const {
    filters,
    setFilters,
    hydrated: filtersHydrated,
  } = useFilterPersistence(musicFilterStorageKey);

  const {
    songs,
    loading: songsLoading,
    error: songsError,
  } = useSongs();

  const { currentSong } = usePlayer();
  const playerVisible = Boolean(currentSong);

  const [musicHeroHovered, setMusicHeroHovered] = useState(false);
  const [desktopSyncHovered, setDesktopSyncHovered] = useState(false);
  const [playlistSongIdsByPlaylistId, setPlaylistSongIdsByPlaylistId] = useState<
    Record<string, Set<string>>
  >({});
  const [selectedPlaylistSongIds, setSelectedPlaylistSongIds] =
    useState<Set<string> | null>(null);
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const search = filters.search;
  const selectedMoods = filters.selectedMoods;
  const selectedGenres = filters.selectedGenres;
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

  const shuffleActive = shuffleOrderIds !== null;
  const highlightedEditPointTypes = selectedEditPoints.filter(isCoreEditPointType);

  const setSearch = (value: string) =>
    setFilters((current) => ({ ...current, search: value }));
  const setSelectedMoods = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedMoods: values }));
  const setSelectedGenres = (values: string[]) =>
    setFilters((current) => ({ ...current, selectedGenres: values }));
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
  const setSelectedPlaylist = (value: PlaylistRef | null) =>
    setFilters((current) => ({ ...current, selectedPlaylist: value }));
  const setShowEditPointMarkers = (value: boolean) =>
    setFilters((current) => ({ ...current, showEditPointMarkers: value }));

  const selectedVocalFilters = instrumental
    ? [INSTRUMENTAL_VOCAL_FILTER_OPTION, ...selectedVocals]
    : selectedVocals;

  const setSelectedVocalFilters = (values: string[]) => {
    const hasInstrumental = values.includes(INSTRUMENTAL_VOCAL_FILTER_OPTION);

    setFilters((current) => ({
      ...current,
      instrumental: hasInstrumental,
      selectedVocals: values.filter(
        (value) => value !== INSTRUMENTAL_VOCAL_FILTER_OPTION,
      ),
    }));
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedMoods.length > 0 ||
    selectedGenres.length > 0 ||
    selectedInstruments.length > 0 ||
    selectedBuilds.length > 0 ||
    selectedVocals.length > 0 ||
    selectedDurations.length > 0 ||
    selectedEditPoints.length > 0 ||
    instrumental ||
    bpmValue !== null ||
    keyValue !== null ||
    selectedPlaylist !== null ||
    shuffleActive;

  const searchPlaceholder = hasActiveFilters
    ? "Search filtered results"
    : "Search the catalog";

  const effectiveShowEditPointMarkers = filters.showEditPointMarkers;

  useEffect(() => {
    if (!userId || !selectedPlaylistId) return;
    if (playlistSongIdsByPlaylistId[selectedPlaylistId]) {
      setSelectedPlaylistSongIds(playlistSongIdsByPlaylistId[selectedPlaylistId]);
      return;
    }

    let cancelled = false;

    async function loadPlaylistSongs() {
      setSelectedPlaylistSongIds(null);

      try {
        const res = await fetch(`/api/playlists/${selectedPlaylistId}/songs`);
        if (!res.ok) throw new Error("Failed to load playlist songs");
        const data = await res.json();
        const ids = getPlaylistSongIdsFromResponse(data);

        if (cancelled) return;

        setPlaylistSongIdsByPlaylistId((current) => ({
          ...current,
          [selectedPlaylistId]: ids,
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

  const filteredSongs = useMemo(() => {
    if (!filtersHydrated) return [];

    const searchQuery = search.toLowerCase().trim();
    const playlistIds = selectedPlaylistSongIds;

    return songs.filter((song) => {
      if (selectedPlaylistId) {
        if (!playlistIds) return false;
        const identityValues = getSongIdentityValues(song);
        if (!identityValues.some((id) => playlistIds.has(id))) return false;
      }

      if (searchQuery && !getSongSearchText(song).includes(searchQuery)) {
        return false;
      }

      if (!selectedValuesMatch(song.moods, selectedMoods)) return false;
      if (!selectedValuesMatch(song.genres, selectedGenres)) return false;
      if (!selectedValuesMatch(song.instruments, selectedInstruments)) return false;
      if (!selectedValuesMatch(song.builds, selectedBuilds)) return false;
      if (!selectedValuesMatch(song.vocals, selectedVocals)) return false;
      if (instrumental && !song.instrumental) return false;
      if (!matchesDurationFilter(song.duration, selectedDurations)) return false;
      if (!matchesBpmFilter(song.bpm, bpmValue)) return false;
      if (!matchesKeyFilter(song.key, keyValue)) return false;
      if (!songMatchesEditPointFilters(song, selectedEditPoints)) return false;

      return true;
    });
  }, [
    bpmValue,
    filtersHydrated,
    instrumental,
    keyValue,
    search,
    selectedBuilds,
    selectedDurations,
    selectedEditPoints,
    selectedGenres,
    selectedInstruments,
    selectedMoods,
    selectedPlaylistId,
    selectedPlaylistSongIds,
    selectedVocals,
    songs,
  ]);

  const displayedSongs = useMemo(() => {
    if (!shuffleOrderIds) return filteredSongs;

    const orderMap = new Map(shuffleOrderIds.map((songId, index) => [songId, index]));

    return [...filteredSongs].sort((a, b) => {
      const aId = getSongStableId(a);
      const bId = getSongStableId(b);
      const aOrder = orderMap.get(aId);
      const bOrder = orderMap.get(bId);

      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;

      return aOrder - bOrder;
    });
  }, [filteredSongs, shuffleOrderIds]);

  const loadingPlaylistSongs =
    !!selectedPlaylistId && selectedPlaylistSongIds === null;

  const showSongSkeleton =
    !songsError &&
    ((songsLoading && songs.length === 0) || loadingPlaylistSongs);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="min-h-screen pt-14 ml-[var(--sidebar-width)] transition-[margin-left] duration-200">
        <SearchFilterChrome
          onSearchRowClick={() => searchInputRef.current?.focus()}
          search={
            <SearchFilterInput
              icon={<SearchIcon className="shrink-0 text-[var(--text-muted)]" />}
              inputRef={searchInputRef}
              value={search}
              placeholder={searchPlaceholder}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
          tags={
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
          }
          filters={
            <>
              <PlaylistFilter
                selected={selectedPlaylist}
                onChange={setSelectedPlaylist}
              />

              <FilterDropdown
                label="Mood"
                options={[...MOOD_OPTIONS]}
                selected={selectedMoods}
                onChange={setSelectedMoods}
              />

              <FilterDropdown
                label="Genre"
                options={[...GENRE_OPTIONS]}
                selected={selectedGenres}
                onChange={setSelectedGenres}
              />

              <FilterDropdown
                label="Instruments"
                options={[...INSTRUMENT_OPTIONS]}
                selected={selectedInstruments}
                onChange={setSelectedInstruments}
              />

              <FilterDropdown
                label="Vocals"
                options={VOCAL_FILTER_OPTIONS}
                selected={selectedVocalFilters}
                onChange={setSelectedVocalFilters}
              />

              <FilterDropdown
                label="Build"
                options={[...BUILD_OPTIONS]}
                selected={selectedBuilds}
                onChange={setSelectedBuilds}
              />

              <BPMFilter value={bpmValue} onChange={setBpmValue} />

              <KeyFilter value={keyValue} onChange={setKeyValue} />

              <DurationFilter
                selected={selectedDurations}
                onChange={setSelectedDurations}
              />

              <FilterDropdown
                label="Cue Points"
                options={EDIT_POINT_FILTER_OPTIONS.map((option) => option.label)}
                selected={EDIT_POINT_FILTER_OPTIONS.filter((option) =>
                  selectedEditPoints.includes(option.type),
                ).map((option) => option.label)}
                onChange={(labels) =>
                  setSelectedEditPoints(
                    EDIT_POINT_FILTER_OPTIONS.filter((option) =>
                      labels.includes(option.label),
                    ).map((option) => option.type),
                  )
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowEditPointMarkers(!effectiveShowEditPointMarkers)
                }
                disabled={!filtersHydrated}
                className={`${filterTriggerBaseClass} shrink-0 after:content-none ${
                  effectiveShowEditPointMarkers
                    ? filterTriggerActiveClass
                    : filterTriggerInactiveClass
                } ${filtersHydrated ? "" : "opacity-60"}`}
                aria-pressed={effectiveShowEditPointMarkers}
              >
                <span>Markers</span>
                {effectiveShowEditPointMarkers && (
                  <span className={filterDotClass} />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const shuffledSongs = shuffleSongList(filteredSongs);
                  setShuffleOrderIds(
                    shuffledSongs.map((song, index) =>
                      getSongStableId(song, index),
                    ),
                  );
                }}
                className={`${iconButtonClass} shrink-0 self-center`}
                style={
                  shuffleActive
                    ? ({ "--shuffle-icon-color": "#000000" } as React.CSSProperties)
                    : undefined
                }
                aria-label="Shuffle songs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="var(--shuffle-icon-color, currentColor)"
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
            </>
          }
          quickFilters={
            <>
              {QUICK_FILTERS.map((filter) => {
                const isActive = selectedGenres.includes(filter);

                return (
                  <SearchFilterQuickButton
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
                  </SearchFilterQuickButton>
                );
              })}
            </>
          }
        />

        <div
          className="grid overflow-hidden"
          style={{
            gridTemplateRows: hasActiveFilters ? "0fr" : "1fr",
            opacity: hasActiveFilters ? 0 : 1,
            transition:
              "grid-template-rows 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease",
          }}
          aria-hidden={hasActiveFilters}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-8 pt-5 pb-8">
              <div className="overflow-hidden">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
                  <div
                    className="relative flex min-h-[320px] overflow-hidden rounded-[18px] bg-[var(--bg-secondary)] p-7 text-white"
                    onMouseEnter={() => setMusicHeroHovered(true)}
                    onMouseLeave={() => setMusicHeroHovered(false)}
                    style={{
                      backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.2) 100%), linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 100%), url("${MUSIC_HERO_IMAGE}")`,
                      backgroundSize: `100% 100%, 100% 100%, ${musicHeroHovered ? "104%" : "100%"} auto`,
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      transition: "background-size 700ms",
                    }}
                  >
                    <div className="relative z-10 flex min-h-full w-full flex-col justify-between">
                      <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium leading-none text-white/80 backdrop-blur">
                        <MusicIcon size={11} />
                        <span className="truncate">Music Library</span>
                      </div>

                      <div>
                        <h1 className="max-w-[720px] font-[family-name:var(--font-instrument-sans)] text-[clamp(32px,4.8vw,58px)] font-medium leading-[0.9] tracking-[-0.065em] text-white">
                          Find the cue that fits the cut.
                        </h1>

                        <div className="mt-5 flex flex-wrap items-end gap-5">
                          <p className="max-w-[560px] text-[14px] leading-6 text-white/76">
                            Move through the library like a visual treatment —
                            documentary warmth, after-dark tension, open travel cues,
                            and polished brand motion.
                          </p>

                          <div className="flex shrink-0 items-center gap-2 text-[11px] text-white/72">
                            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur">
                              {displayedSongs.length} shown
                            </span>
                            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur">
                              {songs.length} songs
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="group relative hidden min-h-[320px] overflow-hidden rounded-[18px] bg-[var(--bg-secondary)] p-7 text-white xl:flex xl:flex-col xl:justify-between"
                    onMouseEnter={() => setDesktopSyncHovered(true)}
                    onMouseLeave={() => setDesktopSyncHovered(false)}
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.78) 100%), linear-gradient(90deg, rgba(0,0,0,0.26), rgba(0,0,0,0.08)), url("${DESKTOP_SYNC_IMAGE}")`,
                      backgroundSize: `100% 100%, 100% 100%, ${desktopSyncHovered ? "106%" : "100%"} auto`,
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      transition: "background-size 700ms",
                    }}
                  >
                    <div className="relative z-10 flex justify-between gap-5">
                      <div>
                        <div className="text-[11px] font-medium text-white/64">
                          Desktop Sync
                        </div>
                        <h2 className="mt-2 max-w-[260px] text-[26px] font-medium leading-[0.95] tracking-[-0.055em] text-white">
                          Drag your library straight into the edit.
                        </h2>
                      </div>

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                        <ArrowUpRightIcon size={14} />
                      </div>
                    </div>

                    <div className="relative z-10 max-w-[320px] text-[14px] leading-6 text-white/72">
                      Keep projects, playlists, and downloaded cues organized
                      across the web app and local folders.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {songsError && (
          <div className="px-8 py-4 text-sm text-[var(--danger)]">
            Failed to load songs. Showing cached results where available.
          </div>
        )}

        {showSongSkeleton ? (
          <SkeletonSongList />
        ) : (
          <div className="pb-6">
            {displayedSongs.map((song, index) => (
              <SongCard
                key={getSongStableId(song, index)}
                song={song}
                index={index}
                highlightedEditPointTypes={highlightedEditPointTypes}
                showEditPointMarkers={effectiveShowEditPointMarkers}
              />
            ))}
          </div>
        )}

        <Footer playerPadding={playerVisible} />
      </section>
    </main>
  );
}
