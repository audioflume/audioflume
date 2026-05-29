import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CheckIcon from "../../icons/CheckIcon";
import PlaylistIcon from "../../icons/PlaylistIcon";
import PlusIcon from "../../icons/PlusIcon";
import type { DesktopMusicFilterKey } from "./musicLibraryTypes";

const DROPDOWN_EDGE_PADDING = 12;
const DROPDOWN_TOP_OFFSET = 8;
const DEFAULT_DROPDOWN_WIDTH = 280;
const PLAYLIST_DROPDOWN_WIDTH = 300;

type DropdownPosition = {
  left: number;
  top: number;
  width: number;
};

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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const isPlaylistFilter = filterKey === "playlist";
  const hasActive = selected.length > 0;
  const dropdownWidth = isPlaylistFilter ? PLAYLIST_DROPDOWN_WIDTH : DEFAULT_DROPDOWN_WIDTH;

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = ref.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const maxWidth = Math.max(180, window.innerWidth - DROPDOWN_EDGE_PADDING * 2);
      const width = Math.min(dropdownWidth, maxWidth);
      const preferredLeft = rect.left;
      const maxLeft = window.innerWidth - width - DROPDOWN_EDGE_PADDING;
      const left = Math.max(DROPDOWN_EDGE_PADDING, Math.min(preferredLeft, maxLeft));
      const top = rect.bottom + DROPDOWN_TOP_OFFSET;

      setDropdownPosition({ left, top, width });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [dropdownWidth, open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const triggerContainsTarget = ref.current?.contains(target);
      const menuContainsTarget = menuRef.current?.contains(target);

      if (!triggerContainsTarget && !menuContainsTarget) onOpenChange(false);
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

  const dropdownMenu = open && dropdownPosition
    ? createPortal(
        <div
          ref={menuRef}
          className={`desktop-filter-menu desktop-filter-menu-fixed${isPlaylistFilter ? " is-playlist-menu" : ""}`}
          style={{
            left: `${dropdownPosition.left}px`,
            top: `${dropdownPosition.top}px`,
            width: `${dropdownPosition.width}px`,
          }}
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
        </div>,
        document.body,
      )
    : null;

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

      {dropdownMenu}
    </div>
  );
}
