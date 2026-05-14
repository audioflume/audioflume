import type { BpmFilterValue, KeyFilterValue, PlaylistRef } from "@/lib/types";

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
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M5 7H19"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M5 12H15"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M5 17H11"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
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
