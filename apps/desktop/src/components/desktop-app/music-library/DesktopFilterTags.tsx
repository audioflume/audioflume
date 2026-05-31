import {
  SearchFilterTag,
  SearchFilterTagList,
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

  return (
    <SearchFilterTagList>
      {filters.selectedPlaylist && (
        <SearchFilterTag onRemove={onRemovePlaylist}>
          {filters.selectedPlaylist.name}
        </SearchFilterTag>
      )}

      {filterKeys.flatMap((key) =>
        filters[key].map((value) => (
          <SearchFilterTag
            key={`${key}-${value}`}
            onRemove={() => onRemoveFilter(key, value)}
          >
            {value}
          </SearchFilterTag>
        )),
      )}

      {bpmLabel && <SearchFilterTag onRemove={onRemoveBpm}>{bpmLabel}</SearchFilterTag>}
      {keyLabel && <SearchFilterTag onRemove={onRemoveKey}>{keyLabel}</SearchFilterTag>}
      {durationLabel && <SearchFilterTag onRemove={onRemoveDuration}>{durationLabel}</SearchFilterTag>}

      {filters.shuffle && (
        <SearchFilterTag onRemove={onRemoveShuffle}>Shuffle</SearchFilterTag>
      )}
    </SearchFilterTagList>
  );
}
