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
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import SearchIcon from "@/components/icons/SearchIcon";

import "./music-library-redesign.css";

const INSTRUMENTAL_VOCAL_FILTER_OPTION = "Instrumental";
const VOCAL_FILTER_OPTIONS = [
  INSTRUMENTAL_VOCAL_FILTER_OPTION,
  ...VOCALS_OPTIONS,
];

const MUSIC_HERO_IMAGE =
  "https://images.unsplash.com/photo-1556139930-c23fa4a4f934?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

const DESKTOP_SYNC_IMAGE =
  "https://images.unsplash.com/photo-1686519093104-3140c6dcf284?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

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
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const [sortOrder, setSortOrder] = useState<MusicLibrarySortValue>("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const shuffleActive = sortOrder === "random";
  const highlightedEditPointTypes =
    selectedEditPoints.filter(isCoreEditPointType);

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
    selectedInstruments.length > 0 ||
    selectedBuilds.length > 0 ||
    selectedVocals.length > 0 ||
    selectedDurations.length > 0 ||
    selectedEditPoints.length > 0 ||
    instrumental ||
    bpmValue !== null ||
    keyValue !== null ||
    selectedPlaylist !== null;

  // Clear all: only dropdown filters, not search/shuffle/markers
  const hasActiveClearableFilters =
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
    selectedPlaylist !== null;

  const activeFilterCount =
    selectedMoods.length +
    selectedGenres.length +
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
    selectedVocals,
    songs,
  ]);

  function setRandomSort() {
    const shuffledSongs = shuffleSongList(filteredSongs);
    setShuffleOrderIds(
      shuffledSongs.map((song, index) => getMusicSongStableId(song, index)),
    );
    setSortOrder("random");
  }

  function handleSortChange(value: MusicLibrarySortValue) {
    if (value === "random") {
      setRandomSort();
      return;
    }

    setSortOrder(value);
    setShuffleOrderIds(null);
  }

  const displayedSongs = useMemo(() => {
    if (sortOrder === "downloaded") {
      return [...filteredSongs].sort(
        (a, b) => b.downloadCount - a.downloadCount,
      );
    }

    if (sortOrder !== "random" || !shuffleOrderIds) return filteredSongs;

    const orderMap = new Map(
      shuffleOrderIds.map((songId, index) => [songId, index]),
    );

    return [...filteredSongs].sort((a, b) => {
      const aId = getMusicSongStableId(a);
      const bId = getMusicSongStableId(b);
      const aOrder = orderMap.get(aId);
      const bOrder = orderMap.get(bId);

      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;

      return aOrder - bOrder;
    });
  }, [filteredSongs, shuffleOrderIds, sortOrder]);

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
      label: "Mood",
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
    <main className="music-page-reimagined min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="music-page-stage min-h-screen pt-14 ml-[var(--sidebar-width)] transition-[margin-left] duration-200">
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
          chips={
            hasActiveFilters ? (
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
                onRemovePlaylist={() =>
                  setFilters((current) => ({ ...current, selectedPlaylist: null }))
                }
                onRemoveShuffle={() => handleSortChange("recent")}
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

        <div className="music-page-canvas">
          <div className="music-command-panel">
            <div className="music-command-copy">
              <span className="music-command-eyebrow">Cue Discovery</span>
              <h1>Build the emotional shape of the cut.</h1>
              <p>
                Search, filter, and audition cues from a tighter workspace built
                around scene feel, edit rhythm, and fast decision-making.
              </p>
            </div>

            <div className="music-command-stats" aria-label="Library stats">
              <div>
                <span>{displayedSongs.length}</span>
                <small>shown</small>
              </div>
              <div>
                <span>{songs.length}</span>
                <small>library</small>
              </div>
              <div>
                <span>{activeFilterCount}</span>
                <small>active</small>
              </div>
            </div>
          </div>

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
              <MusicQuickChip active={shuffleActive} onClick={setRandomSort}>
                <ShuffleIconSmall size={12} />
                Shuffle
              </MusicQuickChip>
              <MusicLibrarySortControl
                value={sortOrder}
                onChange={handleSortChange}
              />
            </MusicQuickChipsEnd>
          </MusicQuickChips>

          <div
            className="music-hero-reveal grid overflow-hidden"
            style={{
              gridTemplateRows: hasActiveFilters ? "0fr" : "1fr",
              opacity: hasActiveFilters ? 0 : 1,
              transition:
                "grid-template-rows 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease",
            }}
            aria-hidden={hasActiveFilters}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="music-hero-board">
                <div className="music-hero-primary group">
                  <div
                    className="music-hero-image"
                    style={{ backgroundImage: `url("${MUSIC_HERO_IMAGE}")` }}
                  />
                  <div className="music-hero-shade" />

                  <div className="music-hero-content">
                    <div className="music-hero-label">
                      <MusicIcon size={11} />
                      <span>Music Library</span>
                    </div>

                    <div>
                      <h2>Find the cue that fits the cut.</h2>
                      <p>
                        Move through the library like a visual treatment —
                        documentary warmth, after-dark tension, open travel cues,
                        and polished brand motion.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="music-hero-side group">
                  <div
                    className="music-hero-image"
                    style={{ backgroundImage: `url("${DESKTOP_SYNC_IMAGE}")` }}
                  />
                  <div className="music-hero-side-shade" />

                  <div className="music-hero-side-content">
                    <div>
                      <span>Desktop Sync</span>
                      <h3>Drag your library straight into the edit.</h3>
                    </div>

                    <div className="music-hero-side-arrow">
                      <ArrowUpRightIcon size={14} />
                    </div>

                    <p>
                      Keep projects, playlists, and downloaded cues organized
                      across the web app and local folders.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {songsError && (
            <div className="music-library-error text-sm text-[var(--danger)]">
              Failed to load songs. Showing cached results where available.
            </div>
          )}

          <div className="music-results-panel">
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
        </div>

        <Footer playerPadding={playerVisible} />
      </section>
    </main>
  );
}
