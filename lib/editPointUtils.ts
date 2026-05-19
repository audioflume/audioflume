import type { EditPointMarker, EditPoints, Song } from "@/lib/types";

export type EditPointFilterType =
  | "first_hit"
  | "drop"
  | "break"
  | "button_ending";

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
];

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

export function songHasEditPointType(song: Song, type: string) {
  return getSongEditPointMarkers(song).some(
    (marker) => getMarkerType(marker) === type,
  );
}

export function songMatchesEditPointFilters(song: Song, selectedTypes: string[]) {
  if (selectedTypes.length === 0) return true;

  return selectedTypes.every((type) => songHasEditPointType(song, type));
}

export function getEditPointFilterLabel(type: string) {
  return (
    EDIT_POINT_FILTER_OPTIONS.find((option) => option.type === type)?.tagLabel ||
    type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}
