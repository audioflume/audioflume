"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import {
  BUILD_OPTIONS,
  EDIT_POINT_FILTER_OPTIONS,
  GENRE_OPTIONS,
  INSTRUMENT_OPTIONS,
  MOOD_OPTIONS,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
  MusicFilterPanel,
  MusicLibraryToolbar,
  REGION_OPTIONS,
  VOCALS_OPTIONS,
} from "@filmwave/shared";
import SearchIcon from "@/components/icons/SearchIcon";
import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import type { BpmFilterValue, KeyFilterValue } from "@/lib/types";

const INSTRUMENTAL_VOCAL_FILTER_OPTION = "Instrumental";
const VOCAL_FILTER_OPTIONS = [INSTRUMENTAL_VOCAL_FILTER_OPTION, ...VOCALS_OPTIONS];

function toggleIn(values: string[], setValues: (next: string[]) => void) {
  return (option: string) =>
    setValues(
      values.includes(option)
        ? values.filter((item) => item !== option)
        : [...values, option],
    );
}

export default function DiscoverMusicToolbarOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const musicFilterStorageKey = userId
    ? `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${userId}`
    : null;

  const { filters, setFilters, hydrated } = useFilterPersistence({
    storageKey: musicFilterStorageKey,
    authLoaded: isLoaded,
  });

  if (pathname !== "/discover") return null;

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

  const selectedVocalFilters = instrumental
    ? [INSTRUMENTAL_VOCAL_FILTER_OPTION, ...selectedVocals]
    : selectedVocals;

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
  const setBpmValue = (value: BpmFilterValue | null) =>
    setFilters((current) => ({ ...current, bpmValue: value }));
  const setKeyValue = (value: KeyFilterValue | null) =>
    setFilters((current) => ({ ...current, keyValue: value }));

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
    (keyValue !== null ? 1 : 0);

  const hasActiveClearableFilters = activeFilterCount > 0;

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

  function submitToMusic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanSearch = search.trim();
    router.push(cleanSearch ? `/music?search=${encodeURIComponent(cleanSearch)}` : "/music");
  }

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
        const option = EDIT_POINT_FILTER_OPTIONS.find((item) => item.label === label);
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
    <>
      <style>{`
        .discover-music-toolbar-shell {
          position: fixed;
          top: var(--filmwave-header-height, 56px);
          right: 0;
          left: 0;
          z-index: var(--filmwave-z-search-filter, 60);
          box-sizing: border-box;
          height: 50px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
          padding: 0 24px;
        }

        .discover-music-toolbar-form {
          height: 100%;
        }

        .discover-music-toolbar-shell .fw-toolbar-sticky {
          position: static !important;
          top: auto !important;
          width: 100% !important;
          max-width: none !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
          background: transparent !important;
        }

        .discover-music-toolbar-shell .fw-toolbar-float {
          display: flex !important;
          height: 50px !important;
          min-height: 50px !important;
          align-items: center !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        .discover-music-toolbar-shell .fw-toolbar {
          width: 100%;
        }

        .discover-music-toolbar-shell .fw-filter-panel-wrap {
          position: absolute !important;
          top: 50px;
          right: 24px;
          left: 24px;
          z-index: calc(var(--filmwave-z-search-filter, 60) + 1);
        }

        .discover-music-toolbar-shell .fw-filter-panel {
          width: min(900px, 100%);
          margin: 0 auto;
        }

        .discover-toolbar-submit {
          display: inline-flex;
          height: 32px;
          flex-shrink: 0;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 999px;
          background: var(--text-primary);
          padding: 0 18px;
          color: var(--bg-primary);
          font-family: inherit;
          font-size: 12px;
          font-weight: 400;
          line-height: 1;
          transition: opacity 150ms ease;
        }

        .discover-toolbar-submit:hover {
          opacity: 0.82;
        }

        main:has(a[href^="/curated-playlists/"]) > section > div {
          padding-top: 76px !important;
        }

        main:has(a[href^="/curated-playlists/"]) section.mt-6.block:has(> form.group) {
          display: none !important;
        }
      `}</style>

      <div className="discover-music-toolbar-shell">
        <form className="discover-music-toolbar-form" onSubmit={submitToMusic}>
          <MusicLibraryToolbar
            className="discover-music-toolbar"
            searchValue={search}
            searchPlaceholder="Search by scene, mood, artist, genre, instrument, or title..."
            onSearchChange={setSearch}
            searchInputRef={searchInputRef}
            searchIcon={<SearchIcon />}
            filterCount={activeFilterCount}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
            onClearFilters={clearAllFilters}
            actions={
              <button type="submit" className="discover-toolbar-submit">
                Search
              </button>
            }
          >
            <MusicFilterPanel
              open={filtersOpen}
              groups={filterChipGroups}
              bpmValue={bpmValue}
              onBpmChange={setBpmValue}
              keyValue={keyValue}
              onKeyChange={setKeyValue}
              selectedDurations={selectedDurations}
              onDurationsChange={setSelectedDurations}
              markersDisabled={!hydrated}
              hasActive={hasActiveClearableFilters}
              onClearAll={clearAllFilters}
              onClose={() => setFiltersOpen(false)}
            />
          </MusicLibraryToolbar>
        </form>
      </div>
    </>
  );
}
