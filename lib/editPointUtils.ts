import type { EditPointMarker, EditPoints, Song } from "@/lib/types";

export type EditPointFilterType =
  | "first_hit"
  | "drop"
  | "break"
  | "button_ending"
  | "fast_intro"
  | "drop_before_60"
  | "clean_button_ending"
  | "break_after_midpoint"
  | "no_long_intro";

export type EditPointFilterOption = {
  type: EditPointFilterType;
  label: string;
  tagLabel: string;
};

export const EDIT_POINT_FILTER_OPTIONS: EditPointFilterOption[] = [
  { type: "first_hit", label: "First Hit", tagLabel: "First Hit" },
  { type: "drop", label: "Main Drop", tagLabel: "Main Drop" },
  { type: "break", label: "Break", tagLabel: "Break" },
  { type: "button_ending", label: "Button Ending", tagLabel: "Button Ending" },
  { type: "fast_intro", label: "Fast Intro", tagLabel: "Fast Intro" },
  { type: "drop_before_60", label: "Drop Before 60s", tagLabel: "Drop Before 60s" },
  { type: "clean_button_ending", label: "Clean Button Ending", tagLabel: "Clean Button Ending" },
  { type: "break_after_midpoint", label: "Break After Midpoint", tagLabel: "Break After Midpoint" },
  { type: "no_long_intro", label: "No Long Intro", tagLabel: "No Long Intro" },
];

const CORE_EDIT_POINT_TYPES = [
  "first_hit",
  "drop",
  "break",
  "button_ending",
] as const;

const EDIT_POINT_ORDER = new Map<string, number>(
  CORE_EDIT_POINT_TYPES.map((type, index) => [type, index]),
);

export function parseEditPoints(value: Song["editPoints"]): EditPoints {
  if (!value) {
    return {
      markers: [],
      ranges: [],
    };
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    return {
      markers: Array.isArray(parsed?.markers) ? parsed.markers : [],
      ranges: Array.isArray(parsed?.ranges) ? parsed.ranges : [],
    };
  } catch {
    return {
      markers: [],
      ranges: [],
    };
  }
}

export function getMarkerType(marker: EditPointMarker) {
  return marker.type || marker.label.toLowerCase().replaceAll(" ", "_");
}

export function getSongEditPointMarkers(song: Song) {
  return (parseEditPoints(song.editPoints).markers || []).filter((marker) => {
    const time = Number(marker.time);
    return Number.isFinite(time) && time >= 0;
  });
}

export function getSongCuePointMarkers(song: Song) {
  return getSongEditPointMarkers(song)
    .filter((marker) => CORE_EDIT_POINT_TYPES.includes(getMarkerType(marker) as typeof CORE_EDIT_POINT_TYPES[number]))
    .sort((a, b) => {
      const aOrder = EDIT_POINT_ORDER.get(getMarkerType(a)) ?? 99;
      const bOrder = EDIT_POINT_ORDER.get(getMarkerType(b)) ?? 99;

      if (aOrder !== bOrder) return aOrder - bOrder;

      return Number(a.time) - Number(b.time);
    });
}

export function songHasEditPointType(song: Song, type: string) {
  return getSongEditPointMarkers(song).some(
    (marker) => getMarkerType(marker) === type,
  );
}

function getMarkerTime(song: Song, type: string) {
  const marker = getSongEditPointMarkers(song).find(
    (item) => getMarkerType(item) === type,
  );

  const time = Number(marker?.time);

  return Number.isFinite(time) ? time : null;
}

export function songMatchesEditPointFilter(song: Song, type: string) {
  if (CORE_EDIT_POINT_TYPES.includes(type as typeof CORE_EDIT_POINT_TYPES[number])) {
    return songHasEditPointType(song, type);
  }

  const firstHit = getMarkerTime(song, "first_hit");
  const drop = getMarkerTime(song, "drop");
  const breakPoint = getMarkerTime(song, "break");
  const buttonEnding = getMarkerTime(song, "button_ending");
  const duration = Number(song.duration);

  if (type === "fast_intro") {
    return firstHit !== null && firstHit <= 20;
  }

  if (type === "drop_before_60") {
    return drop !== null && drop <= 60;
  }

  if (type === "clean_button_ending") {
    if (buttonEnding === null) return false;
    if (!Number.isFinite(duration) || duration <= 0) return true;

    return buttonEnding >= duration - 30;
  }

  if (type === "break_after_midpoint") {
    return (
      breakPoint !== null &&
      Number.isFinite(duration) &&
      duration > 0 &&
      breakPoint >= duration / 2
    );
  }

  if (type === "no_long_intro") {
    return firstHit !== null && firstHit <= 35;
  }

  return songHasEditPointType(song, type);
}

export function songMatchesEditPointFilters(song: Song, selectedTypes: string[]) {
  if (selectedTypes.length === 0) return true;

  return selectedTypes.every((type) => songMatchesEditPointFilter(song, type));
}

export function getEditPointFilterLabel(type: string) {
  return (
    EDIT_POINT_FILTER_OPTIONS.find((option) => option.type === type)?.tagLabel ||
    type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function formatEditPointTime(secondsValue: number) {
  const seconds = Number(secondsValue);

  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
