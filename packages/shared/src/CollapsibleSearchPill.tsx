"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type CollapsibleSearchPillProps = {
  searchIcon: ReactNode;
  playlistSlot?: ReactNode;
  value: string;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
  style?: CSSProperties;
  onChange: (value: string) => void;
};

export function CollapsibleSearchPill({
  searchIcon,
  playlistSlot,
  value,
  placeholder = "Search",
  inputRef,
  className,
  style,
  onChange,
}: CollapsibleSearchPillProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(true);
  const innerRef = useRef<HTMLInputElement>(null);
  const resolvedRef =
    (inputRef as React.RefObject<HTMLInputElement> | null) ?? innerRef;

  const hasValue = value.length > 0;

  function handleIconClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (collapsed) {
      setCollapsed(false);
      setTimeout(() => resolvedRef.current?.focus(), 80);
    } else {
      setCollapsed(true);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    resolvedRef.current?.focus();
  }

  useEffect(() => {
    if (collapsed) {
      setBodyVisible(false);
    } else {
      const t = setTimeout(() => setBodyVisible(true), 80);
      return () => clearTimeout(t);
    }
  }, [collapsed]);

  return (
    <div
      className={`filmwave-search-pill${collapsed ? " is-collapsed" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={style}
      onClick={() => !collapsed && resolvedRef.current?.focus()}
    >
      <button
        type="button"
        className="filmwave-search-pill-icon-btn"
        onClick={handleIconClick}
        aria-label={collapsed ? "Expand search" : "Collapse search"}
      >
        <span className="filmwave-search-pill-icon-circle">{searchIcon}</span>
      </button>

      <div
        className={`filmwave-search-pill-body${
          bodyVisible && !collapsed ? " is-visible" : ""
        }`}
      >
        {hasValue && (
          <>
            <button
              type="button"
              className="filmwave-search-pill-clear"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path
                  d="M2 2L8 8M8 2L2 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="filmwave-search-pill-divider" aria-hidden="true" />
          </>
        )}
        <input
          ref={resolvedRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="filmwave-search-pill-input"
        />
        {playlistSlot && (
          <div
            className="filmwave-search-pill-playlist"
            onClick={(e) => e.stopPropagation()}
          >
            {playlistSlot}
          </div>
        )}
      </div>
    </div>
  );
}
