"use client";

import type { ChangeEvent, CSSProperties, ReactNode, Ref } from "react";

type MusicLibraryFrameProps = {
  children: ReactNode;
  className?: string;
};

export function MusicLibraryFrame({ children, className = "" }: MusicLibraryFrameProps) {
  return <section className={`filmwave-music-library-frame${className ? ` ${className}` : ""}`}>{children}</section>;
}

type SearchFilterChromeProps = {
  search: ReactNode;
  tags?: ReactNode;
  filters: ReactNode;
  quickFilters?: ReactNode;
  stickyTop?: CSSProperties["top"];
  className?: string;
  onSearchRowClick?: () => void;
};

export function SearchFilterChrome({
  search,
  tags,
  filters,
  quickFilters,
  stickyTop,
  className = "",
  onSearchRowClick,
}: SearchFilterChromeProps) {
  return (
    <>
      <div
        className={`filmwave-search-filter-sticky${className ? ` ${className}` : ""}`}
        style={stickyTop !== undefined ? { top: stickyTop } : undefined}
      >
        <div className="filmwave-search-filter-search-row" onClick={onSearchRowClick}>
          <div className="filmwave-search-filter-search-shell">{search}</div>
          {tags && <div className="filmwave-search-filter-tags">{tags}</div>}
        </div>

        <div className="filmwave-search-filter-row">{filters}</div>
      </div>

      {quickFilters && <div className="filmwave-search-filter-quick-row">{quickFilters}</div>}
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
    <>
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
    </>
  );
}

export function SearchFilterTagList({ children }: { children: ReactNode }) {
  return <div className="filmwave-search-filter-tag-list">{children}</div>;
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
        ×
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
