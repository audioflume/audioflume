"use client";

import { ShuffleIconSmall } from "./ShuffleIconSmall";

export function MusicShuffleButton({
  active,
  className = "",
  onClick,
}: {
  active: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`filmwave-music-shuffle-button${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label="Shuffle songs"
      aria-pressed={active}
    >
      <ShuffleIconSmall size={14} />
    </button>
  );
}
