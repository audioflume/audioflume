import { MUSIC_FILTER_STORAGE_KEY_PREFIX } from "@/lib/constants";

export const CUE_POINT_FILTER_SELECTION_EVENT =
  "filmwave:cue-point-filter-selection";

type CuePointFilterSelectionEventDetail = {
  selectedTypes: string[];
};

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
        detail: { selectedTypes },
      },
    ),
  );
}
