import {
  getStoredCuePointFilterSelection,
  notifyCuePointFilterSelection,
} from "@/lib/cuePointFilterSelection";
import type { BpmFilterValue, KeyFilterValue, PlaylistRef } from "@/lib/types";
import { useEffect, useState } from "react";

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

type UseFilterPersistenceProps = {
  storageKey: string | null;
  authLoaded: boolean;
};

const MUSIC_LIBRARY_MARKER_VISIBILITY_EVENT =
  "filmwave:music-library-marker-visibility";

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

function getDefaultState(): FilterState {
  return {
    ...baseDefaultState,
    selectedEditPoints: getStoredCuePointFilterSelection(),
  };
}

function notifyMusicLibraryMarkerVisibility(visible: boolean) {
  const event = new Event(MUSIC_LIBRARY_MARKER_VISIBILITY_EVENT) as Event & {
    visible?: boolean;
  };

  event.visible = visible;
  window.dispatchEvent(event);
}

function getMusicLibraryMarkerVisibilityFromEvent(event: Event) {
  const markerEvent = event as Event & { visible?: boolean };
  const customEvent = event as CustomEvent<{ visible?: boolean }>;

  if (typeof markerEvent.visible === "boolean") return markerEvent.visible;
  if (typeof customEvent.detail?.visible === "boolean") {
    return customEvent.detail.visible;
  }

  return null;
}

function normalizeFilterState(parsed: Record<string, unknown>): FilterState {
  return {
    search: typeof parsed.search === "string" ? parsed.search : "",
    selectedMoods: Array.isArray(parsed.selectedMoods) ? parsed.selectedMoods : [],
    selectedGenres: Array.isArray(parsed.selectedGenres)
      ? parsed.selectedGenres
      : [],
    selectedInstruments: Array.isArray(parsed.selectedInstruments)
      ? parsed.selectedInstruments
      : [],
    selectedBuilds: Array.isArray(parsed.selectedBuilds) ? parsed.selectedBuilds : [],
    selectedVocals: Array.isArray(parsed.selectedVocals) ? parsed.selectedVocals : [],
    selectedDurations: Array.isArray(parsed.selectedDurations)
      ? parsed.selectedDurations
      : [],
    selectedEditPoints: Array.isArray(parsed.selectedEditPoints)
      ? parsed.selectedEditPoints
      : [],
    showEditPointMarkers:
      typeof parsed.showEditPointMarkers === "boolean"
        ? parsed.showEditPointMarkers
        : baseDefaultState.showEditPointMarkers,
    instrumental:
      typeof parsed.instrumental === "boolean" ? parsed.instrumental : false,
    bpmValue: (parsed.bpmValue as BpmFilterValue | null) ?? null,
    keyValue: (parsed.keyValue as KeyFilterValue | null) ?? null,
    selectedPlaylist: (parsed.selectedPlaylist as PlaylistRef | null) ?? null,
  };
}

export function useFilterPersistence({
  storageKey,
  authLoaded,
}: UseFilterPersistenceProps) {
  const [hydrated, setHydrated] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(baseDefaultState);

  useEffect(() => {
    const handleMusicLibraryMarkerVisibility = (event: Event) => {
      const visible = getMusicLibraryMarkerVisibilityFromEvent(event);

      if (visible === null) return;

      setFilters((current) =>
        current.showEditPointMarkers === visible
          ? current
          : { ...current, showEditPointMarkers: visible },
      );
    };

    window.addEventListener(
      MUSIC_LIBRARY_MARKER_VISIBILITY_EVENT,
      handleMusicLibraryMarkerVisibility,
    );

    return () => {
      window.removeEventListener(
        MUSIC_LIBRARY_MARKER_VISIBILITY_EVENT,
        handleMusicLibraryMarkerVisibility,
      );
    };
  }, []);

  // Hydrate from sessionStorage when auth loads or user changes
  useEffect(() => {
    if (!authLoaded) return;

    setHydrated(false);
    setHydratedKey(null);
    sessionStorage.removeItem("filmwave-music-filters");

    if (!storageKey) {
      const defaultState = getDefaultState();

      setFilters(defaultState);
      notifyCuePointFilterSelection(defaultState.selectedEditPoints);
      notifyMusicLibraryMarkerVisibility(defaultState.showEditPointMarkers);
      setHydrated(true);
      setHydratedKey(null);
      return;
    }

    const saved = sessionStorage.getItem(storageKey);

    if (!saved) {
      const defaultState = getDefaultState();

      setFilters(defaultState);
      notifyCuePointFilterSelection(defaultState.selectedEditPoints);
      notifyMusicLibraryMarkerVisibility(defaultState.showEditPointMarkers);
      setHydrated(true);
      setHydratedKey(storageKey);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      const normalizedState = normalizeFilterState(parsed);

      setFilters(normalizedState);
      notifyCuePointFilterSelection(normalizedState.selectedEditPoints);
      notifyMusicLibraryMarkerVisibility(normalizedState.showEditPointMarkers);
    } catch {
      const defaultState = getDefaultState();

      sessionStorage.removeItem(storageKey);
      setFilters(defaultState);
      notifyCuePointFilterSelection(defaultState.selectedEditPoints);
      notifyMusicLibraryMarkerVisibility(defaultState.showEditPointMarkers);
    } finally {
      setHydrated(true);
      setHydratedKey(storageKey);
    }
  }, [authLoaded, storageKey]);

  // Persist to storage whenever filters change
  useEffect(() => {
    if (!hydrated) return;
    if (!storageKey) return;
    if (hydratedKey !== storageKey) return;

    sessionStorage.setItem(storageKey, JSON.stringify(filters));
    notifyCuePointFilterSelection(filters.selectedEditPoints);
    notifyMusicLibraryMarkerVisibility(filters.showEditPointMarkers);
  }, [hydrated, hydratedKey, storageKey, filters]);

  return { filters, setFilters, hydrated };
}
