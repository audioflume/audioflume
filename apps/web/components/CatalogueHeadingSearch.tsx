"use client";

import styles from "@/app/artist2/page.module.css";

export default function CatalogueHeadingSearch({ title, description, placeholder, searchLabel, query, onQueryChange }: {
  title: string;
  description: string;
  placeholder: string;
  searchLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
}) {
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
              </div>
            </div>
          </div>
          <div className={styles.introMeta}>
            <p>{description}</p>
          </div>
        </header>
  );
}
