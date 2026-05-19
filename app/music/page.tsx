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

import BPMFilter from "@/components/BPMFilter";
import DurationFilter from "@/components/DurationFilter";
import FilterDropdown from "@/components/FilterDropdown";
import FilterTags from "@/components/FilterTags";
import Footer from "@/components/Footer";
import KeyFilter from "@/components/KeyFilter";
import PlaylistFilter from "@/components/PlaylistFilter";
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
import {
  filterDotClass,
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";

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

          <div className="-mx-7 flex min-h-[49px] flex-wrap items-center gap-2 border-t border-b border-[var(--border)] px-7 py-2">
            <FilterDropdown
              label="Mood"
              options={MOOD_OPTIONS}
              selected={selectedMoods}
              onChange={setSelectedMoods}
            />

            <FilterDropdown
              label="Genre"
              options={GENRE_OPTIONS}
              selected={selectedGenres}
              onChange={setSelectedGenres}
            />

            <FilterDropdown
              label="Instrument"
              options={INSTRUMENT_OPTIONS}
              selected={selectedInstruments}
              onChange={setSelectedInstruments}
            />

            <FilterDropdown
              label="Build"
              options={BUILD_OPTIONS}
              selected={selectedBuilds}
              onChange={setSelectedBuilds}
            />

            <FilterDropdown
              label="Vocals"
              options={VOCALS_OPTIONS}
              selected={selectedVocals}
              onChange={setSelectedVocals}
            />

            <FilterDropdown
              label="Edit Point"
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
              onClick={() => setShowEditPointMarkers(!showEditPointMarkers)}
              className={`${filterTriggerBaseClass} ${
                showEditPointMarkers
                  ? filterTriggerActiveClass
                  : filterTriggerInactiveClass
              } ${showEditPointMarkers ? "pr-2" : ""}`}
              aria-pressed={showEditPointMarkers}
            >
              <span>Markers</span>
              {showEditPointMarkers && <span className={filterDotClass} />}
            </button>

            <BPMFilter value={bpmValue} onChange={setBpmValue} />

            <KeyFilter value={keyValue} onChange={setKeyValue} />

            <DurationFilter
              selected={selectedDurations}
              onChange={setSelectedDurations}
            />

            <button
              type="button"
              onClick={() => setInstrumental(!instrumental)}
              className={`${filterTriggerBaseClass} ${
                instrumental
                  ? filterTriggerActiveClass
                  : filterTriggerInactiveClass
              } ${instrumental ? "pr-2" : ""}`}
            >
              <span>Instrumental</span>

              {instrumental && <span className={filterDotClass} />}
            </button>

            <PlaylistFilter
              selected={selectedPlaylist}
              onChange={setSelectedPlaylist}
            />

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
              className={`${iconButtonClass} ml-auto ${
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
