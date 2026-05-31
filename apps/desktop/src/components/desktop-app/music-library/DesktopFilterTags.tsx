import {
  SearchFilterTag,
  SearchFilterTagList,
} from "@filmwave/shared";
import type {
  DesktopMusicFilterKey,
  DesktopMusicFilterState,
} from "./musicLibraryTypes";
import { FILTER_TITLES } from "./musicLibraryUtils";

export default function DesktopFilterTags({
  filters,
  onRemoveFilter,
  onRemoveShuffle,
}: {
  filters: DesktopMusicFilterState;
  onRemoveFilter: (key: DesktopMusicFilterKey, value: string) => void;
  onRemoveShuffle: () => void;
}) {
  const filterKeys = Object.keys(FILTER_TITLES) as DesktopMusicFilterKey[];

  return (
    <SearchFilterTagList>
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

      {filters.shuffle && (
        <SearchFilterTag onRemove={onRemoveShuffle}>Shuffle</SearchFilterTag>
      )}
    </SearchFilterTagList>
  );
}
