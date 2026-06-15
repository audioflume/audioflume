"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilterPopover } from "./FilterPopover";
import { FilterTrigger } from "./FilterTrigger";

export type MusicPlaylistFilterRef = {
  id: string;
  name: string;
};

type MusicPlaylistFilterProps = {
  selected: MusicPlaylistFilterRef | null;
  playlists: MusicPlaylistFilterRef[];
  loading: boolean;
  loaded: boolean;
  loadError?: string;
  playlistIcon: ReactNode;
  checkIcon: ReactNode;
  plusIcon: ReactNode;
  iconOnly?: boolean;
  onOpen?: () => void;
  onChange: (selected: MusicPlaylistFilterRef | null) => void;
};

/* Chevron matching HeaderChevron exactly — only used in icon-only pill mode */
function PillPlaylistChevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="filmwave-pill-playlist-chevron"
    >
      <path
        d="M7 10L12 15L17 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlaylistFilterSkeleton() {
  return (
    <div className="filmwave-playlist-filter-skeleton">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="filmwave-playlist-filter-skeleton-row">
          <div className="filmwave-playlist-filter-skeleton-icon" />
          <div className="filmwave-playlist-filter-skeleton-text" />
        </div>
      ))}
    </div>
  );
}

export function MusicPlaylistFilter({
  selected,
  playlists,
  loading,
  loaded,
  loadError = "",
  playlistIcon,
  checkIcon,
  plusIcon,
  iconOnly = false,
  onOpen,
  onChange,
}: MusicPlaylistFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) onOpen?.();
  }, [open, onOpen]);

  function toggle(playlist: MusicPlaylistFilterRef) {
    onChange(selected?.id === playlist.id ? null : playlist);
  }

  function clear() {
    onChange(null);
  }

  const hasActive = selected !== null;
  const showSkeleton = loading || !loaded;

  return (
    <div ref={ref} className="filmwave-filter-popover-wrap">
      {iconOnly ? (
        /* Icon-only pill mode: custom button with header-matched chevron */
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`filmwave-filter-trigger filmwave-pill-playlist-trigger${hasActive ? " is-active" : ""}${open ? " is-open" : ""}`}
          aria-expanded={open}
        >
          <span className="filmwave-filter-trigger-icon">{playlistIcon}</span>
          <PillPlaylistChevron />
        </button>
      ) : (
        <FilterTrigger
          buttonRef={triggerRef}
          label="Playlists"
          icon={playlistIcon}
          active={hasActive}
          open={open}
          count={hasActive ? 1 : 0}
          showActiveDot={false}
          onClick={() => setOpen((current) => !current)}
          onClear={hasActive ? clear : undefined}
        />
      )}
      <FilterPopover open={open} triggerRef={triggerRef} width={300} className="filmwave-filter-panel">
        <div className="filmwave-filter-dropdown-header">
          <div className="filmwave-filter-dropdown-title">Playlists</div>
          {hasActive && <button type="button" onClick={clear} className="filmwave-filter-clear-button">Clear</button>}
        </div>
        {showSkeleton ? (
          <div className="filmwave-filter-menu-pad"><PlaylistFilterSkeleton /></div>
        ) : loadError ? (
          <div className="filmwave-filter-menu-pad">
            <div className="filmwave-filter-message">
              <div className="filmwave-filter-message-title is-danger">Unable to load playlists</div>
              <div className="filmwave-filter-message-detail">{loadError}</div>
            </div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="filmwave-filter-menu-pad">
            <div className="filmwave-filter-message">
              <div className="filmwave-filter-message-title">No playlists found</div>
              <div className="filmwave-filter-message-detail">Create a playlist first, then use this filter to narrow your library.</div>
            </div>
          </div>
        ) : (
          <div className="filmwave-playlist-filter-scroll">
            {playlists.map((playlist) => {
              const isSelected = selected?.id === playlist.id;
              return (
                <button key={playlist.id} type="button" onClick={() => toggle(playlist)} className={`filmwave-filter-row-button filmwave-playlist-filter-row${isSelected ? " is-active" : ""}`}>
                  <span className="filmwave-filter-row-label">
                    <span className={`filmwave-filter-row-icon${isSelected ? " is-active" : ""}`}>{playlistIcon}</span>
                    <span className="filmwave-filter-row-text">{playlist.name}</span>
                  </span>
                  <span className={`filmwave-filter-row-action${isSelected ? " is-active" : ""}`}>{isSelected ? checkIcon : plusIcon}</span>
                </button>
              );
            })}
          </div>
        )}
      </FilterPopover>
    </div>
  );
}
