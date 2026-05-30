import {
  getStoredCuePointFilterSelection,
  notifyCuePointFilterSelection,
} from "@/lib/cuePointFilterSelection";
import {
  EDIT_POINT_MARKER_VISIBILITY_EVENT,
  getStoredEditPointMarkerVisibility,
  setStoredEditPointMarkerVisibility,
} from "@/lib/editPointMarkerVisibility";
import type { BpmFilterValue, KeyFilterValue, PlaylistRef } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type FilterState = {
  search: string;
  selectedMoods: string[];
  selectedGenres: string[];
  selectedInstruments: string[];
  selectedBuilds: string[];
  selectedVocals: string[];
  selectedDurations: string[];
  selectedEditPoints: string[];
  showEditPointMarkers: boolean;
  instrumental: boolean;
  bpmValue: BpmFilterValue | null;
  keyValue: KeyFilterValue | null;
  selectedPlaylist: PlaylistRef | null;
};

type FilterStateCompat = {
  search: string;
  moods: string[];
  genres: string[];
  instruments: string[];
  builds: string[];
  vocals: string[];
  durations: string[];
  editPoints: string[];
  showEditPointMarkers: boolean;
  instrumental: boolean;
  bpm: BpmFilterValue | null;
  key: KeyFilterValue | null;
  playlist: PlaylistRef | null;
};

type UseFilterPersistenceProps = {
  storageKey: string | null;
  authLoaded: boolean;
};

const baseDefaultState: FilterState = {
  search: "",
  selectedMoods: [],
  selectedGenres: [],
  selectedInstruments: [],
  selectedBuilds: [],
  selectedVocals: [],
  selectedDurations: [],
  selectedEditPoints: [],
  showEditPointMarkers: true,
  instrumental: false,
  bpmValue: null,
  keyValue: null,
  selectedPlaylist: null,
};

function withCompatAliases(state: FilterState): FilterStateCompat {
  return {
    search: state.search,
    moods: state.selectedMoods,
    genres: state.selectedGenres,
    instruments: state.selectedInstruments,
    builds: state.selectedBuilds,
    vocals: state.selectedVocals,
    durations: state.selectedDurations,
    editPoints: state.selectedEditPoints,
    showEditPointMarkers: state.showEditPointMarkers,
    instrumental: state.instrumental,
    bpm: state.bpmValue,
    key: state.keyValue,
    playlist: state.selectedPlaylist,
  };
}

function normalizeCompatAliases(state: FilterState | Partial<FilterStateCompat>): FilterState {
  return {
    search: typeof state.search === "string" ? state.search : "",
    selectedMoods: Array.isArray("selectedMoods" in state ? state.selectedMoods : undefined)
      ? (state as FilterState).selectedMoods
      : Array.isArray(state.moods)
        ? state.moods
        : [],
    selectedGenres: Array.isArray("selectedGenres" in state ? state.selectedGenres : undefined)
      ? (state as FilterState).selectedGenres
      : Array.isArray(state.genres)
        ? state.genres
        : [],
    selectedInstruments: Array.isArray("selectedInstruments" in state ? state.selectedInstruments : undefined)
      ? (state as FilterState).selectedInstruments
      : Array.isArray(state.instruments)
        ? state.instruments
        : [],
    selectedBuilds: Array.isArray("selectedBuilds" in state ? state.selectedBuilds : undefined)
      ? (state as FilterState).selectedBuilds
      : Array.isArray(state.builds)
        ? state.builds
        : [],
    selectedVocals: Array.isArray("selectedVocals" in state ? state.selectedVocals : undefined)
      ? (state as FilterState).selectedVocals
      : Array.isArray(state.vocals)
        ? state.vocals
        : [],
    selectedDurations: Array.isArray("selectedDurations" in state ? state.selectedDurations : undefined)
      ? (state as FilterState).selectedDurations
      : Array.isArray(state.durations)
        ? state.durations
        : [],
    selectedEditPoints: Array.isArray("selectedEditPoints" in state ? state.selectedEditPoints : undefined)
      ? (state as FilterState).selectedEditPoints
      : Array.isArray(state.editPoints)
        ? state.editPoints
        : [],
    showEditPointMarkers:
      typeof state.showEditPointMarkers === "boolean"
        ? state.showEditPointMarkers
        : true,
    instrumental: typeof state.instrumental === "boolean" ? state.instrumental : false,
    bpmValue: "bpmValue" in state ? state.bpmValue : state.bpm ?? null,
    keyValue: "keyValue" in state ? state.keyValue : state.key ?? null,
    selectedPlaylist: "selectedPlaylist" in state ? state.selectedPlaylist : state.playlist ?? null,
  };
}

function getDefaultState(): FilterState {
  return {
    ...baseDefaultState,
    selectedEditPoints: getStoredCuePointFilterSelection(),
    showEditPointMarkers: getStoredEditPointMarkerVisibility(),
  };
}

function getEditPointMarkerVisibilityFromEvent(event: Event) {
  const customEvent = event as CustomEvent<{ visible?: boolean }>;

  if (typeof customEvent.detail?.visible === "boolean") {
    return customEvent.detail.visible;
  }

  return getStoredEditPointMarkerVisibility();
}

