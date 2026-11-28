"use client";

import { useRef } from "react";
import styles from "@/app/artist2/page.module.css";

export default function CatalogueHeadingSearch({ title, description, placeholder, searchLabel, query, onQueryChange }: {
  title: string;
  description: string;
  placeholder: string;
  searchLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  return (
    <header className={styles.artist2Intro}>
          <h1 className="sr-only">{title}</h1>
          <div className={styles.headingSlot}>
            <div className={styles.headingTransition} data-search-open={true}>
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
                    onQueryChange("");
                  }
                }}
                aria-label={searchLabel}
              />
              {query ? (
                <button
                  type="button"
                  className={styles.headingSearchClear}
                  aria-label={`Clear ${searchLabel.toLowerCase()}`}
                  onClick={() => {
                    onQueryChange("");
                    searchRef.current?.focus({ preventScroll: true });
                  }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" aria-hidden="true">
                    <path d="M6 6L18 18M18 6L6 18" />
                  </svg>
                </button>
              ) : null}
              </div>
            </div>
          </div>
          <div className={styles.introMeta}>
            <p>{description}</p>
          </div>
        </header>
  );
}
