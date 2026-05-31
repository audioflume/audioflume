"use client";

import { MusicKeyFilter } from "@filmwave/shared";
import type { KeyFilterValue } from "@/lib/types";

type KeyFilterProps = {
  value: KeyFilterValue | null;
  onChange: (value: KeyFilterValue | null) => void;
};

export default function KeyFilter({ value, onChange }: KeyFilterProps) {
  return <MusicKeyFilter value={value} onChange={onChange} />;
}
