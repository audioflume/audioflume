"use client";

export type MusicLibrarySortValue = "recent" | "downloaded";

export const MUSIC_LIBRARY_SORT_OPTIONS: Array<{
  value: MusicLibrarySortValue;
  label: string;
}> = [
  { value: "recent", label: "Most Recent" },
  { value: "downloaded", label: "Most Popular" },
];

export function MusicLibrarySortControl() {
  return <div className="filmwave-music-sort-control" hidden />;
}
