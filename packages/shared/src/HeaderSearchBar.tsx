"use client";

import {
  type CSSProperties,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
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
  searchAriaLabel?: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch?: (value: string) => void;
  searchInputRef?: Ref<HTMLInputElement>;
  searchIcon?: ReactNode;
  className?: string;
  rowClassName?: string;
  formClassName?: string;
  inputClassName?: string;
  style?: CSSProperties;
  renderForm?: boolean;
};

export function HeaderSearchBar({
  searchValue,
  searchPlaceholder,
  searchAriaLabel,
  onSearchChange,
  onSubmitSearch,
  searchInputRef,
  searchIcon,
  className = "",
  rowClassName = "",
  formClassName = "",
  inputClassName = "",
  style,
  renderForm = true,
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

  function submitSearch() {
    onSubmitSearch?.(searchValue.trim());
  }

  function handleSubmit(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch();
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (renderForm || event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    submitSearch();
  }

  const searchField = (
    <div
      className={`fw-toolbar-search fw-toolbar-search-static${hasSearchValue ? " has-value" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      onClick={focusSearchInput}
    >
      <span className="fw-toolbar-search-static-icon" aria-hidden="true">
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
              className="fw-toolbar-search-static-clear-icon"
              aria-hidden="true"
            >
              <HeaderSearchClearIcon />
            </span>
          </button>
          <span
            className="fw-toolbar-search-static-divider"
            aria-hidden="true"
          />
        </>
      )}

      <input
        ref={searchInputRef}
        type="text"
        value={searchValue}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel ?? searchPlaceholder}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={handleInputKeyDown}
        className={`fw-toolbar-search-static-input${inputClassName ? ` ${inputClassName}` : ""}`}
      />
    </div>
  );

  return (
    <div
      className={`fw-toolbar-header-search-row${rowClassName ? ` ${rowClassName}` : ""}`}
    >
      {renderForm ? (
        <form
          className={`fw-toolbar-header-search-form${formClassName ? ` ${formClassName}` : ""}`}
          onSubmit={handleSubmit}
        >
          {searchField}
        </form>
      ) : (
        <div
          className={`fw-toolbar-header-search-form${formClassName ? ` ${formClassName}` : ""}`}
        >
          {searchField}
        </div>
      )}
    </div>
  );
}
