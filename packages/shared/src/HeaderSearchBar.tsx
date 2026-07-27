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
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.5 3a7.5 7.5 0 1 0 4.71 13.33l4.13 4.13a1.4 1.4 0 0 0 1.98-1.98l-4.13-4.13A7.5 7.5 0 0 0 10.5 3ZM5.8 10.5a4.7 4.7 0 1 1 9.4 0 4.7 4.7 0 0 1-9.4 0Z"
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
  variant = "header",
}: HeaderSearchBarProps) {
  const internalSearchInputRef = useRef<HTMLInputElement | null>(null);
  const hasSearchValue = searchValue.length > 0;
  const isControlVariant = variant === "control";

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
      className={`fw-toolbar-search fw-toolbar-search-static${hasSearchValue ? " has-value" : ""}${isControlVariant ? " is-control" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      onClick={focusSearchInput}
    >
      <span className="fw-toolbar-search-static-icon" aria-hidden="true">
        {searchIcon ?? <HeaderSearchIcon />}
      </span>

      {!isControlVariant && clearButton && (
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

      {isControlVariant && clearButton}
    </div>
  );

  const variantClassName = isControlVariant ? " is-control" : "";
  const resolvedRowStyle = isControlVariant
    ? ({
        ...rowStyle,
        "--fw-control-search-width": rowStyle?.width ?? "100%",
        "--fw-control-search-flex": rowStyle?.flex ?? "0 1 auto",
      } as CSSProperties)
    : rowStyle;

  return (
    <div
      className={`fw-toolbar-header-search-row${variantClassName}${rowClassName ? ` ${rowClassName}` : ""}`}
      style={resolvedRowStyle}
    >
      {renderForm ? (
        <form
          className={`fw-toolbar-header-search-form${variantClassName}${formClassName ? ` ${formClassName}` : ""}`}
          onSubmit={handleSubmit}
        >
          {searchField}
        </form>
      ) : (
        <div
          className={`fw-toolbar-header-search-form${variantClassName}${formClassName ? ` ${formClassName}` : ""}`}
        >
          {searchField}
        </div>
      )}
    </div>
  );
}
