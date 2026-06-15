"use client";

import type { ReactNode } from "react";
import { SearchFilterTag, SearchFilterTagList } from "./SearchFilterChrome";

export type MusicFilterTagItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  onRemove: () => void;
};

export function MusicFilterTags({ tags }: { tags: MusicFilterTagItem[] }) {
  if (tags.length === 0) return null;

  return (
    <SearchFilterTagList>
      {tags.map((tag) => (
        <SearchFilterTag
          key={tag.id}
          tagId={tag.id}
          icon={tag.icon}
          onRemove={tag.onRemove}
        >
          {tag.label}
        </SearchFilterTag>
      ))}
    </SearchFilterTagList>
  );
}
