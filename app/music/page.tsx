"use client";

import type { BpmFilterValue, KeyFilterValue, PlaylistRef } from "@/lib/types";
import SongCard from "@/components/SongCard";
import Footer from "@/components/Footer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSongs } from "@/hooks/useSongs";
import FilterDropdown from "@/components/FilterDropdown";
import BPMFilter from "@/components/BPMFilter";
import KeyFilter from "@/components/KeyFilter";
import DurationFilter from "@/components/DurationFilter";
import PlaylistFilter from "@/components/PlaylistFilter";
import SkeletonSongList from "@/components/SkeletonSongCard";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@clerk/nextjs";
import {
  iconButtonClass,
  primaryPillButtonClass,
} from "@/components/uiClasses";
import {
  filterDotClass,
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";

const MOOD_OPTIONS = [
  "Adventurous",
  "Aggressive",
  "Anthemic",
  "Bright",
  "Burdened",
  "Chill",
  "Dark",
  "Dramatic",
  "Dreamy",
  "Eerie",
  "Emotional",
  "Empowering",
  "Energetic",
  "Epic",
  "Feel Good",
  "Fun",
  "Gritty",
  "Happy",
  "Heroic",
  "Hopeful",
  "Horror",
  "Inspirational",
  "Loving",
  "Mysterious",
  "Nostalgic",
  "Peaceful",
  "Playful",
  "Powerful",
  "Quirky",
  "Reflective",
  "Rebellious",
  "Romantic",
  "Sinister",
  "Sorrowful",
  "Soothing",
  "Spiritual",
  "Suspenseful",
  "Tense",
  "Triumphant",
  "Upbeat",
  "Uplifting",
  "Vintage",
  "Whimsical",
];

const GENRE_OPTIONS = [
  "Acoustic",
  "Ambient",
  "Background",
  "Blues",
  "Christmas",
  "Cinematic",
  "Classical",
  "Corporate",
  "Country",
  "Eastern",
  "Electronic",
  "Faith",
  "Film",
  "Folk",
  "Hip Hop",
  "Indie",
  "Jazz",
  "Lo-Fi",
  "Orchestral",
  "Pop",
  "R&B",
  "Rock",
  "Score",
  "Soul",
  "Trap",
  "World",
  "YouTube",
];

const INSTRUMENT_OPTIONS = [
  "Acoustic Guitar",
  "Banjo",
  "Bass",
  "Bells",
  "Cello",
  "Claps",
  "Drums",
  "Electronic",
  "Electric Guitar",
  "Flute",
  "Guitar",
  "Harp",
  "Horns",
  "Organ",
  "Percussion",
  "Piano",
  "Saxophone",
  "Snaps",
  "Snare",
  "Strings",
  "Synth",
  "Trumpet",
  "Violin",
  "Whistling",
  "Woodwinds",
  "World",
];

const BUILD_OPTIONS = [
  "Steady",
  "Ascending",
  "Middle Crescendo",
  "Descending",
  "Multiple Crescendo",
];

const VOCALS_OPTIONS = ["Male", "Female", "Acapella", "Choir", "Harmony"];

const QUICK_FILTERS = [
  "Cinematic",
  "YouTube",
  "Background",
  "Ambient",
  "Hip Hop",
];

const MUSIC_FILTER_STORAGE_KEY_PREFIX = "filmwave-music-filters";

function includesAll(values: string[], selected: string[]) {
  if (selected.length === 0) return true;

  return selected.every((selectedValue) => values.includes(selectedValue));
}

function matchesDurationFilter(duration: number, selectedDurations: string[]) {
  if (selectedDurations.length === 0) return true;

  return selectedDurations.some((selectedDuration) => {
    if (selectedDuration === "< 1:00") return duration < 60;
    if (selectedDuration === "0:00 - 1:00") {
      return duration >= 0 && duration <= 60;
    }
    if (selectedDuration === "1:00 - 2:00") {
      return duration >= 60 && duration <= 120;
    }
    if (selectedDuration === "2:00 - 3:00") {
      return duration >= 120 && duration <= 180;
    }
    if (selectedDuration === "3:00 - 4:00") {
      return duration >= 180 && duration <= 240;
    }
    if (selectedDuration === "4:00+") return duration >= 240;

    const rangeMatch = selectedDuration.match(
      /^(\d+):(\d{2}) - (\d+):(\d{2})$/,
    );

    if (rangeMatch) {
      const [, lowMinutes, lowSeconds, highMinutes, highSeconds] = rangeMatch;
      const low = Number(lowMinutes) * 60 + Number(lowSeconds);
      const high = Number(highMinutes) * 60 + Number(highSeconds);

      return duration >= low && duration <= high;
    }

    const plusMatch = selectedDuration.match(/^(\d+):(\d{2})\+$/);

    if (plusMatch) {
      const [, minutes, seconds] = plusMatch;
      const low = Number(minutes) * 60 + Number(seconds);

      return duration >= low;
    }

    return true;
  });
}

function matchesBpmFilter(bpm: number, bpmValue: BpmFilterValue | null) {
  if (!bpmValue) return true;

  if (bpmValue.mode === "exact") {
    return bpm === bpmValue.exact;
  }

  return bpm >= bpmValue.low && bpm <= bpmValue.high;
}

function normalizeKeyText(value: string) {
  return value.trim().replaceAll("♯", "#").replaceAll("♭", "b").toLowerCase();
}

function matchesKeyFilter(songKey: string, keyValue: KeyFilterValue | null) {
  if (!keyValue?.note) return true;

  const normalizedSongKey = normalizeKeyText(songKey);
  const normalizedNote = normalizeKeyText(keyValue.note);

  const songNote = normalizedSongKey.match(/^([a-g](?:#|b)?)/)?.[1];

  if (songNote !== normalizedNote) return false;

  if (!keyValue.scale) return true;

  const normalizedScale = keyValue.scale.toLowerCase();

  if (normalizedScale === "major") {
    return normalizedSongKey.includes("maj");
  }

  if (normalizedScale === "minor") {
    return normalizedSongKey.includes("min");
  }

  return true;
}

function getRecord(value: unknown) {
  return value as Record<string, unknown>;
}

function getStringFromRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

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
  const playlistSongIdCacheRef = useRef<Record<string, string[]>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedBuilds, setSelectedBuilds] = useState<string[]>([]);
  const [selectedVocals, setSelectedVocals] = useState<string[]>([]);
  const [bpmValue, setBpmValue] = useState<BpmFilterValue | null>(null);
  const [keyValue, setKeyValue] = useState<KeyFilterValue | null>(null);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [instrumental, setInstrumental] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistRef | null>(
    null,
  );
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
    if (!authLoaded) return;

    setFiltersHydrated(false);
    setHydratedStorageKey(null);

    sessionStorage.removeItem("filmwave-music-filters");

    function resetFilters() {
      setSearch("");
      setSelectedMoods([]);
      setSelectedGenres([]);
      setSelectedInstruments([]);
      setSelectedBuilds([]);
      setSelectedVocals([]);
      setSelectedDurations([]);
      setInstrumental(false);
      setBpmValue(null);
      setKeyValue(null);
      setSelectedPlaylist(null);
      setSelectedPlaylistSongIds(null);
      setShuffleOrderIds(null);
    }

    if (!musicFilterStorageKey) {
      resetFilters();
      setFiltersHydrated(true);
      setHydratedStorageKey(null);
      return;
    }

    const saved = sessionStorage.getItem(musicFilterStorageKey);

    if (!saved) {
      resetFilters();
      setFiltersHydrated(true);
      setHydratedStorageKey(musicFilterStorageKey);
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      setSearch(parsed.search ?? "");
      setSelectedMoods(parsed.selectedMoods ?? []);
      setSelectedGenres(parsed.selectedGenres ?? []);
      setSelectedInstruments(parsed.selectedInstruments ?? []);
      setSelectedBuilds(parsed.selectedBuilds ?? []);
      setSelectedVocals(parsed.selectedVocals ?? []);
      setSelectedDurations(parsed.selectedDurations ?? []);
      setInstrumental(parsed.instrumental ?? false);
      setBpmValue(parsed.bpmValue ?? null);
      setKeyValue(parsed.keyValue ?? null);
      setSelectedPlaylist(parsed.selectedPlaylist ?? null);
      setShuffleOrderIds(null);
    } catch {
      sessionStorage.removeItem(musicFilterStorageKey);
      resetFilters();
    } finally {
      setFiltersHydrated(true);
      setHydratedStorageKey(musicFilterStorageKey);
    }
  }, [authLoaded, musicFilterStorageKey]);

  useEffect(() => {
    if (!filtersHydrated) return;
    if (!musicFilterStorageKey) return;
    if (hydratedStorageKey !== musicFilterStorageKey) return;

    sessionStorage.setItem(
      musicFilterStorageKey,
      JSON.stringify({
        search,
        selectedMoods,
        selectedGenres,
        selectedInstruments,
        selectedBuilds,
        selectedVocals,
        selectedDurations,
        instrumental,
        bpmValue,
        keyValue,
        selectedPlaylist,
      }),
    );
  }, [
    filtersHydrated,
    hydratedStorageKey,
    musicFilterStorageKey,
    search,
    selectedMoods,
    selectedGenres,
    selectedInstruments,
    selectedBuilds,
    selectedVocals,
    selectedDurations,
    instrumental,
    bpmValue,
    keyValue,
    selectedPlaylist,
  ]);

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
    bpmValue,
    keyValue,
    instrumental,
    selectedPlaylistId,
    selectedPlaylistSongIds,
  ]);

  const displayedSongs = useMemo(() => {
    const reversedSongs = [...filteredSongs].reverse();

    if (!shuffleOrderIds) return reversedSongs;

    const orderMap = new Map(
      shuffleOrderIds.map((songId, index) => [songId, index]),
    );

    return [...reversedSongs].sort((a, b) => {
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 38.31 38.31"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 text-[var(--text-muted)]"
                aria-hidden="true"
              >
                <path
                  d="M38.31,35.48l-11.75-11.74c1.89-2.49,3.03-5.58,3.03-8.94C29.6,6.64,22.96,0,14.8,0S0,6.64,0,14.8s6.64,14.8,14.8,14.8c3.36,0,6.45-1.14,8.94-3.03l11.75,11.74,2.83-2.83ZM14.8,25.6c-5.96,0-10.8-4.84-10.8-10.8S8.84,4,14.8,4s10.8,4.85,10.8,10.8-4.84,10.8-10.8,10.8Z"
                  fill="currentColor"
                />
              </svg>

              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-[15px] font-[300] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>

            {(() => {
              const tags: {
                id: string;
                label: string;
                onRemove: () => void;
                type?: "playlist";
              }[] = [
                ...selectedMoods.map((value) => ({
                  id: `mood-${value}`,
                  label: value,
                  onRemove: () =>
                    setSelectedMoods(
                      selectedMoods.filter((item) => item !== value),
                    ),
                })),
                ...selectedGenres.map((value) => ({
                  id: `genre-${value}`,
                  label: value,
                  onRemove: () =>
                    setSelectedGenres(
                      selectedGenres.filter((item) => item !== value),
                    ),
                })),
                ...selectedInstruments.map((value) => ({
                  id: `instrument-${value}`,
                  label: value,
                  onRemove: () =>
                    setSelectedInstruments(
                      selectedInstruments.filter((item) => item !== value),
                    ),
                })),
                ...selectedBuilds.map((value) => ({
                  id: `build-${value}`,
                  label: value,
                  onRemove: () =>
                    setSelectedBuilds(
                      selectedBuilds.filter((item) => item !== value),
                    ),
                })),
                ...selectedVocals.map((value) => ({
                  id: `vocals-${value}`,
                  label: value,
                  onRemove: () =>
                    setSelectedVocals(
                      selectedVocals.filter((item) => item !== value),
                    ),
                })),
                ...selectedDurations.map((value) => ({
                  id: `duration-${value}`,
                  label: value,
                  onRemove: () =>
                    setSelectedDurations(
                      selectedDurations.filter((item) => item !== value),
                    ),
                })),
                ...(instrumental
                  ? [
                      {
                        id: "instrumental",
                        label: "Instrumental",
                        onRemove: () => setInstrumental(false),
                      },
                    ]
                  : []),
                ...(bpmValue
                  ? [
                      {
                        id: "bpm",
                        label:
                          bpmValue.mode === "exact"
                            ? `${bpmValue.exact} BPM`
                            : `${bpmValue.low}–${bpmValue.high} BPM`,
                        onRemove: () => setBpmValue(null),
                      },
                    ]
                  : []),
                ...(keyValue
                  ? [
                      {
                        id: "key",
                        label: [
                          keyValue.note,
                          keyValue.scale
                            ? keyValue.scale.charAt(0).toUpperCase() +
                              keyValue.scale.slice(1)
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" "),
                        onRemove: () => setKeyValue(null),
                      },
                    ]
                  : []),
                ...(selectedPlaylist
                  ? [
                      {
                        id: `playlist-${selectedPlaylist.id}`,
                        label: selectedPlaylist.name,
                        type: "playlist" as const,
                        onRemove: () => setSelectedPlaylist(null),
                      },
                    ]
                  : []),
                ...(shuffleActive
                  ? [
                      {
                        id: "shuffle",
                        label: "Shuffle",
                        onRemove: () => setShuffleOrderIds(null),
                      },
                    ]
                  : []),
              ];

              if (tags.length === 0) return null;

              return (
                <div className="relative z-10 flex flex-1 pointer-events-none flex-wrap items-center justify-end gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="pointer-events-auto flex cursor-default items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-black"
                      style={{ backgroundColor: "var(--accent)" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {tag.type === "playlist" && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="shrink-0"
                        >
                          <path
                            d="M5 7H19"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          />
                          <path
                            d="M5 12H15"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          />
                          <path
                            d="M5 17H11"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}

                      {tag.label}

                      <button
                        type="button"
                        onClick={tag.onRemove}
                        className="flex cursor-pointer items-center text-sm leading-none transition-opacity hover:opacity-60"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              );
            })()}
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

            <BPMFilter value={bpmValue} onChange={setBpmValue} />

            <KeyFilter value={keyValue} onChange={setKeyValue} />

            <DurationFilter
              selected={selectedDurations}
              onChange={setSelectedDurations}
            />

            <button
              type="button"
              onClick={() => setInstrumental((value) => !value)}
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
                const reversedSongs = [...filteredSongs].reverse();
                const shuffledSongs = shuffleSongList(reversedSongs);

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
                className={`cursor-pointer rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        <div className="px-8 pt-[38px] pb-[42px]">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Music Library
          </div>

          <h1 className="mt-2 max-w-[640px] font-[family-name:var(--font-instrument-sans)] text-[56px] font-medium leading-[0.94] tracking-[-0.055em] text-[var(--text-primary)]">
            Discover
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
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
