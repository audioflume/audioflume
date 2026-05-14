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
  instrumental: boolean;
  bpmValue: BpmFilterValue | null;
  keyValue: KeyFilterValue | null;
  selectedPlaylist: PlaylistRef | null;
};

type UseFilterPersistenceProps = {
  storageKey: string | null;
  authLoaded: boolean;
};

const defaultState: FilterState = {
  search: "",
  selectedMoods: [],
  selectedGenres: [],
  selectedInstruments: [],
  selectedBuilds: [],
  selectedVocals: [],
  selectedDurations: [],
  instrumental: false,
  bpmValue: null,
  keyValue: null,
  selectedPlaylist: null,
};

export function useFilterPersistence({
  storageKey,
  authLoaded,
}: UseFilterPersistenceProps) {
  const [hydrated, setHydrated] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultState);

  // Hydrate from sessionStorage when auth loads or user changes
  useEffect(() => {
    if (!authLoaded) return;

    setHydrated(false);
    setHydratedKey(null);
    sessionStorage.removeItem("filmwave-music-filters");

    if (!storageKey) {
      setFilters(defaultState);
      setHydrated(true);
      setHydratedKey(null);
      return;
    }

    const saved = sessionStorage.getItem(storageKey);

    if (!saved) {
      setFilters(defaultState);
      setHydrated(true);
      setHydratedKey(storageKey);
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      setFilters({
        search: parsed.search ?? "",
        selectedMoods: parsed.selectedMoods ?? [],
        selectedGenres: parsed.selectedGenres ?? [],
        selectedInstruments: parsed.selectedInstruments ?? [],
        selectedBuilds: parsed.selectedBuilds ?? [],
        selectedVocals: parsed.selectedVocals ?? [],
        selectedDurations: parsed.selectedDurations ?? [],
        instrumental: parsed.instrumental ?? false,
        bpmValue: parsed.bpmValue ?? null,
        keyValue: parsed.keyValue ?? null,
        selectedPlaylist: parsed.selectedPlaylist ?? null,
      });
    } catch {
      sessionStorage.removeItem(storageKey);
      setFilters(defaultState);
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
