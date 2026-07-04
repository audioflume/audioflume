"use client";

import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";

function HeaderSearchClearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.34 4.93 12 10.59l5.66-5.66a1 1 0 1 1 1.41 1.41L13.41 12l5.66 5.66a1 1 0 0 1-1.41 1.41L12 13.41l-5.66 5.66a1 1 0 0 1-1.41-1.41L10.59 12 4.93 6.34a1 1 0 0 1 1.41-1.41Z"
      />
    </svg>
  );
}

export type HeaderSearchBarProps = {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: Ref<HTMLInputElement>;
  searchIcon?: ReactNode;
  className?: string;
  rowClassName?: string;
  formClassName?: string;
  inputClassName?: string;
  style?: CSSProperties;
};

export function HeaderSearchBar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  searchInputRef,
  searchIcon,
  className = "",
  rowClassName = "",
  formClassName = "",
  inputClassName = "",
  style,
}: HeaderSearchBarProps) {
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

  return (
    <div className={`fw-toolbar-header-search-row${rowClassName ? ` ${rowClassName}` : ""}`}>
      <form
        className={`fw-toolbar-header-search-form${formClassName ? ` ${formClassName}` : ""}`}
        onSubmit={(event) => event.preventDefault()}
      >
        <div
          className={`fw-toolbar-search fw-toolbar-search-static${hasSearchValue ? " has-value" : ""}${className ? ` ${className}` : ""}`}
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
            ...style,
          }}
          onClick={focusSearchInput}
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
              marginLeft: 4,
              marginRight: 4,
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
                <span
                  aria-hidden="true"
                  style={{ display: "inline-flex", transform: "scale(1.25)" }}
                >
                  <HeaderSearchClearIcon />
                </span>
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
            className={`fw-toolbar-search-static-input${inputClassName ? ` ${inputClassName}` : ""}`}
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
  );
}
