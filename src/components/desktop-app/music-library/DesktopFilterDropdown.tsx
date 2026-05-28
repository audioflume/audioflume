import { useEffect, useRef } from "react";
import CheckIcon from "../../icons/CheckIcon";
import PlaylistIcon from "../../icons/PlaylistIcon";
import PlusIcon from "../../icons/PlusIcon";
import type { DesktopMusicFilterKey } from "./musicLibraryTypes";

export default function DesktopFilterDropdown({
  filterKey,
  label,
  options,
  selected,
  open,
  onOpenChange,
  onToggleOption,
}: {
  filterKey: DesktopMusicFilterKey;
  label: string;
  options: string[];
  selected: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleOption: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isPlaylistFilter = filterKey === "playlist";
  const hasActive = selected.length > 0;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false);
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onOpenChange]);

  return (
    <div className="desktop-filter-wrap" ref={ref}>
      <button
        type="button"
        className={`desktop-filter-trigger${open || hasActive ? " is-active" : ""}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        {isPlaylistFilter && <PlaylistIcon size={13} className="desktop-filter-trigger-icon" />}
        <span>{label}</span>
        {hasActive && <span className="desktop-filter-count">{selected.length}</span>}
      </button>

      {open && (
        <div
          className={`desktop-filter-menu${isPlaylistFilter ? " is-playlist-menu" : ""}`}
        >
          <div className="desktop-filter-menu-scroll">
            {options.map((option) => {
              const isSelected = selected.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  className={`desktop-filter-option${isSelected ? " is-selected" : ""}${
                    isPlaylistFilter ? " is-playlist-option" : ""
                  }`}
                  onClick={() => onToggleOption(option)}
                >
                  <span className="desktop-filter-option-label">
                    {isPlaylistFilter && (
                      <span
                        className={`desktop-filter-option-icon${
                          isSelected ? " is-selected" : ""
                        }`}
                      >
                        <PlaylistIcon size={13} />
                      </span>
                    )}
                    <span>{option}</span>
                  </span>

                  <span
                    className={`desktop-filter-option-action${
                      isSelected ? " is-selected" : ""
                    }`}
                  >
                    {isSelected ? <CheckIcon size={11} /> : <PlusIcon size={11} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
