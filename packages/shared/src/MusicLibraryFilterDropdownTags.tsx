"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type ComponentProps,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  MusicFilterPanel as BaseMusicFilterPanel,
  MusicLibraryToolbar as BaseMusicLibraryToolbar,
} from "./MusicLibraryRedesign";

type MusicLibraryToolbarProps = ComponentProps<typeof BaseMusicLibraryToolbar>;
type MusicFilterPanelProps = ComponentProps<typeof BaseMusicFilterPanel>;

const ActiveFilterTagsContext = createContext<ReactNode>(null);
const SHOW_DROPDOWN_ACTIVE_TAGS = false;

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

function getPanelClearAction(children: ReactNode) {
  let onClearAll: (() => void) | undefined;
  let hasActive = false;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    const props = (child as ReactElement<Partial<MusicFilterPanelProps>>).props;
    if (typeof props.onClearAll === "function") onClearAll = props.onClearAll;
    if (props.hasActive) hasActive = true;
  });

  return { hasActive, onClearAll };
}

export function MusicLibraryToolbar({
  chips,
  children,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  searchInputRef,
  searchIcon,
  filterCount,
  filtersOpen,
  onToggleFilters,
  actions,
  stickyTop,
  className = "",
}: MusicLibraryToolbarProps) {
  const { hasActive, onClearAll } = getPanelClearAction(children);
  const canClearFilters = filtersOpen && hasActive && typeof onClearAll === "function";
  const toolbarStyle: CSSProperties | undefined =
    stickyTop !== undefined ? { top: stickyTop } : undefined;

  function handleClearAll(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onClearAll?.();
  }

  return (
    <ActiveFilterTagsContext.Provider value={chips ?? null}>
      <div
        className={`fw-toolbar-sticky${className ? ` ${className}` : ""}`}
        style={toolbarStyle}
      >
        <div className="fw-toolbar-float">
          <div className="fw-toolbar">
            <label className="fw-toolbar-search">
              <span className="fw-toolbar-search-icon" aria-hidden="true">
                {searchIcon}
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

            <div className="fw-toolbar-filter-actions">
              {canClearFilters ? (
                <button
                  type="button"
                  className="fw-toolbar-clear-all"
                  onClick={handleClearAll}
                >
                  Clear all
                </button>
              ) : null}

              <button
                type="button"
                className={`fw-toolbar-filters${filtersOpen ? " is-open is-done" : ""}${filterCount > 0 ? " is-active" : ""}`}
                aria-expanded={filtersOpen}
                onClick={onToggleFilters}
              >
                {filtersOpen ? (
                  <span className="fw-toolbar-filters-label">Done</span>
                ) : (
                  <>
                    <FunnelIcon />
                    <span className="fw-toolbar-filters-label">Filters</span>
                    {filterCount > 0 && (
                      <span className="fw-toolbar-filters-count">
                        <span className="fw-toolbar-filters-count-num">{filterCount}</span>
                      </span>
                    )}
                    <span className="fw-toolbar-filters-chevron">
                      <ChevronDownIcon />
                    </span>
                  </>
                )}
              </button>
            </div>

            {actions && <div className="fw-toolbar-actions">{actions}</div>}
          </div>
        </div>

        {children}
      </div>
    </ActiveFilterTagsContext.Provider>
  );
}

export function MusicFilterPanel(props: MusicFilterPanelProps) {
  const activeFilterTags = useContext(ActiveFilterTagsContext);

  return (
    <div className={`fw-filter-panel-composite${props.open ? " is-open" : ""}`}>
      {SHOW_DROPDOWN_ACTIVE_TAGS && props.open && activeFilterTags ? (
        <div className="fw-filter-panel-active-chips">
          <div className="fw-filter-panel-active-chips-label">Active filters</div>
          <div className="fw-filter-panel-active-chips-list">
            {activeFilterTags}
          </div>
        </div>
      ) : null}
      <BaseMusicFilterPanel {...props} hasActive={false} onClearAll={undefined} />
    </div>
  );
}
