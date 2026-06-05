import { MusicMultiSelectFilter } from "@filmwave/shared";
import type { DesktopMusicFilterKey } from "./musicLibraryTypes";

export default function DesktopFilterDropdown({
  filterKey,
  label,
  options,
  selected,
  open,
  onOpenChange,
  onToggleOption,
  onClear,
}: {
  filterKey: DesktopMusicFilterKey;
  label: string;
  options: string[];
  selected: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleOption: (value: string) => void;
  onClear?: () => void;
}) {
  return (
    <MusicMultiSelectFilter
      label={label}
      options={options}
      selected={selected}
      open={open}
      onOpenChange={onOpenChange}
      onToggleOption={onToggleOption}
      onClear={onClear}
      width={filterKey === "playlist" ? 300 : 280}
    />
  );
}
