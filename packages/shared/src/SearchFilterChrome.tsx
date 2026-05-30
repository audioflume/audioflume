"use client";

import type { CSSProperties, ReactNode } from "react";

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
  input: ReactNode;
};

export function SearchFilterInput({ icon, input }: SearchFilterInputProps) {
  return (
    <>
      <span className="filmwave-search-filter-search-icon" aria-hidden="true">
        {icon}
      </span>
      {input}
    </>
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
