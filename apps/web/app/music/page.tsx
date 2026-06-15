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
  MusicLibrarySortControl,
  type MusicLibrarySortValue,
  MusicLibraryToolbar,
  MusicListShell,
  MusicQuickChip,
  MusicQuickChips,
  MusicQuickChipsEnd,
  QUICK_FILTERS,
  REGION_OPTIONS,
  ShuffleIconSmall,
  VOCALS_OPTIONS,
} from "@filmwave/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { BpmFilterValue, KeyFilterValue } from "@/lib/types";

import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useSongs } from "@/hooks/useSongs";

import { usePlayer } from "@/context/PlayerContext";

import FilterTags from "@/components/FilterTags";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import SearchIcon from "@/components/icons/SearchIcon";

import "./music-library-redesign.css";

const INSTRUMENTAL_VOCAL_FILTER_OPTION = "Instrumental";
const VOCAL_FILTER_OPTIONS = [
  INSTRUMENTAL_VOCAL_FILTER_OPTION,
  ...VOCALS_OPTIONS,
];

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

function sortMusicLibrarySongList<T extends { downloadCount: number }>(
  songs: T[],
  sortOrder: MusicLibrarySortValue,
) {
  if (sortOrder === "downloaded") {
    return [...songs].sort((a, b) => b.downloadCount - a.downloadCount);
  }

  return [...songs];
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

  const { songs, loading: songsLoading, error: songsError } = useSongs();
  const { playlists } = usePlaylists();

  const { currentSong, setQueue } = usePlayer();
  const playerVisible = Boolean(currentSong);

  const [playlistSongIdsByPlaylistId, setPlaylistSongIdsByPlaylistId] =
    useState<Record<string, Set<string>>>({});
  const [selectedPlaylistSongIds, setSelectedPlaylistSongIds] =
    useState<Set<string> | null>(null);
  const [shuffleActive, setShuffleActive] = useState(false);
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<MusicLibrarySortValue>("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const search = filters.search;
  const selectedMoods = filters.selectedMoods;
  const selectedGenres = filters.selectedGenres;
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
    shuffleActive;

  const hasActiveClearableFilters =
    selectedMoods.length > 0 ||
    selectedGenres.length > 0 ||
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

  const activeFilterCount =
    selectedMoods.length +
    selectedGenres.length +
    selectedRegions.length +
    selectedInstruments.length +
    selectedVocalFilters.length +
    selectedBuilds.length +
    selectedDurations.length +
    selectedEditPoints.length +
    (bpmValue !== null ? 1 : 0) +
    (keyValue !== null ? 1 : 0) +
    (selectedPlaylist !== null ? 1 : 0);

  function clearAllFilters() {
    setFilters((current) => ({
      ...current,
      selectedMoods: [],
      selectedGenres: [],
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
  }

  const searchPlaceholder = getMusicLibrarySearchPlaceholder(
    selectedPlaylist?.name,
  );

  const effectiveShowEditPointMarkers = filters.showEditPointMarkers;

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

  const filteredSongs = useMemo(() => {
    if (!filtersHydrated) return [];

    const playlistSongs = selectedPlaylistId
      ? songs.filter((song) => {
          if (!selectedPlaylistSongIds) return false;
          const identityValues = getMusicSongIdentityValues(song);
          return identityValues.some((id) => selectedPlaylistSongIds.has(id));
        })
      : songs;

    return filterMusicLibrarySongs(playlistSongs, {
      search,
      selectedMoods,
      selectedGenres,
      selectedRegions,
      selectedInstruments,
      selectedBuilds,
      selectedVocals,
      selectedDurations,
      selectedEditPoints,
      instrumental,
      bpmValue,
      keyValue,
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
    selectedRegions,
    selectedVocals,
    songs,
  ]);

  const sortedSongs = useMemo(
    () => sortMusicLibrarySongList(filteredSongs, sortOrder),
    [filteredSongs, sortOrder],
  );

  function createShuffleOrder(sourceSongs: typeof sortedSongs) {
    const indexedSongs = sourceSongs.map((song, index) => ({
      id: getMusicSongStableId(song, index),
      song,
    }));

    return shuffleSongList(indexedSongs).map((item) => item.id);
  }

  function enableShuffle() {
    setShuffleOrderIds(createShuffleOrder(sortedSongs));
    setShuffleActive(true);
  }

  function disableShuffle() {
    setShuffleOrderIds([]);
    setShuffleActive(false);
  }

  function toggleShuffle() {
    if (shuffleActive) {
      disableShuffle();
      return;
    }

    enableShuffle();
  }

  function removeShuffle() {
    disableShuffle();
  }

  function handleSortChange(value: MusicLibrarySortValue) {
    setSortOrder(value);

    if (shuffleActive) {
      const nextSortedSongs = sortMusicLibrarySongList(filteredSongs, value);
      setShuffleOrderIds(createShuffleOrder(nextSortedSongs));
    }
  }

  const displayedSongs = useMemo(() => {
    if (!shuffleActive || shuffleOrderIds.length === 0) return sortedSongs;

    const orderMap = new Map(
      shuffleOrderIds.map((songId, index) => [songId, index]),
    );

    return sortedSongs
      .map((song, index) => ({
        song,
        order: orderMap.get(getMusicSongStableId(song, index)),
        index,
      }))
      .sort((a, b) => {
        if (a.order === undefined && b.order === undefined) {
          return a.index - b.index;
        }

        if (a.order === undefined) return 1;
        if (b.order === undefined) return -1;

        return a.order - b.order;
      })
      .map((item) => item.song);
  }, [shuffleActive, shuffleOrderIds, sortedSongs]);

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
      options: [...MOOD_OPTIONS],
      selected: selectedMoods,
      onToggle: toggleIn(selectedMoods, setSelectedMoods),
    },
    {
      id: "genre",
      label: "Genre",
      options: [...GENRE_OPTIONS],
      selected: selectedGenres,
      onToggle: toggleIn(selectedGenres, setSelectedGenres),
    },
    {
      id: "region",
      label: "Region",
      options: [...REGION_OPTIONS],
      selected: selectedRegions,
      onToggle: toggleIn(selectedRegions, setSelectedRegions),
    },
    {
      id: "instruments",
      label: "Instruments",
      options: [...INSTRUMENT_OPTIONS],
      selected: selectedInstruments,
      onToggle: toggleIn(selectedInstruments, setSelectedInstruments),
    },
    {
      id: "vocals",
      label: "Vocals",
      options: VOCAL_FILTER_OPTIONS,
      selected: selectedVocalFilters,
      onToggle: toggleIn(selectedVocalFilters, setSelectedVocalFilters),
    },
    {
      id: "build",
      label: "Build",
      options: [...BUILD_OPTIONS],
      selected: selectedBuilds,
      onToggle: toggleIn(selectedBuilds, setSelectedBuilds),
    },
    {
      id: "cuePoints",
      label: "Cue Points",
      options: EDIT_POINT_FILTER_OPTIONS.map((option) => option.label),
      selected: EDIT_POINT_FILTER_OPTIONS.filter((option) =>
        selectedEditPoints.includes(option.type),
      ).map((option) => option.label),
      onToggle: (label: string) => {
        const option = EDIT_POINT_FILTER_OPTIONS.find(
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
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="min-h-screen pt-14 ml-[var(--sidebar-width)] transition-[margin-left] duration-200">
        <MusicLibraryToolbar
          stickyTop={56}
          searchValue={search}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={setSearch}
          searchInputRef={searchInputRef}
          searchIcon={<SearchIcon />}
          filterCount={activeFilterCount}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((open) => !open)}
          onClearFilters={clearAllFilters}
          chips={
            hasActiveFilters ? (
              <FilterTags
                selectedMoods={selectedMoods}
                selectedGenres={selectedGenres}
                selectedRegions={selectedRegions}
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
                onRemoveRegion={(v) =>
                  setSelectedRegions(selectedRegions.filter((item) => item !== v))
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
                onRemovePlaylist={() =>
                  setFilters((current) => ({ ...current, selectedPlaylist: null }))
                }
                onRemoveShuffle={removeShuffle}
              />
            ) : undefined
          }
        >
          <MusicFilterPanel
            open={filtersOpen}
            groups={filterChipGroups}
            playlists={playlistChipOptions}
            selectedPlaylistId={selectedPlaylistId ? String(selectedPlaylistId) : null}
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
            markersActive={effectiveShowEditPointMarkers}
            markersDisabled={!filtersHydrated}
            onToggleMarkers={() =>
              setShowEditPointMarkers(!effectiveShowEditPointMarkers)
            }
            hasActive={hasActiveClearableFilters}
            onClearAll={clearAllFilters}
            onClose={() => setFiltersOpen(false)}
          />
        </MusicLibraryToolbar>

        <MusicQuickChips>
          {QUICK_FILTERS.map((filter) => {
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

          <MusicQuickChipsEnd>
            <MusicQuickChip active={shuffleActive} onClick={toggleShuffle}>
              <ShuffleIconSmall size={12} />
            </MusicQuickChip>
            <MusicLibrarySortControl
              value={sortOrder}
              onChange={handleSortChange}
            />
          </MusicQuickChipsEnd>
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

        <Footer playerPadding={playerVisible} />
      </section>
    </main>
  );
}
