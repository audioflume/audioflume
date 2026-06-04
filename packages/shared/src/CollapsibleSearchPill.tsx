"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type CollapsibleSearchPillProps = {
  searchIcon: ReactNode;
  playlistSlot?: ReactNode;
  value: string;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
};

export function CollapsibleSearchPill({
  searchIcon,
  playlistSlot,
  value,
  placeholder = "Search",
  inputRef,
  onChange,
}: CollapsibleSearchPillProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(true);
  const innerRef = useRef<HTMLInputElement>(null);
  const resolvedRef =
    (inputRef as React.RefObject<HTMLInputElement> | null) ?? innerRef;

  function handleIconClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (collapsed) {
      setCollapsed(false);
      setTimeout(() => resolvedRef.current?.focus(), 80);
    } else {
      setCollapsed(true);
    }
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
      className={`filmwave-search-pill${collapsed ? " is-collapsed" : ""}`}
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
