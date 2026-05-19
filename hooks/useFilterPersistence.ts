import {
  getStoredEditPointMarkerVisibility,
  setStoredEditPointMarkerVisibility,
} from "@/lib/editPointMarkerVisibility";
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

const baseDefaultState: FilterState = {
  search: "",
  selectedMoods: [],
  selectedGenres: [],
  selectedInstruments: [],
  selectedBuilds: [],
  selectedVocals: [],
  selectedDurations: [],
  selectedEditPoints: [],
  showEditPointMarkers: false,
  instrumental: false,
  bpmValue: null,
  keyValue: null,
  selectedPlaylist: null,
};

function getDefaultState(): FilterState {
  return {
    ...baseDefaultState,
    showEditPointMarkers: getStoredEditPointMarkerVisibility(),
  };
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
    showEditPointMarkers: getStoredEditPointMarkerVisibility(),
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

  // Hydrate from sessionStorage when auth loads or user changes
  useEffect(() => {
    if (!authLoaded) return;

    setHydrated(false);
    setHydratedKey(null);
    sessionStorage.removeItem("filmwave-music-filters");

    if (!storageKey) {
      setFilters(getDefaultState());
      setHydrated(true);
      setHydratedKey(null);
      return;
    }

    const saved = sessionStorage.getItem(storageKey);

    if (!saved) {
      setFilters(getDefaultState());
      setHydrated(true);
      setHydratedKey(storageKey);
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      setFilters(normalizeFilterState(parsed));
    } catch {
      sessionStorage.removeItem(storageKey);
      setFilters(getDefaultState());
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

    setStoredEditPointMarkerVisibility(filters.showEditPointMarkers);
    sessionStorage.setItem(storageKey, JSON.stringify(filters));
  }, [hydrated, hydratedKey, storageKey, filters]);

  return { filters, setFilters, hydrated };
}
