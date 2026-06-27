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
  collapsible?: boolean;
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
  collapsible = true,
  onChange,
}: CollapsibleSearchPillProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(true);
  const innerRef = useRef<HTMLInputElement>(null);
  const resolvedRef =
    (inputRef as React.RefObject<HTMLInputElement> | null) ?? innerRef;

  const hasValue = value.length > 0;
  const isCollapsed = collapsible && collapsed;

  function handleIconClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!collapsible) return;

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
    if (!collapsible) {
      setBodyVisible(true);
      return;
    }

    if (collapsed) {
      setBodyVisible(false);
    } else {
      const t = setTimeout(() => setBodyVisible(true), 80);
      return () => clearTimeout(t);
    }
  }, [collapsed, collapsible]);

  const iconCircle = (
    <span className="filmwave-search-pill-icon-circle">{searchIcon}</span>
  );

  return (
    <div
      className={`filmwave-search-pill${isCollapsed ? " is-collapsed" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={style}
      onClick={() => !isCollapsed && resolvedRef.current?.focus()}
    >
      {collapsible ? (
        <button
          type="button"
          className="filmwave-search-pill-icon-btn"
          onClick={handleIconClick}
          aria-label={collapsed ? "Expand search" : "Collapse search"}
        >
          {iconCircle}
        </button>
      ) : (
        <span className="filmwave-search-pill-icon-btn" aria-hidden="true">
          {iconCircle}
        </span>
      )}

      <div
        className={`filmwave-search-pill-body${
          bodyVisible && !isCollapsed ? " is-visible" : ""
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
