import {
  MusicFilterTags,
  type MusicFilterTagItem,
} from "@filmwave/shared";
import type { BpmFilterValue, KeyFilterValue, PlaylistRef } from "@/lib/types";
import { getEditPointFilterLabel } from "@/lib/editPointUtils";
import PlaylistIcon from "@/components/icons/PlaylistIcon";

type FilterTagsProps = {
  selectedMoods: string[];
  selectedGenres: string[];
  selectedInstruments: string[];
  selectedBuilds: string[];
  selectedVocals: string[];
  selectedDurations: string[];
  selectedEditPoints?: string[];
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
  onRemoveEditPoint?: (value: string) => void;
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
  selectedEditPoints = [],
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
  onRemoveEditPoint = () => {},
  onRemoveInstrumental,
  onRemoveBpm,
  onRemoveKey,
  onRemovePlaylist,
  onRemoveShuffle,
}: FilterTagsProps) {
  const tags: MusicFilterTagItem[] = [
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
            icon: <PlaylistIcon size={11} className="shrink-0" />,
            onRemove: onRemovePlaylist,
          },
        ]
      : []),
    ...(shuffleActive
      ? [{ id: "shuffle", label: "Shuffle", onRemove: onRemoveShuffle }]
      : []),
  ];

  return <MusicFilterTags tags={tags} />;
}
