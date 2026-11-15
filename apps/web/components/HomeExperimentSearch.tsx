"use client";

import Link from "next/link";

import GlobalMusicSearch from "@/components/GlobalMusicSearch";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";

export default function HomeExperimentSearch() {
  return (
    <div className="audioflume-experiment-search">
      <div
        className="audioflume-experiment-search-row"
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(".audioflume-experiment-search-field") &&
            !event.target.closest("button")
          ) {
            event.currentTarget.querySelector<HTMLInputElement>(".audioflume-experiment-search-field input")?.focus();
          }
        }}
      >
        <Link className="audioflume-experiment-search-filter" href="/music?filters=open">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" /></svg>
          <span>Filters</span>
        </Link>
        <GlobalMusicSearch fieldClassName="audioflume-experiment-search-field" clearButtonClassName="audioflume-experiment-search-clear" />
        <GlobalReferenceSearch className="audioflume-experiment-search-similar" />
      </div>
    </div>
  );
}
