"use client";

import DropdownShell from "@/components/DropdownShell";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import {
  formatEditPointTime,
  getEditPointFilterLabel,
  getMarkerType,
  getSongCuePointMarkers,
} from "@/lib/editPointUtils";
import type { Song } from "@/lib/types";
import type { Padding } from "@floating-ui/react";
import { useMemo, useState } from "react";

type CuePointJumpMenuProps = {
  song: Song;
  playerVisible?: boolean;
  collisionPadding?: Padding;
};

export default function CuePointJumpMenu({
  song,
  playerVisible = false,
  collisionPadding,
}: CuePointJumpMenuProps) {
  const { seekTo, isPlaying } = usePlayer();
  const [open, setOpen] = useState(false);
  const cuePoints = useMemo(() => getSongCuePointMarkers(song), [song]);

  if (cuePoints.length === 0) return null;

  return (
    <DropdownShell
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      offsetAmount={8}
      flippedOffsetAmount={8}
      collisionPadding={
        collisionPadding || {
          top: 163,
          right: 16,
          bottom: playerVisible ? 85 : 13,
          left: 16,
        }
      }
      className="w-[190px] min-w-[190px]"
      trigger={() => (
        <button
          type="button"
          className="flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] px-3 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
          aria-label="Open cue points"
          aria-expanded={open}
        >
          Cue Points
        </button>
      )}
    >
      <div className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Jump to
      </div>

      {cuePoints.map((marker) => {
        const markerType = getMarkerType(marker);
        const label = marker.label || getEditPointFilterLabel(markerType);
        const time = formatEditPointTime(marker.time);
        const progress = song.duration ? marker.time / song.duration : 0;

        return (
          <button
            key={marker.id}
            type="button"
            onClick={() => {
              seekTo(song, Math.max(0, Math.min(1, progress)), isPlaying);
              setOpen(false);
            }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <PlayIconSmall size={11} />
              <span className="truncate">{label}</span>
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {time}
            </span>
          </button>
        );
      })}
    </DropdownShell>
  );
}
