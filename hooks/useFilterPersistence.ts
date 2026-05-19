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
  showEditPointMarkers: true,
  instrumental: false,
  bpmValue: null,
  keyValue: null,
  selectedPlaylist: null,
};

function getInitialMarkerVisibility() {
  if (typeof window === "undefined") return true;

  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);

    if (!key?.startsWith("filmwave-music-filters")) continue;

    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(key) || "{}");

      if (typeof parsed.showEditPointMarkers === "boolean") {
        return parsed.showEditPointMarkers;
      }
    } catch {
      // Ignore malformed storage values.
    }
  }

  return true;
}

function getDefaultState(): FilterState {
  return {
    ...baseDefaultState,
    showEditPointMarkers: getInitialMarkerVisibility(),
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
    showEditPointMarkers:
      typeof parsed.showEditPointMarkers === "boolean"
        ? parsed.showEditPointMarkers
        : true,
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
  const [filters, setFilters] = useState<FilterState>(() => getDefaultState());

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

  // Persist to sessionStorage whenever filters change
  useEffect(() => {
    if (!hydrated) return;
    if (!storageKey) return;
    if (hydratedKey !== storageKey) return;

    sessionStorage.setItem(storageKey, JSON.stringify(filters));
  }, [hydrated, hydratedKey, storageKey, filters]);

  return { filters, setFilters, hydrated };
}
