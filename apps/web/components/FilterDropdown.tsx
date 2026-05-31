"use client";

import { MusicMultiSelectFilter, type MusicMultiSelectFilterSection } from "@filmwave/shared";

type FilterDropdownProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  optionSections?: MusicMultiSelectFilterSection[];
};

export default function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  optionSections,
}: FilterDropdownProps) {
  return (
    <MusicMultiSelectFilter
      label={label}
      options={options}
      selected={selected}
      onChange={onChange}
      optionSections={optionSections}
    />
  );
}
