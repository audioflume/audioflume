"use client";

import DropdownShell from "./DropdownShell";
import type { FilmwaveStem } from "./music";

type SongCardStemsSlotProps = {
  stems: FilmwaveStem[];
  open: boolean;
  inline?: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SongCardStemsSlot({
  stems,
  open,
  onOpenChange,
}: SongCardStemsSlotProps) {
  const hasStems = stems.length > 0;

  if (!hasStems) {
    return <div className="filmwave-song-stems-placeholder" />;
  }

  return (
    <div className="filmwave-song-stems-wrap">
      <DropdownShell
        open={open}
        onOpenChange={onOpenChange}
        placement="bottom-start"
        className="filmwave-song-stems-popover"
        offsetAmount={6}
        flippedOffsetAmount={6}
        collisionPadding={{ top: 72, right: 16, bottom: 88, left: 16 }}
        trigger={({ open }) => (
          <button
            type="button"
            className="filmwave-song-stems-trigger"
            aria-label={open ? "Hide stems" : "Show stems"}
            aria-expanded={open}
          >
            +{stems.length}
          </button>
        )}
      >
        {stems.map((stem) => (
          <a
            key={`${stem.name}-${stem.url}`}
            href={stem.url}
            download
            target="_blank"
            rel="noreferrer"
            onClick={() => onOpenChange(false)}
            className="filmwave-song-stems-link"
          >
            {stem.name}
          </a>
        ))}
      </DropdownShell>
    </div>
  );
}
