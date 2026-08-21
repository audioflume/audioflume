"use client";

import {
  useRef,
  type CSSProperties,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";

function HeaderSearchIcon() {
  return (
    <svg viewBox="0 0 800 800" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M355.85,6.76C159.32,6.82.05,166.19.11,362.72s159.43,355.8,355.97,355.74c196.49-.06,355.74-159.36,355.74-355.85-.09-196.54-159.43-355.82-355.97-355.85ZM355.85,63.05c165.44,0,299.56,134.12,299.56,299.56s-134.12,299.56-299.56,299.56S56.29,528.05,56.29,362.61c.08-165.41,134.15-299.48,299.56-299.56Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M791.78,745.37l-176.65-176.65c-10.8-11.18-28.62-11.49-39.8-.69-11.18,10.8-11.49,28.62-.69,39.8.23.23.46.47.69.69l176.65,176.56c10.8,11.18,28.62,11.49,39.8.69,11.18-10.8,11.49-28.62.69-39.8-.23-.23-.46-.47-.69-.69v.08Z"
      />
    </svg>
  );
}

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
  clearAriaLabel?: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch?: (value: string) => void;
  searchInputRef?: Ref<HTMLInputElement>;
  searchIcon?: ReactNode;
  className?: string;
  rowClassName?: string;
  formClassName?: string;
  inputClassName?: string;
  style?: CSSProperties;
  rowStyle?: CSSProperties;
  renderForm?: boolean;
  variant?: "header" | "control";
};

export function HeaderSearchBar({
  searchValue,
  searchPlaceholder,
  searchAriaLabel,
  clearAriaLabel = "Clear search",
  onSearchChange,
  onSubmitSearch,
  searchInputRef,
  searchIcon,
  className = "",
  rowClassName = "",
  formClassName = "",
  inputClassName = "",
  style,
  rowStyle,
  renderForm = true,
}: HeaderSearchBarProps) {
  const internalSearchInputRef = useRef<HTMLInputElement | null>(null);
  const hasSearchValue = searchValue.length > 0;

  function assignSearchInputRef(node: HTMLInputElement | null) {
    internalSearchInputRef.current = node;

    if (typeof searchInputRef === "function") {
      searchInputRef(node);
    } else if (searchInputRef && "current" in searchInputRef) {
      searchInputRef.current = node;
    }
  }

  function focusSearchInput() {
    internalSearchInputRef.current?.focus();
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
    if (renderForm || !onSubmitSearch || event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    submitSearch();
  }

  const clearButton = hasSearchValue ? (
    <button
      type="button"
      className="fw-toolbar-search-static-clear"
      onClick={handleSearchClear}
      aria-label={clearAriaLabel}
    >
      <span
        className="fw-toolbar-search-static-clear-icon"
        aria-hidden="true"
      >
        <HeaderSearchClearIcon />
      </span>
    </button>
  ) : null;

  const searchField = (
    <div
      className={`fw-toolbar-search fw-toolbar-search-static${hasSearchValue ? " has-value" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      onClick={focusSearchInput}
    >
      <span className="fw-toolbar-search-static-icon" aria-hidden="true">
        {searchIcon ?? <HeaderSearchIcon />}
      </span>

      {clearButton && (
        <>
          {clearButton}
          <span
            className="fw-toolbar-search-static-divider"
            aria-hidden="true"
          />
        </>
      )}

      <input
        ref={assignSearchInputRef}
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

  const resolvedRowStyle = {
    ...rowStyle,
    "--fw-header-search-row-width": rowStyle?.width ?? "100%",
    "--fw-header-search-row-min-width": rowStyle?.minWidth ?? 0,
    "--fw-header-search-row-flex": rowStyle?.flex ?? "0 1 auto",
  } as CSSProperties;

  return (
    <div
      className={`fw-toolbar-header-search-row${rowClassName ? ` ${rowClassName}` : ""}`}
      style={resolvedRowStyle}
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
