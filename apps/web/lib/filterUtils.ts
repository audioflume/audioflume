import type { BpmFilterValue, KeyFilterValue } from "@/lib/types";

function toSearchableText(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .join(" ")
      .toLowerCase();
  }

  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number") return String(value).toLowerCase();

  return "";
}

function getSongDuration(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && typeof (value as { duration?: unknown }).duration === "number") {
    return (value as { duration: number }).duration;
  }

  return 0;
}

function getSongBpm(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && typeof (value as { bpm?: unknown }).bpm === "number") {
    return (value as { bpm: number }).bpm;
  }

  return 0;
}

export function includesAll(values: unknown, selected: string[]) {
  if (selected.length === 0) return true;

  const text = toSearchableText(values);

  return selected.every((selectedValue) =>
    text.includes(selectedValue.toLowerCase()),
  );
}

export function matchesDurationFilter(
  durationValue: unknown,
  selectedDurations: string[],
) {
  if (selectedDurations.length === 0) return true;

  const duration = getSongDuration(durationValue);

  return selectedDurations.some((selectedDuration) => {
    if (selectedDuration === "< 1:00") return duration < 60;
    if (selectedDuration === "0:00 - 1:00") {
      return duration >= 0 && duration <= 60;
    }
    if (selectedDuration === "1:00 - 2:00") {
      return duration >= 60 && duration <= 120;
    }
    if (selectedDuration === "2:00 - 3:00") {
      return duration >= 120 && duration <= 180;
    }
    if (selectedDuration === "3:00 - 4:00") {
      return duration >= 180 && duration <= 240;
    }
    if (selectedDuration === "4:00+") return duration >= 240;

    const rangeMatch = selectedDuration.match(
      /^(\d+):(\d{2}) - (\d+):(\d{2})$/,
    );

    if (rangeMatch) {
      const [, lowMinutes, lowSeconds, highMinutes, highSeconds] = rangeMatch;
      const low = Number(lowMinutes) * 60 + Number(lowSeconds);
      const high = Number(highMinutes) * 60 + Number(highSeconds);

      return duration >= low && duration <= high;
    }

    const plusMatch = selectedDuration.match(/^(\d+):(\d{2})\+$/);

    if (plusMatch) {
      const [, minutes, seconds] = plusMatch;
      const low = Number(minutes) * 60 + Number(seconds);

      return duration >= low;
    }

    return true;
  });
}

export function matchesBpmFilter(bpmValueOrSong: unknown, bpmValue: BpmFilterValue | null) {
  if (!bpmValue) return true;

  const bpm = getSongBpm(bpmValueOrSong);

  if (bpmValue.mode === "exact") {
    return bpm === bpmValue.exact;
  }

  return bpm >= bpmValue.low && bpm <= bpmValue.high;
}

function normalizeKeyText(value: string) {
  return value.trim().replaceAll("♯", "#").replaceAll("♭", "b").toLowerCase();
}

export function matchesKeyFilter(
  songKeyValue: unknown,
  keyValue: KeyFilterValue | null,
) {
  if (!keyValue?.note) return true;

  const songKey =
    typeof songKeyValue === "string"
      ? songKeyValue
      : typeof songKeyValue === "object" && songKeyValue !== null && typeof (songKeyValue as { key?: unknown }).key === "string"
        ? (songKeyValue as { key: string }).key
        : "";
  const normalizedSongKey = normalizeKeyText(songKey);
  const normalizedNote = normalizeKeyText(keyValue.note);

  const songNote = normalizedSongKey.match(/^([a-g](?:#|b)?)/)?.[1];

  if (songNote !== normalizedNote) return false;

  if (!keyValue.scale) return true;

  const normalizedScale = keyValue.scale.toLowerCase();

  if (normalizedScale === "major") {
    return normalizedSongKey.includes("maj");
  }

  if (normalizedScale === "minor") {
    return normalizedSongKey.includes("min");
  }

  return true;
}
