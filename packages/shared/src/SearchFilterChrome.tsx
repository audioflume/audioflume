"use client";

import {
  useEffect,
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

type MusicLibraryFrameProps = {
  children: ReactNode;
  className?: string;
};

function formatSearchPlaylistName(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  return trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1);
}

export function getMusicLibrarySearchPlaceholder(playlistName?: string | null) {
  const formattedPlaylistName = playlistName
    ? formatSearchPlaylistName(playlistName)
    : "";

  return formattedPlaylistName
    ? `Search "${formattedPlaylistName}"`
    : "Search Music Library";
}

export function MusicLibraryFrame({ children, className = "" }: MusicLibraryFrameProps) {
  return <section className={`filmwave-music-library-frame${className ? ` ${className}` : ""}`}>{children}</section>;
}

type SearchFilterChromeProps = {
  search: ReactNode;
  tags?: ReactNode;
  filters: ReactNode;
  clearAll?: ReactNode;
  quickFilters?: ReactNode;
  quickActions?: ReactNode;
  stickyTop?: CSSProperties["top"];
  className?: string;
  onSearchRowClick?: () => void;
};

export function SearchFilterChrome({
  search,
  tags,
  filters,
  clearAll,
  quickFilters,
  quickActions,
  stickyTop,
  className = "",
  onSearchRowClick,
}: SearchFilterChromeProps) {
  const combinedRowRef = useRef<HTMLDivElement | null>(null);
  const hadClearAllRef = useRef(Boolean(clearAll));

  function resetCombinedRowScroll() {
    const row = combinedRowRef.current;
    if (!row) return;

    row.scrollLeft = 0;
    row.scrollTo({ left: 0, behavior: "auto" });

    window.requestAnimationFrame(() => {
      row.scrollLeft = 0;
      row.scrollTo({ left: 0, behavior: "auto" });
    });

    window.setTimeout(() => {
      row.scrollLeft = 0;
      row.scrollTo({ left: 0, behavior: "auto" });
    }, 0);
  }

  useEffect(() => {
    const hadClearAll = hadClearAllRef.current;
    const hasClearAll = Boolean(clearAll);

    if (hadClearAll && !hasClearAll) {
      resetCombinedRowScroll();
    }

    hadClearAllRef.current = hasClearAll;
  }, [clearAll]);

  return (
    <>
      <div
        className={`filmwave-search-filter-sticky${className ? ` ${className}` : ""}`}
        style={stickyTop !== undefined ? { top: stickyTop } : undefined}
      >
        <div ref={combinedRowRef} className="filmwave-search-filter-combined-row">
          <div
            className="filmwave-search-filter-pill-slot"
            onClick={onSearchRowClick}
          >
            {search}
          </div>
          {filters}
          {clearAll && (
            <div className="filmwave-search-filter-clear-all-slot">
              {clearAll}
            </div>
          )}
        </div>
      </div>

      {(quickFilters || quickActions) && (
        <div className="filmwave-search-filter-quick-row">
          {quickFilters && <div className="filmwave-search-filter-quick-list">{quickFilters}</div>}
          {quickActions && <div className="filmwave-search-filter-quick-actions">{quickActions}</div>}
        </div>
      )}
    </>
  );
}

type SearchFilterInputProps = {
  icon: ReactNode;
  input?: ReactNode;
  value?: string;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function SearchFilterInput({
  icon,
  input,
  value,
  placeholder,
  inputRef,
  onChange,
}: SearchFilterInputProps) {
  return (
    <div className="filmwave-search-filter-search-shell">
      <span className="filmwave-search-filter-search-icon" aria-hidden="true">
        {icon}
      </span>
      {input ?? (
        <input
          ref={inputRef}
          type="text"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={onChange}
        />
      )}
    </div>
  );
}

export function SearchFilterTagList({ children }: { children: ReactNode }) {
  return <div className="filmwave-search-filter-tag-list">{children}</div>;
}

function SearchFilterTagRemoveIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="filmwave-search-filter-tag-remove-icon"
    >
      <path
        d="M3.25 3.25L8.75 8.75M8.75 3.25L3.25 8.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchFilterTag({
  children,
  icon,
  onRemove,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onRemove: () => void;
}) {
  return (
    <span
      className="filmwave-search-filter-tag"
      onClick={(event) => event.stopPropagation()}
    >
      {icon && <span className="filmwave-search-filter-tag-icon">{icon}</span>}
      <span>{children}</span>
      <button
        type="button"
        className="filmwave-search-filter-tag-remove"
        onClick={onRemove}
        aria-label={`Remove ${typeof children === "string" ? children : "filter"}`}
      >
        <SearchFilterTagRemoveIcon />
      </button>
    </span>
  );
}

export function SearchFilterQuickButton({
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
      onClick={onClick}
      className={`filmwave-search-filter-quick-button${active ? " is-active" : ""}`}
    >
      {children}
    </button>
  );
}