function normalizeFilterState(parsed: Record<string, unknown>): FilterState {
  return normalizeCompatAliases({
    search: typeof parsed.search === "string" ? parsed.search : "",
    selectedMoods: Array.isArray(parsed.selectedMoods) ? parsed.selectedMoods : parsed.moods,
    selectedGenres: Array.isArray(parsed.selectedGenres) ? parsed.selectedGenres : parsed.genres,
    selectedInstruments: Array.isArray(parsed.selectedInstruments)
      ? parsed.selectedInstruments
      : parsed.instruments,
    selectedBuilds: Array.isArray(parsed.selectedBuilds) ? parsed.selectedBuilds : parsed.builds,
    selectedVocals: Array.isArray(parsed.selectedVocals) ? parsed.selectedVocals : parsed.vocals,
    selectedDurations: Array.isArray(parsed.selectedDurations)
      ? parsed.selectedDurations
      : parsed.durations,
    selectedEditPoints: Array.isArray(parsed.selectedEditPoints)
      ? parsed.selectedEditPoints
      : parsed.editPoints,
    showEditPointMarkers: getStoredEditPointMarkerVisibility(),
    instrumental:
      typeof parsed.instrumental === "boolean" ? parsed.instrumental : false,
    bpmValue: (parsed.bpmValue as BpmFilterValue | null) ?? (parsed.bpm as BpmFilterValue | null) ?? null,
    keyValue: (parsed.keyValue as KeyFilterValue | null) ?? (parsed.key as KeyFilterValue | null) ?? null,
    selectedPlaylist:
      (parsed.selectedPlaylist as PlaylistRef | null) ??
      (parsed.playlist as PlaylistRef | null) ??
      null,
  });
}

export function useFilterPersistence(
  propsOrStorageKey: UseFilterPersistenceProps | string | null,
) {
  const storageKey =
    typeof propsOrStorageKey === "object" && propsOrStorageKey !== null
      ? propsOrStorageKey.storageKey
      : propsOrStorageKey;
  const authLoaded =
    typeof propsOrStorageKey === "object" && propsOrStorageKey !== null
      ? propsOrStorageKey.authLoaded
      : true;

  const [hydrated, setHydrated] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [filters, setRawFilters] = useState<FilterState>(baseDefaultState);

  const compatFilters = useMemo(() => withCompatAliases(filters), [filters]);

  const setFilters = (next: Partial<FilterStateCompat> | FilterState | ((current: FilterStateCompat) => Partial<FilterStateCompat> | FilterState)) => {
    setRawFilters((current) => {
      const resolved = typeof next === "function" ? next(withCompatAliases(current)) : next;
      return normalizeCompatAliases(resolved);
    });
  };

  useEffect(() => {
    const handleEditPointMarkerVisibility = (event: Event) => {
      const visible = getEditPointMarkerVisibilityFromEvent(event);

      setRawFilters((current) =>
        current.showEditPointMarkers === visible
          ? current
          : { ...current, showEditPointMarkers: visible },
      );
    };

    window.addEventListener(
      EDIT_POINT_MARKER_VISIBILITY_EVENT,
      handleEditPointMarkerVisibility,
    );
    window.addEventListener("storage", handleEditPointMarkerVisibility);

    return () => {
      window.removeEventListener(
        EDIT_POINT_MARKER_VISIBILITY_EVENT,
        handleEditPointMarkerVisibility,
      );
      window.removeEventListener("storage", handleEditPointMarkerVisibility);
    };
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    setHydrated(false);
    setHydratedKey(null);
    sessionStorage.removeItem("filmwave-music-filters");

    if (!storageKey) {
      const defaultState = getDefaultState();

      setRawFilters(defaultState);
      notifyCuePointFilterSelection(defaultState.selectedEditPoints);
      setHydrated(true);
      setHydratedKey(null);
      return;
    }

    const saved = sessionStorage.getItem(storageKey);

    if (!saved) {
      const defaultState = getDefaultState();

      setRawFilters(defaultState);
      notifyCuePointFilterSelection(defaultState.selectedEditPoints);
      setHydrated(true);
      setHydratedKey(storageKey);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      const normalizedState = normalizeFilterState(parsed);

      setRawFilters(normalizedState);
      notifyCuePointFilterSelection(normalizedState.selectedEditPoints);
    } catch {
      const defaultState = getDefaultState();

      sessionStorage.removeItem(storageKey);
      setRawFilters(defaultState);
      notifyCuePointFilterSelection(defaultState.selectedEditPoints);
    } finally {
      setHydrated(true);
      setHydratedKey(storageKey);
    }
  }, [authLoaded, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (!storageKey) return;
    if (hydratedKey !== storageKey) return;

    sessionStorage.setItem(storageKey, JSON.stringify(filters));
    notifyCuePointFilterSelection(filters.selectedEditPoints);
    setStoredEditPointMarkerVisibility(filters.showEditPointMarkers);
  }, [hydrated, hydratedKey, storageKey, filters]);

  return { filters: compatFilters, setFilters, hydrated };
}
