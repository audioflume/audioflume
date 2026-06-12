"use client";

import {
  useEffect,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function DefaultSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.2 16.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FunnelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
      <path
        d="M4 5H20L14 12.5V19L10 17V12.5L4 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClearSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

export type MusicFilterChipGroup = {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
};

type MusicLibraryToolbarProps = {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: Ref<HTMLInputElement>;
  searchIcon?: ReactNode;
  filterCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  actions?: ReactNode;
  chips?: ReactNode;
  stickyTop?: CSSProperties["top"];
  className?: string;
  children?: ReactNode;
};

export function MusicLibraryToolbar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  searchInputRef,
  searchIcon,
  filterCount,
  filtersOpen,
  onToggleFilters,
  actions,
  chips,
  stickyTop,
  className = "",
  children,
}: MusicLibraryToolbarProps) {
  return (
    <div
      className={`fw-toolbar-sticky${className ? ` ${className}` : ""}`}
      style={stickyTop !== undefined ? { top: stickyTop } : undefined}
    >
      <div className="fw-toolbar">
        <label className="fw-toolbar-search">
          <span className="fw-toolbar-search-icon" aria-hidden="true">
            {searchIcon ?? <DefaultSearchIcon />}
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchValue.length > 0 && (
            <button
              type="button"
              className="fw-toolbar-search-clear"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
            >
              <ClearSearchIcon />
            </button>
          )}
        </label>

        <button
          type="button"
          className={`fw-toolbar-filters${filtersOpen ? " is-open" : ""}${filterCount > 0 ? " is-active" : ""}`}
          aria-expanded={filtersOpen}
          onClick={onToggleFilters}
        >
          <FunnelIcon />
          <span className="fw-toolbar-filters-label">Filters</span>
          {filterCount > 0 && (
            <span className="fw-toolbar-filters-count">{filterCount}</span>
          )}
          <span className={`fw-toolbar-filters-chevron${filtersOpen ? " is-open" : ""}`}>
            <ChevronDownIcon />
          </span>
        </button>

        {actions && <div className="fw-toolbar-actions">{actions}</div>}
      </div>

      {children}

      {chips && <div className="fw-active-chips">{chips}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter panel                                                        */
/* ------------------------------------------------------------------ */

type MusicFilterPanelProps = {
  open: boolean;
  groups: MusicFilterChipGroup[];
  advanced?: ReactNode;
  advancedLabel?: string;
  hasActive?: boolean;
  onClearAll?: () => void;
  onClose: () => void;
};

export function MusicFilterPanel({
  open,
  groups,
  advanced,
  advancedLabel = "Playlist, BPM, key & more",
  hasActive = false,
  onClearAll,
  onClose,
}: MusicFilterPanelProps) {
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <div className={`fw-filter-panel-wrap${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="fw-filter-panel-reveal">
        <div className="fw-filter-panel">
          <div className="fw-filter-panel-scroll">
            <div className="fw-filter-panel-grid">
              {groups.map((group) => (
                <section key={group.id} className="fw-filter-group">
                  <h3 className="fw-filter-group-label">
                    {group.label}
                    {group.selected.length > 0 && (
                      <span className="fw-filter-group-count">{group.selected.length}</span>
                    )}
                  </h3>
                  <div className="fw-filter-chip-grid">
                    {group.options.map((option) => {
                      const isSelected = group.selected.includes(option);

                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={isSelected}
                          className={`fw-filter-chip${isSelected ? " is-selected" : ""}`}
                          onClick={() => group.onToggle(option)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {advanced && (
              <div className="fw-filter-advanced">
                <h3 className="fw-filter-group-label">{advancedLabel}</h3>
                <div className="fw-filter-advanced-row">{advanced}</div>
              </div>
            )}
          </div>

          <div className="fw-filter-panel-footer">
            {hasActive && onClearAll ? (
              <button type="button" className="fw-filter-clear-all" onClick={onClearAll}>
                Clear all
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="fw-filter-done" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick chips                                                         */
/* ------------------------------------------------------------------ */

export function MusicQuickChips({ children }: { children: ReactNode }) {
  return <div className="fw-quick-row">{children}</div>;
}

export function MusicQuickChip({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`fw-filter-chip fw-quick-chip${active ? " is-selected" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* List shell                                                          */
/* ------------------------------------------------------------------ */

export function MusicListShell({
  title = "All tracks",
  meta,
  children,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fw-song-list">
      <div className="fw-song-list-head">
        <div className="fw-song-list-title">{title}</div>
        {meta && <div className="fw-song-list-meta">{meta}</div>}
      </div>
      {children}
    </div>
  );
}
