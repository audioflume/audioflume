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
  selectedRegions: string[];
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
  regions?: unknown;
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

type InitialFilterPersistenceState = {
  filters: MusicFilterState;
  hydrated: boolean;
  hydratedKey: string | null;
};

const MUSIC_HEADER_SEARCH_CHANNEL = "filmwave-music-header-search";
const SIDE_FILTER_SECTION_CLEAR_EVENT = "filmwave:side-filter-section-clear";

const baseDefaultState: MusicFilterState = {
  search: "",
  selectedMoods: [],
  selectedGenres: [],
  selectedRegions: [],
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
    selectedRegions: stringArray(parsed.selectedRegions).length
      ? stringArray(parsed.selectedRegions)
      : stringArray(parsed.regions),
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
    showEditPointMarkers: getStoredEditPointMarkerVisibility(),
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

function getInitialFilterPersistenceState(
  storageKey: string | null,
  authLoaded: boolean,
): InitialFilterPersistenceState {
  if (typeof window === "undefined" || !authLoaded) {
    return {
      filters: { ...baseDefaultState },
      hydrated: false,
      hydratedKey: null,
    };
  }

  sessionStorage.removeItem("filmwave-music-filters");

  if (!storageKey) {
    return {
      filters: getDefaultState(),
      hydrated: true,
      hydratedKey: null,
    };
  }

  const saved = sessionStorage.getItem(storageKey);

  if (!saved) {
    return {
      filters: getDefaultState(),
      hydrated: true,
      hydratedKey: storageKey,
    };
  }

  try {
    return {
      filters: normalizeFilterState(JSON.parse(saved)),
      hydrated: true,
      hydratedKey: storageKey,
    };
  } catch {
    sessionStorage.removeItem(storageKey);

    return {
      filters: getDefaultState(),
      hydrated: true,
      hydratedKey: storageKey,
    };
  }
}

function getEditPointMarkerVisibilityFromEvent(event: Event) {
  const customEvent = event as CustomEvent<{ visible?: boolean }>;

  if (typeof customEvent.detail?.visible === "boolean") {
    return customEvent.detail.visible;
  }

  return getStoredEditPointMarkerVisibility();
}

function getSideFilterClearSectionFromEvent(event: Event) {
  const customEvent = event as CustomEvent<{ sectionId?: string }>;
  return customEvent.detail?.sectionId ?? null;
}

function getHeaderSearchFromChannelMessage(value: unknown) {
  if (typeof value !== "object" || value === null) return null;

  const search = (value as { search?: unknown }).search;
  return typeof search === "string" ? search : "";
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

  const [initialState] = useState(() =>
    getInitialFilterPersistenceState(storageKey, authLoaded),
  );
  const [hydrated, setHydrated] = useState(initialState.hydrated);
  const [hydratedKey, setHydratedKey] = useState<string | null>(
    initialState.hydratedKey,
  );
  const [filters, setFilters] = useState<MusicFilterState>(
    initialState.filters,
  );

  useEffect(() => {
    if (initialState.hydrated) {
      notifyCuePointFilterSelection(initialState.filters.selectedEditPoints);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const handleSideFilterSectionClear = (event: Event) => {
      const sectionId = getSideFilterClearSectionFromEvent(event);

      if (sectionId === "duration") {
        setFilters((current) =>
          current.selectedDurations.length === 0
            ? current
            : { ...current, selectedDurations: [] },
        );
        return;
      }

      if (sectionId === "region") {
        setFilters((current) =>
          current.selectedRegions.length === 0
            ? current
            : { ...current, selectedRegions: [] },
        );
      }
    };

    window.addEventListener(
      SIDE_FILTER_SECTION_CLEAR_EVENT,
      handleSideFilterSectionClear,
    );

    return () => {
      window.removeEventListener(
        SIDE_FILTER_SECTION_CLEAR_EVENT,
        handleSideFilterSectionClear,
      );
    };
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel(MUSIC_HEADER_SEARCH_CHANNEL);

    channel.onmessage = (event) => {
      const nextSearch = getHeaderSearchFromChannelMessage(event.data);
      if (nextSearch === null) return;

      setFilters((current) =>
        current.search === nextSearch ? current : { ...current, search: nextSearch },
      );
    };

    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (hydrated && hydratedKey === storageKey) return;

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
  }, [authLoaded, hydrated, hydratedKey, storageKey]);

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
