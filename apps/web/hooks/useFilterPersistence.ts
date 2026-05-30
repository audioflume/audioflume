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
import { useEffect, useState } from "react";

export type MusicFilterState = {
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

type LegacyMusicFilterState = Partial<MusicFilterState> & {
  moods?: unknown;
  genres?: unknown;
  instruments?: unknown;
  builds?: unknown;
  vocals?: unknown;
  durations?: unknown;
  editPoints?: unknown;
  bpm?: unknown;
  key?: unknown;
  playlist?: unknown;
};

type UseFilterPersistenceProps = {
  storageKey: string | null;
  authLoaded: boolean;
};

const baseDefaultState: MusicFilterState = {
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

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeFilterState(value: unknown): MusicFilterState {
  const parsed =
    typeof value === "object" && value !== null
      ? (value as LegacyMusicFilterState)
      : {};

  return {
    search: typeof parsed.search === "string" ? parsed.search : "",
    selectedMoods: stringArray(parsed.selectedMoods).length
      ? stringArray(parsed.selectedMoods)
      : stringArray(parsed.moods),
    selectedGenres: stringArray(parsed.selectedGenres).length
      ? stringArray(parsed.selectedGenres)
      : stringArray(parsed.genres),
    selectedInstruments: stringArray(parsed.selectedInstruments).length
      ? stringArray(parsed.selectedInstruments)
      : stringArray(parsed.instruments),
    selectedBuilds: stringArray(parsed.selectedBuilds).length
      ? stringArray(parsed.selectedBuilds)
      : stringArray(parsed.builds),
    selectedVocals: stringArray(parsed.selectedVocals).length
      ? stringArray(parsed.selectedVocals)
      : stringArray(parsed.vocals),
    selectedDurations: stringArray(parsed.selectedDurations).length
      ? stringArray(parsed.selectedDurations)
      : stringArray(parsed.durations),
    selectedEditPoints: stringArray(parsed.selectedEditPoints).length
      ? stringArray(parsed.selectedEditPoints)
      : stringArray(parsed.editPoints),
    showEditPointMarkers:
      typeof parsed.showEditPointMarkers === "boolean"
        ? parsed.showEditPointMarkers
        : getStoredEditPointMarkerVisibility(),
    instrumental:
      typeof parsed.instrumental === "boolean" ? parsed.instrumental : false,
    bpmValue:
      parsed.bpmValue !== undefined
        ? (parsed.bpmValue as BpmFilterValue | null)
        : parsed.bpm !== undefined
          ? (parsed.bpm as BpmFilterValue | null)
          : null,
    keyValue:
      parsed.keyValue !== undefined
        ? (parsed.keyValue as KeyFilterValue | null)
        : parsed.key !== undefined
          ? (parsed.key as KeyFilterValue | null)
          : null,
    selectedPlaylist:
      parsed.selectedPlaylist !== undefined
        ? (parsed.selectedPlaylist as PlaylistRef | null)
        : parsed.playlist !== undefined
          ? (parsed.playlist as PlaylistRef | null)
          : null,
  };
}

function getDefaultState(): MusicFilterState {
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
  const [filters, setFilters] = useState<MusicFilterState>(baseDefaultState);

  useEffect(() => {
    const handleEditPointMarkerVisibility = (event: Event) => {
      const visible = getEditPointMarkerVisibilityFromEvent(event);

      setFilters((current) =>
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

      setFilters(defaultState);
      notifyCuePointFilterSelection(defaultState.selectedEditPoints);
      setHydrated(true);
      setHydratedKey(null);
      return;
    }

    const saved = sessionStorage.getItem(storageKey);

    if (!saved) {
      const defaultState = getDefaultState();

      setFilters(defaultState);
      notifyCuePointFilterSelection(defaultState.selectedEditPoints);
      setHydrated(true);
      setHydratedKey(storageKey);
      return;
    }

    try {
      const normalizedState = normalizeFilterState(JSON.parse(saved));

      setFilters(normalizedState);
      notifyCuePointFilterSelection(normalizedState.selectedEditPoints);
    } catch {
      const defaultState = getDefaultState();

      sessionStorage.removeItem(storageKey);
      setFilters(defaultState);
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

  return { filters, setFilters, hydrated };
}
