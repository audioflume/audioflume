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

const EDIT_POINT_TYPE_ALIASES: Record<string, EditPointFilterType> = {
  first_hit: "first_hit",
  firsthit: "first_hit",
  first_hit_point: "first_hit",
  hit: "first_hit",
  intro_hit: "first_hit",
  main_drop: "drop",
  drop: "drop",
  primary_drop: "drop",
  peak: "drop",
  impact: "drop",
  break: "break",
  breakdown: "break",
  bridge: "break",
  button_ending: "button_ending",
  button: "button_ending",
  ending: "button_ending",
  end: "button_ending",
  outro: "button_ending",
  fast_intro: "fast_intro",
  drop_before_60: "drop_before_60",
  drop_before_60s: "drop_before_60",
  clean_button_ending: "clean_button_ending",
  break_after_midpoint: "break_after_midpoint",
  no_long_intro: "no_long_intro",
};

function toEditPointKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("/", " ")
    .replaceAll("-", " ")
    .replaceAll(".", "")
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_");
}

function getExplicitNormalizedEditPointType(value: string) {
  const key = toEditPointKey(value);
  const option = EDIT_POINT_FILTER_OPTIONS.find(
    (item) =>
      item.type === key ||
      toEditPointKey(item.label) === key ||
      toEditPointKey(item.tagLabel) === key,
  );

  return option?.type ?? EDIT_POINT_TYPE_ALIASES[key] ?? null;
}

function inferNormalizedEditPointType(value: string) {
  const key = toEditPointKey(value);

  if (!key) return null;
  if (key.includes("first") && key.includes("hit")) return "first_hit";
  if (key.includes("main") && key.includes("drop")) return "drop";
  if (key.includes("drop") || key.includes("impact") || key.includes("peak")) return "drop";
  if (key.includes("break") || key.includes("breakdown") || key.includes("bridge")) return "break";
  if (key.includes("button") || key.includes("ending") || key.includes("outro")) return "button_ending";

  return null;
}

export function normalizeEditPointType(value: string) {
  return getExplicitNormalizedEditPointType(value) ?? inferNormalizedEditPointType(value) ?? toEditPointKey(value);
}

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
  const typeMatch = marker.type
    ? getExplicitNormalizedEditPointType(marker.type) ?? inferNormalizedEditPointType(marker.type)
    : null;

  if (typeMatch) return typeMatch;

  const labelMatch = marker.label
    ? getExplicitNormalizedEditPointType(marker.label) ?? inferNormalizedEditPointType(marker.label)
    : null;

  if (labelMatch) return labelMatch;

  return normalizeEditPointType(marker.type || marker.label || "");
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
  const normalizedType = normalizeEditPointType(type);

  return getSongEditPointMarkers(song).some(
    (marker) => getMarkerType(marker) === normalizedType,
  );
}

function getMarkerTime(song: Song, type: string) {
  const normalizedType = normalizeEditPointType(type);
  const marker = getSongEditPointMarkers(song).find(
    (item) => getMarkerType(item) === normalizedType,
  );

  const time = Number(marker?.time);

  return Number.isFinite(time) ? time : null;
}

export function songMatchesEditPointFilter(song: Song, type: string) {
  const normalizedType = normalizeEditPointType(type);

  if (CORE_EDIT_POINT_TYPES.includes(normalizedType as typeof CORE_EDIT_POINT_TYPES[number])) {
    return songHasEditPointType(song, normalizedType);
  }

  const firstHit = getMarkerTime(song, "first_hit");
  const drop = getMarkerTime(song, "drop");
  const breakPoint = getMarkerTime(song, "break");
  const buttonEnding = getMarkerTime(song, "button_ending");
  const duration = Number(song.duration);

  if (normalizedType === "fast_intro") {
    return firstHit !== null && firstHit <= 20;
  }

  if (normalizedType === "drop_before_60") {
    return drop !== null && drop <= 60;
  }

  if (normalizedType === "clean_button_ending") {
    if (buttonEnding === null) return false;
    if (!Number.isFinite(duration) || duration <= 0) return true;

    return buttonEnding >= duration - 30;
  }

  if (normalizedType === "break_after_midpoint") {
    return (
      breakPoint !== null &&
      Number.isFinite(duration) &&
      duration > 0 &&
      breakPoint >= duration / 2
    );
  }

  if (normalizedType === "no_long_intro") {
    return firstHit !== null && firstHit <= 35;
  }

  return songHasEditPointType(song, normalizedType);
}

export function songMatchesEditPointFilters(song: Song, selectedTypes: string[]) {
  if (selectedTypes.length === 0) return true;

  return selectedTypes.every((type) => songMatchesEditPointFilter(song, type));
}

export function getEditPointFilterLabel(type: string) {
  const normalizedType = normalizeEditPointType(type);

  return (
    EDIT_POINT_FILTER_OPTIONS.find((option) => option.type === normalizedType)?.tagLabel ||
    normalizedType.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function formatEditPointTime(secondsValue: number) {
  const seconds = Number(secondsValue);

  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
