import { MUSIC_FILTER_STORAGE_KEY_PREFIX } from "@/lib/constants";

export const CUE_POINT_FILTER_SELECTION_EVENT =
  "filmwave:cue-point-filter-selection";

const CORE_CUE_POINT_TYPES = new Set([
  "first_hit",
  "drop",
  "break",
  "button_ending",
]);

type CuePointFilterSelectionEventDetail = {
  selectedTypes: string[];
};

function getCoreCuePointTypes(selectedTypes: string[]) {
  return selectedTypes.filter((type) => CORE_CUE_POINT_TYPES.has(type));
}

export function getStoredCuePointFilterSelection() {
  if (typeof window === "undefined") return [];

  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);

    if (!key?.startsWith(MUSIC_FILTER_STORAGE_KEY_PREFIX)) continue;

    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(key) || "{}");

      if (Array.isArray(parsed.selectedEditPoints)) {
        return parsed.selectedEditPoints.filter(
          (value: unknown): value is string => typeof value === "string",
        );
      }
    } catch {
      // Ignore malformed storage values.
    }
  }

  return [];
}

export function notifyCuePointFilterSelection(selectedTypes: string[]) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<CuePointFilterSelectionEventDetail>(
      CUE_POINT_FILTER_SELECTION_EVENT,
      {
        detail: { selectedTypes: getCoreCuePointTypes(selectedTypes) },
      },
    ),
  );
}
