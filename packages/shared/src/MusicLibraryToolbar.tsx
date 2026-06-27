"use client";

import {
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";

function FilterBarsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="3" y="5" width="18" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="6" y="10.9" width="12" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="9.5" y="16.8" width="5" height="2.2" rx="1.1" fill="currentColor" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5.3 8.6a1.3 1.3 0 0 1 1.84-.04L12 13.2l4.86-4.64a1.3 1.3 0 0 1 1.8 1.88l-5.76 5.5a1.3 1.3 0 0 1-1.8 0l-5.76-5.5a1.3 1.3 0 0 1-.04-1.84Z"
      />
    </svg>
  );
}

function ClearXIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.34 4.93 12 10.59l5.66-5.66a1 1 0 1 1 1.41 1.41L13.41 12l5.66 5.66a1 1 0 0 1-1.41 1.41L12 13.41l-5.66 5.66a1 1 0 0 1-1.41-1.41L10.59 12 4.93 6.34a1 1 0 0 1 1.41-1.41Z"
      />
    </svg>
  );
}

export type MusicLibraryToolbarProps = {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: Ref<HTMLInputElement>;
  searchIcon?: ReactNode;
  filterCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onClearFilters?: () => void;
  actions?: ReactNode;
  chips?: ReactNode;
  stickyTop?: CSSProperties["top"];
  renderToolbarChrome?: boolean;
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
  onClearFilters,
  actions,
  chips,
  stickyTop,
  renderToolbarChrome = true,
  className = "",
  children,
}: MusicLibraryToolbarProps) {
  const ignoreNextFilterToggleRef = useRef(false);
  const isStickyHeaderSearch = stickyTop !== undefined;
  const showFilterExtras = !isStickyHeaderSearch;
  const hasSearchValue = searchValue.length > 0;

  function focusSearchInput() {
    if (
      searchInputRef &&
      typeof searchInputRef !== "function" &&
      "current" in searchInputRef
    ) {
      searchInputRef.current?.focus();
    }
  }

  function handleSearchClear(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onSearchChange("");
    window.requestAnimationFrame(focusSearchInput);
  }

  function handleFilterToggleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (
      ignoreNextFilterToggleRef.current ||
      (event.target as HTMLElement).closest(".fw-toolbar-filters-count")
    ) {
      ignoreNextFilterToggleRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onToggleFilters();
  }

  function clearFiltersFromCount(
    event:
      | ReactPointerEvent<HTMLSpanElement>
      | ReactKeyboardEvent<HTMLSpanElement>,
  ) {
    if (!onClearFilters) return;
    ignoreNextFilterToggleRef.current = true;
    event.preventDefault();
    event.stopPropagation();
    onClearFilters();
  }

  function handleFilterCountPointerDown(event: ReactPointerEvent<HTMLSpanElement>) {
    if (event.button !== 0) return;
    clearFiltersFromCount(event);
  }

  function handleFilterCountClick(event: ReactMouseEvent<HTMLSpanElement>) {
    if (!onClearFilters) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleFilterCountKeyDown(event: ReactKeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    clearFiltersFromCount(event);
  }

  return (
    <div
      className={`fw-toolbar-sticky${className ? ` ${className}` : ""}`}
      style={stickyTop !== undefined ? { top: stickyTop } : undefined}
    >
      {isStickyHeaderSearch && (
        <>
          <style>{`
            html.dark body main > section:has(.fw-music-content-column .fw-filter-panel-wrap) > .fw-music-content-column > .fw-toolbar-sticky > .fw-filter-panel-wrap,
            html[data-theme="dark"] body main > section:has(.fw-music-content-column .fw-filter-panel-wrap) > .fw-music-content-column > .fw-toolbar-sticky > .fw-filter-panel-wrap {
              top: calc(var(--filmwave-sidebar-top-offset, var(--filmwave-header-height, 56px)) + var(--filmwave-sidebar-float-inset, 12px)) !important;
              height: calc(100dvh - var(--filmwave-sidebar-top-offset, var(--filmwave-header-height, 56px)) - var(--filmwave-sidebar-bottom-offset, 0px) - (var(--filmwave-sidebar-float-inset, 12px) * 2)) !important;
            }

            html.dark body main > section:has(.fw-music-content-column .fw-filter-panel-wrap) > .fw-music-content-column > .fw-toolbar-sticky > .fw-filter-panel-wrap .fw-filter-rail,
            html[data-theme="dark"] body main > section:has(.fw-music-content-column .fw-filter-panel-wrap) > .fw-music-content-column > .fw-toolbar-sticky > .fw-filter-panel-wrap .fw-filter-rail {
              padding: 10px 8px !important;
            }

            html.dark body main > section:has(.fw-music-content-column .fw-filter-panel-wrap) > .fw-music-content-column > .fw-toolbar-sticky > .fw-filter-panel-wrap .fw-filter-detail,
            html[data-theme="dark"] body main > section:has(.fw-music-content-column .fw-filter-panel-wrap) > .fw-music-content-column > .fw-toolbar-sticky > .fw-filter-panel-wrap .fw-filter-detail {
              padding: 12px !important;
            }
          `}</style>
          <div className="fw-toolbar-header-search-row">
            <form
              className="fw-toolbar-header-search-form"
              onSubmit={(event) => event.preventDefault()}
            >
              <div
                className="fw-toolbar-search fw-toolbar-search-static"
                style={{
                  boxSizing: "border-box",
                  display: "flex",
                  width: "100%",
                  height: 40,
                  minHeight: 40,
                  alignItems: "center",
                  gap: 9,
                  border: 0,
                  background: "transparent",
                  boxShadow: "none",
                  padding: 0,
                  transform: "translateY(5px)",
                }}
              >
                <span
                  className="fw-toolbar-search-static-icon"
                  aria-hidden="true"
                  style={{
                    display: "inline-flex",
                    width: 15,
                    height: 40,
                    flex: "0 0 15px",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-primary)",
                    cursor: "default",
                    lineHeight: 1,
                    pointerEvents: "none",
                  }}
                >
                  {searchIcon}
                </span>
                {hasSearchValue && (
                  <>
                    <button
                      type="button"
                      className="fw-toolbar-search-static-clear"
                      onClick={handleSearchClear}
                      aria-label="Clear search"
                    >
                      <ClearXIcon />
                    </button>
                    <span className="fw-toolbar-search-static-divider" aria-hidden="true" />
                  </>
                )}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  placeholder={searchPlaceholder}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="fw-toolbar-search-static-input"
                  style={{
                    minWidth: 0,
                    height: 40,
                    flex: "1 1 auto",
                    border: 0,
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                    fontSize: 15,
                    fontWeight: 400,
                    lineHeight: "40px",
                    outline: "none",
                    padding: 0,
                  }}
                />
              </div>
            </form>
          </div>
        </>
      )}

      {renderToolbarChrome && (
        <div className="fw-toolbar-float">
          <div className="fw-toolbar">
            <button
              type="button"
              className={`fw-toolbar-filters${isStickyHeaderSearch ? " is-header-row" : ""}${
                filtersOpen ? " is-open" : ""
              }${showFilterExtras && filterCount > 0 ? " is-active" : ""}`}
              aria-expanded={filtersOpen}
              onClick={handleFilterToggleClick}
            >
              <FilterBarsIcon />
              <span className="fw-toolbar-filters-label">Filters</span>

              {showFilterExtras && filterCount > 0 && (
                <span
                  className={`fw-toolbar-filters-count${onClearFilters ? " is-clearable" : ""}`}
                  role={onClearFilters ? "button" : undefined}
                  tabIndex={onClearFilters ? 0 : undefined}
                  aria-label={onClearFilters ? "Clear all filters" : undefined}
                  title={onClearFilters ? "Clear all filters" : undefined}
                  onPointerDown={onClearFilters ? handleFilterCountPointerDown : undefined}
                  onClick={onClearFilters ? handleFilterCountClick : undefined}
                  onKeyDown={onClearFilters ? handleFilterCountKeyDown : undefined}
                >
                  <span className="fw-toolbar-filters-count-num">{filterCount}</span>
                  {onClearFilters && (
                    <span className="fw-toolbar-filters-count-x" aria-hidden="true">
                      <ClearXIcon />
                    </span>
                  )}
                </span>
              )}

              {showFilterExtras && (
                <span
                  className={`fw-toolbar-filters-chevron${filtersOpen ? " is-open" : ""}`}
                >
                  <ChevronDownIcon />
                </span>
              )}
            </button>

            {actions && <div className="fw-toolbar-actions">{actions}</div>}
          </div>

          {chips && <div className="fw-active-chips">{chips}</div>}
        </div>
      )}

      {children}
    </div>
  );
}
