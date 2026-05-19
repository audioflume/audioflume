import type { BpmFilterValue, KeyFilterValue, PlaylistRef } from "@/lib/types";
import { getEditPointFilterLabel } from "@/lib/editPointUtils";
import PlaylistIcon from "@/components/icons/PlaylistIcon";

type FilterTag = {
  id: string;
  label: string;
  onRemove: () => void;
  type?: "playlist";
};

type FilterTagsProps = {
  selectedMoods: string[];
  selectedGenres: string[];
  selectedInstruments: string[];
  selectedBuilds: string[];
  selectedVocals: string[];
  selectedDurations: string[];
  selectedEditPoints: string[];
  instrumental: boolean;
  bpmValue: BpmFilterValue | null;
  keyValue: KeyFilterValue | null;
  selectedPlaylist: PlaylistRef | null;
  shuffleActive: boolean;
  onRemoveMood: (value: string) => void;
  onRemoveGenre: (value: string) => void;
  onRemoveInstrument: (value: string) => void;
  onRemoveBuild: (value: string) => void;
  onRemoveVocal: (value: string) => void;
  onRemoveDuration: (value: string) => void;
  onRemoveEditPoint: (value: string) => void;
  onRemoveInstrumental: () => void;
  onRemoveBpm: () => void;
  onRemoveKey: () => void;
  onRemovePlaylist: () => void;
  onRemoveShuffle: () => void;
};

export default function FilterTags({
  selectedMoods,
  selectedGenres,
  selectedInstruments,
  selectedBuilds,
  selectedVocals,
  selectedDurations,
  selectedEditPoints,
  instrumental,
  bpmValue,
  keyValue,
  selectedPlaylist,
  shuffleActive,
  onRemoveMood,
  onRemoveGenre,
  onRemoveInstrument,
  onRemoveBuild,
  onRemoveVocal,
  onRemoveDuration,
  onRemoveEditPoint,
  onRemoveInstrumental,
  onRemoveBpm,
  onRemoveKey,
  onRemovePlaylist,
  onRemoveShuffle,
}: FilterTagsProps) {
  const tags: FilterTag[] = [
    ...selectedMoods.map((value) => ({
      id: `mood-${value}`,
      label: value,
      onRemove: () => onRemoveMood(value),
    })),
    ...selectedGenres.map((value) => ({
      id: `genre-${value}`,
      label: value,
      onRemove: () => onRemoveGenre(value),
    })),
    ...selectedInstruments.map((value) => ({
      id: `instrument-${value}`,
      label: value,
      onRemove: () => onRemoveInstrument(value),
    })),
    ...selectedBuilds.map((value) => ({
      id: `build-${value}`,
      label: value,
      onRemove: () => onRemoveBuild(value),
    })),
    ...selectedVocals.map((value) => ({
      id: `vocals-${value}`,
      label: value,
      onRemove: () => onRemoveVocal(value),
    })),
    ...selectedDurations.map((value) => ({
      id: `duration-${value}`,
      label: value,
      onRemove: () => onRemoveDuration(value),
    })),
    ...selectedEditPoints.map((value) => ({
      id: `edit-point-${value}`,
      label: getEditPointFilterLabel(value),
      onRemove: () => onRemoveEditPoint(value),
    })),
    ...(instrumental
      ? [
          {
            id: "instrumental",
            label: "Instrumental",
            onRemove: onRemoveInstrumental,
          },
        ]
      : []),
    ...(bpmValue
      ? [
          {
            id: "bpm",
            label:
              bpmValue.mode === "exact"
                ? `${bpmValue.exact} BPM`
                : `${bpmValue.low}–${bpmValue.high} BPM`,
            onRemove: onRemoveBpm,
          },
        ]
      : []),
    ...(keyValue
      ? [
          {
            id: "key",
            label: [
              keyValue.note,
              keyValue.scale
                ? keyValue.scale.charAt(0).toUpperCase() +
                  keyValue.scale.slice(1)
                : "",
            ]
              .filter(Boolean)
              .join(" "),
            onRemove: onRemoveKey,
          },
        ]
      : []),
    ...(selectedPlaylist
      ? [
          {
            id: `playlist-${selectedPlaylist.id}`,
            label: selectedPlaylist.name,
            type: "playlist" as const,
            onRemove: onRemovePlaylist,
          },
        ]
      : []),
    ...(shuffleActive
      ? [{ id: "shuffle", label: "Shuffle", onRemove: onRemoveShuffle }]
      : []),
  ];

  if (tags.length === 0) return null;

  return (
    <div className="relative z-10 flex flex-1 pointer-events-none flex-wrap items-center justify-end gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="pointer-events-auto flex cursor-default items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-black"
          style={{ backgroundColor: "var(--accent)" }}
          onClick={(event) => event.stopPropagation()}
        >
          {tag.type === "playlist" && (
            <PlaylistIcon size={11} className="shrink-0" />
          )}

          {tag.label}

          <button
            type="button"
            onClick={tag.onRemove}
            className="flex cursor-pointer items-center text-sm leading-none transition-opacity hover:opacity-60"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
