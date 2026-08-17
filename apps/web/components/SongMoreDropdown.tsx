"use client";

import DropdownShell from "@/components/DropdownShell";
import MoreIcon from "@/components/icons/MoreIcon";
import type { Padding, Strategy } from "@floating-ui/react";

type SongMoreDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToPlaylist: () => void;
  onAddToProject: () => void;
  onShortenTrack: () => void;
  onCreatePlaylist: () => void;
  onRemoveFromPlaylist?: () => void;
  onRemoveFromProject?: () => void;
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
  onAddToProject,
  onShortenTrack,
  onCreatePlaylist,
  onRemoveFromPlaylist,
  onRemoveFromProject,
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
            className={`relative -left-[6px] inline-flex h-7 w-6 min-w-6 flex-shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors ${
              open
                ? "text-[var(--text-primary)]"
                : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
            }`}
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

        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onAddToProject();
          }}
        >
          Add to Project
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onShortenTrack();
          }}
        >
          Shorten Track
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onCreatePlaylist();
          }}
        >
          Create New Playlist
        </button>

        <button type="button" disabled>
          Download Song
        </button>

        {onRemoveFromPlaylist && (
          <button
            type="button"
            className="danger-hover"
            onClick={() => {
              onOpenChange(false);
              onRemoveFromPlaylist();
            }}
          >
            Remove from Playlist
          </button>
        )}

        {onRemoveFromProject && (
          <button
            type="button"
            className="danger-hover"
            onClick={() => {
              onOpenChange(false);
              onRemoveFromProject();
            }}
          >
            Remove from Project
          </button>
        )}
      </DropdownShell>
    </>
  );
}
