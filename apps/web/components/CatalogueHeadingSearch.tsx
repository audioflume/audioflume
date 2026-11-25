"use client";

import { useEffect, useRef, useState } from "react";
import XIcon from "@/components/icons/XIcon";
import styles from "@/app/artist2/page.module.css";

export default function CatalogueHeadingSearch({ title, description, placeholder, searchLabel, query, onQueryChange }: {
  title: string;
  description: string;
  placeholder: string;
  searchLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  function closeHeadingSearch() {
    onQueryChange("");
    setSearchOpen(false);
  }
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <header className={styles.artist2Intro}>
          <div className={styles.headingSlot}>
          {searchOpen ? (
            <div className={styles.headingSearchWrap}>
              <span className={`${styles.headingSearchMeasure}${query ? ` ${styles.headingSearchMeasureHidden}` : ""}`} aria-hidden="true">
                {placeholder}
              </span>
              <input
                ref={searchRef}
                className={styles.headingSearch}
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    closeHeadingSearch();
                  }
                }}
                aria-label={placeholder}
              />
            </div>
          ) : (
            <h1>{title}</h1>
          )}
          </div>
          <div className={styles.introMeta}>
            <button
              type="button"
              className={styles.searchLink}
              onMouseDown={(event) => { if (searchOpen) event.preventDefault(); }}
              onClick={() => {
                if (searchOpen) closeHeadingSearch();
                else setSearchOpen(true);
              }}
              aria-label={searchOpen ? `Close ${searchLabel.toLowerCase()}` : searchLabel}
            >
              {searchOpen ? (
                <XIcon size={16} strokeWidth={1.4} />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              )}
              <span>Search</span>
            </button>
            <p>{description}</p>
          </div>
        </header>
  );
}
