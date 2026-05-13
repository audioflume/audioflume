"use client";

import DropdownShell from "@/components/DropdownShell";
import MoreIcon from "@/components/icons/MoreIcon";
import { iconButtonActiveClass, iconButtonClass } from "@/components/uiClasses";
import type { Padding, Strategy } from "@floating-ui/react";

type SongMoreDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToPlaylist: () => void;
  onRemoveFromPlaylist?: () => void;
  dropdownClassName?: string;
  strategy?: Strategy;
  usePortal?: boolean;
  collisionPadding?: Padding;
};

const DEFAULT_COLLISION_PADDING: Padding = {
  top: 163,
  right: 16,
  bottom: 85,
  left: 16,
};

export default function SongMoreDropdown({
  open,
  onOpenChange,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  dropdownClassName = "song-more-dropdown",
  strategy = "absolute",
  usePortal = false,
  collisionPadding = DEFAULT_COLLISION_PADDING,
}: SongMoreDropdownProps) {
  return (
    <>
      <DropdownShell
        open={open}
        onOpenChange={onOpenChange}
        placement="bottom-end"
        strategy={strategy}
        usePortal={usePortal}
        className={dropdownClassName}
        offsetAmount={6}
        flippedOffsetAmount={6}
        collisionPadding={collisionPadding}
        trigger={({ open }) => (
          <button
            type="button"
            className={`${iconButtonClass} ${open ? iconButtonActiveClass : ""}`}
            aria-label="Song options"
            aria-expanded={open}
          >
            <MoreIcon />
          </button>
        )}
      >
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onAddToPlaylist();
          }}
        >
          Add to Playlist
        </button>

        <button type="button" disabled>
          Add to Project
        </button>

        <button type="button" disabled>
          Create New Playlist
        </button>

        <button type="button" disabled>
          Share Song
        </button>

        <button type="button" disabled>
          Download Song
        </button>

        {onRemoveFromPlaylist && (
          <button
            type="button"
            className="danger"
            onClick={() => {
              onOpenChange(false);
              onRemoveFromPlaylist();
            }}
          >
            Remove from Playlist
          </button>
        )}
      </DropdownShell>
    </>
  );
}
