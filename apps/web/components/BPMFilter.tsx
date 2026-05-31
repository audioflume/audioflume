"use client";

import { MusicBpmFilter } from "@filmwave/shared";
import type { BpmFilterValue } from "@/lib/types";

type BPMFilterProps = {
  value: BpmFilterValue | null;
  onChange: (value: BpmFilterValue | null) => void;
};

export default function BPMFilter({ value, onChange }: BPMFilterProps) {
  return <MusicBpmFilter value={value} onChange={onChange} />;
}
