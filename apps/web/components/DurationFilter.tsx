"use client";

import { MusicDurationFilter } from "@filmwave/shared";

type DurationFilterProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

export default function DurationFilter({ selected, onChange }: DurationFilterProps) {
  return <MusicDurationFilter selected={selected} onChange={onChange} />;
}
