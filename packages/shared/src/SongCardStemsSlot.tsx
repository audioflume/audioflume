"use client";

import { useEffect, useRef } from "react";
import { FilterPopover } from "./FilterPopover";
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
  inline = false,
  onOpenChange,
}: SongCardStemsSlotProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hasStems = stems.length > 0;

  useEffect(() => {
    if (!open || inline) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      onOpenChange(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [inline, open, onOpenChange]);

  if (!hasStems) {
    return <div className="filmwave-song-stems-placeholder" />;
  }

  return (
    <div ref={wrapperRef} className="filmwave-song-stems-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="filmwave-song-stems-trigger"
        aria-label={open ? "Hide stems" : "Show stems"}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
      >
        +{stems.length}
      </button>

      {!inline && (
        <FilterPopover
          open={open}
          triggerRef={triggerRef}
          width={168}
          className="filmwave-song-stems-popover"
        >
          <div className="filmwave-song-stems-menu">
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
          </div>
        </FilterPopover>
      )}
    </div>
  );
}
