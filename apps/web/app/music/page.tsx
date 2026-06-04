"use client";

import {
  BUILD_OPTIONS,
  EDIT_POINT_FILTER_OPTIONS,
  FilterTrigger,
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
  MusicBpmFilter,
  MusicDurationFilter,
  MusicKeyFilter,
  MusicLibrarySortControl,
  type MusicLibrarySortValue,
  MusicMultiSelectFilter,
  MusicShuffleButton,
  QUICK_FILTERS,
  SearchFilterChrome,
  SearchFilterInput,
  SearchFilterQuickButton,
  sortMusicLibrarySongsByRelevance,
  VOCALS_OPTIONS,
} from "@filmwave/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { BpmFilterValue, KeyFilterValue, PlaylistRef } from "@/lib/types";

import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import { useSongs } from "@/hooks/useSongs";

import { usePlayer } from "@/context/PlayerContext";

import FilterTags from "@/components/FilterTags";
import Footer from "@/components/Footer";
import PlaylistFilter from "@/components/PlaylistFilter";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import SearchIcon from "@/components/icons/SearchIcon";

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

  const { currentSong, setQueue } = usePlayer();
  const playerVisible = Boolean(currentSong);

  const [playlistSongIdsByPlaylistId, setPlaylistSongIdsByPlaylistId] =
    useState<Record<string, Set<string>>>({});
  const [selectedPlaylistSongIds, setSelectedPlaylistSongIds] =
    useState<Set<string> | null>(null);
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const [sortOrder, setSortOrder] = useState<MusicLibrarySortValue>("recent");

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

  const relevanceFilters = useMemo(
    () => ({
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
    }),
    [
      bpmValue,
      instrumental,
      keyValue,
      search,
      selectedBuilds,
      selectedDurations,
      selectedEditPoints,
      selectedGenres,
      selectedInstruments,
      selectedMoods,
      selectedVocals,
    ],
  );

  const filteredSongs = useMemo(() => {
    if (!filtersHydrated) return [];

    const playlistSongs = selectedPlaylistId
      ? songs.filter((song) => {
          if (!selectedPlaylistSongIds) return false;
          const identityValues = getMusicSongIdentityValues(song);
          return identityValues.some((id) => selectedPlaylistSongIds.has(id));
        })
      : songs;

    return filterMusicLibrarySongs(playlistSongs, relevanceFilters);
  }, [
    filtersHydrated,
    relevanceFilters,
    selectedPlaylistId,
    selectedPlaylistSongIds,
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
      return [...filteredSongs].sort((a, b) => b.downloadCount - a.downloadCount);
    }

    if (sortOrder === "relevant") {
      return sortMusicLibrarySongsByRelevance(filteredSongs, relevanceFilters);
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
  }, [filteredSongs, relevanceFilters, shuffleOrderIds, sortOrder]);

  useEffect(() => {
    setQueue(displayedSongs);
  }, [displayedSongs, setQueue]);

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
              icon={<SearchIcon />}
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
              onRemoveShuffle={() => handleSortChange("recent")}
            />
          }
          filters={
            <>
              <PlaylistFilter
                selected={selectedPlaylist}
                onChange={setSelectedPlaylist}
              />

              <MusicMultiSelectFilter
                label="Mood"
                options={[...MOOD_OPTIONS]}
                selected={selectedMoods}
                onChange={setSelectedMoods}
              />

              <MusicMultiSelectFilter
                label="Genre"
                options={[...GENRE_OPTIONS]}
                selected={selectedGenres}
                onChange={setSelectedGenres}
              />

              <MusicMultiSelectFilter
                label="Instruments"
                options={[...INSTRUMENT_OPTIONS]}
                selected={selectedInstruments}
                onChange={setSelectedInstruments}
              />

              <MusicMultiSelectFilter
                label="Vocals"
                options={VOCAL_FILTER_OPTIONS}
                selected={selectedVocalFilters}
                onChange={setSelectedVocalFilters}
              />

              <MusicMultiSelectFilter
                label="Build"
                options={[...BUILD_OPTIONS]}
                selected={selectedBuilds}
                onChange={setSelectedBuilds}
              />

              <MusicBpmFilter value={bpmValue} onChange={setBpmValue} />

              <MusicKeyFilter value={keyValue} onChange={setKeyValue} />

              <MusicDurationFilter
                selected={selectedDurations}
                onChange={setSelectedDurations}
              />

              <MusicMultiSelectFilter
                label="Cue Points"
                options={EDIT_POINT_FILTER_OPTIONS.map(
                  (option) => option.label,
                )}
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

              <FilterTrigger
                label="Markers"
                active={effectiveShowEditPointMarkers}
                showActiveDot
                hideChevron
                disabled={!filtersHydrated}
                onClick={() =>
                  setShowEditPointMarkers(!effectiveShowEditPointMarkers)
                }
              />
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
          quickActions={
            <>
              <MusicShuffleButton active={shuffleActive} onClick={setRandomSort} />
              <MusicLibrarySortControl value={sortOrder} onChange={handleSortChange} />
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
                  <div className="group relative flex min-h-[320px] overflow-hidden rounded-[18px] bg-[var(--bg-secondary)] p-7 text-white">
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 ease-in-out group-hover:scale-[1.02]"
                      style={{ backgroundImage: `url("${MUSIC_HERO_IMAGE}")` }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.2) 100%), linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 100%)",
                      }}
                    />

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
                            documentary warmth, after-dark tension, open travel
                            cues, and polished brand motion.
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

                  <div className="group relative hidden min-h-[320px] overflow-hidden rounded-[18px] bg-[var(--bg-secondary)] p-7 text-white xl:flex xl:flex-col xl:justify-between">
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 ease-in-out group-hover:scale-[1.02]"
                      style={{
                        backgroundImage: `url("${DESKTOP_SYNC_IMAGE}")`,
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.78) 100%), linear-gradient(90deg, rgba(0,0,0,0.26), rgba(0,0,0,0.08))",
                      }}
                    />

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
          <div
            className={`${hasActiveFilters ? "mt-3" : ""} border-t border-[var(--border-subtle)]`}
          >
            <SkeletonSongList />
          </div>
        ) : (
          <div
            className={`${hasActiveFilters ? "mt-3" : ""} border-t border-[var(--border-subtle)] pb-6`}
          >
            {displayedSongs.map((song, index) => (
              <SongCard
                key={getMusicSongStableId(song, index)}
                song={song}
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
