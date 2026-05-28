import type {
  DesktopMusicFilterKey,
  DesktopMusicFilterState,
} from "./musicLibraryTypes";
import { FILTER_TITLES } from "./musicLibraryUtils";

export default function DesktopFilterTags({
  filters,
  onRemoveFilter,
  onRemoveMarkers,
  onRemoveShuffle,
}: {
  filters: DesktopMusicFilterState;
  onRemoveFilter: (key: DesktopMusicFilterKey, value: string) => void;
  onRemoveMarkers: () => void;
  onRemoveShuffle: () => void;
}) {
  const filterKeys = Object.keys(FILTER_TITLES) as DesktopMusicFilterKey[];

  return (
    <div className="desktop-music-filter-tags" aria-label="Active filters">
      {filterKeys.flatMap((key) =>
        filters[key].map((value) => (
          <button
            key={`${key}-${value}`}
            className="desktop-tag-chip"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveFilter(key, value);
            }}
          >
            {value}
            <span aria-hidden="true">×</span>
          </button>
        )),
      )}

      {filters.markers && (
        <button
          className="desktop-tag-chip"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemoveMarkers();
          }}
        >
          Markers
          <span aria-hidden="true">×</span>
        </button>
      )}

      {filters.shuffle && (
        <button
          className="desktop-tag-chip"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemoveShuffle();
          }}
        >
          Shuffle
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
