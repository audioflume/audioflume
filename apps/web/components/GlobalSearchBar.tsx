"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import GlobalMusicSearch from "@/components/GlobalMusicSearch";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";

import styles from "./GlobalSearchBar.module.css";

type GlobalSearchBarProps = {
  trailingContent?: ReactNode;
  position?: "sticky" | "flow";
  layer?: "default" | "high";
};

export default function GlobalSearchBar({
  trailingContent,
  position = "sticky",
  layer = "default",
}: GlobalSearchBarProps) {
  const barClassName = [
    styles.bar,
    position === "flow" ? styles.flow : "",
    layer === "high" ? styles.high : "",
    trailingContent ? styles.withTrailing : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.slot}>
      <div className={barClassName}>
        <Link href="/music?filters=open" className={styles.filters}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" />
          </svg>
          <span>Filters</span>
        </Link>

        <GlobalMusicSearch
          fieldClassName={styles.field}
          clearButtonClassName={styles.clear}
        />

        <div className={styles.actions}>
          <GlobalReferenceSearch className={styles.song} />
          {trailingContent ? (
            <div className={styles.trailing}>{trailingContent}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
