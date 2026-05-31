import {
  MusicFilterTags,
  type MusicFilterTagItem,
} from "@filmwave/shared";
import type {
  DesktopMusicFilterKey,
  DesktopMusicFilterState,
} from "./musicLibraryTypes";
import { FILTER_TITLES } from "./musicLibraryUtils";

function getBpmLabel(filters: DesktopMusicFilterState) {
  const value = filters.bpmValue;
  if (!value) return null;
  return value.mode === "exact" ? `${value.exact}` : `${value.low}–${value.high}`;
}

function getKeyLabel(filters: DesktopMusicFilterState) {
  const value = filters.keyValue;
  if (!value) return null;
  const scale = value.scale === "major" ? "Maj" : value.scale === "minor" ? "Min" : "";
  return [value.note, scale].filter(Boolean).join(" ");
}

export default function DesktopFilterTags({
  filters,
  onRemoveFilter,
  onRemovePlaylist,
  onRemoveBpm,
  onRemoveKey,
  onRemoveDuration,
  onRemoveShuffle,
}: {
  filters: DesktopMusicFilterState;
  onRemoveFilter: (key: DesktopMusicFilterKey, value: string) => void;
  onRemovePlaylist: () => void;
  onRemoveBpm: () => void;
  onRemoveKey: () => void;
  onRemoveDuration: () => void;
  onRemoveShuffle: () => void;
}) {
  const filterKeys = Object.keys(FILTER_TITLES) as DesktopMusicFilterKey[];
  const bpmLabel = getBpmLabel(filters);
  const keyLabel = getKeyLabel(filters);
  const durationLabel = filters.selectedDurations[0] ?? null;
  const tags: MusicFilterTagItem[] = [
    ...(filters.selectedPlaylist
      ? [
          {
            id: `playlist-${filters.selectedPlaylist.id}`,
            label: filters.selectedPlaylist.name,
            onRemove: onRemovePlaylist,
          },
        ]
      : []),
    ...filterKeys.flatMap((key) =>
      filters[key].map((value) => ({
        id: `${key}-${value}`,
        label: value,
        onRemove: () => onRemoveFilter(key, value),
      })),
    ),
    ...(bpmLabel
      ? [{ id: "bpm", label: bpmLabel, onRemove: onRemoveBpm }]
      : []),
    ...(keyLabel
      ? [{ id: "key", label: keyLabel, onRemove: onRemoveKey }]
      : []),
    ...(durationLabel
      ? [{ id: "duration", label: durationLabel, onRemove: onRemoveDuration }]
      : []),
    ...(filters.shuffle
      ? [{ id: "shuffle", label: "Shuffle", onRemove: onRemoveShuffle }]
      : []),
  ];

  return <MusicFilterTags tags={tags} />;
}
