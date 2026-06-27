"use client";

import { FormEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SearchIcon from "@/components/icons/SearchIcon";

export default function DiscoverMusicToolbarOverlay() {
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");

  if (pathname !== "/discover") return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <>
      <style>{`
        .discover-music-mock-toolbar {
          position: fixed;
          top: var(--filmwave-header-height, 56px);
          right: 0;
          left: 0;
          z-index: var(--filmwave-z-search-filter, 60);
          display: grid;
          grid-template-columns: calc(var(--filmwave-side-filter-rail-width, 168px) + 1px) minmax(0, 1fr);
          align-items: stretch;
          box-sizing: border-box;
          width: auto;
          height: 50px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
          padding: 0;
        }

        .discover-music-mock-toolbar > .fw-toolbar-float {
          grid-column: 1;
          grid-row: 1;
          display: flex;
          width: 100%;
          min-width: 0;
          height: 100%;
          min-height: 0;
          border: 0;
          border-right: 1px solid var(--border);
          border-radius: 0;
          background: transparent;
          padding: 0;
          box-shadow: none;
        }

        .discover-music-mock-toolbar .fw-toolbar {
          display: flex;
          width: 100%;
          height: 100%;
          min-height: 0;
          align-items: center;
        }

        .discover-music-mock-toolbar .fw-toolbar-filters {
          display: inline-flex;
          width: 100%;
          height: 100%;
          min-height: 0;
          max-height: none;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0 30px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          font-weight: 400;
          line-height: 1;
          pointer-events: none;
          white-space: nowrap;
        }

        .discover-music-mock-filter-icon {
          display: inline-flex;
          width: 14px;
          height: 14px;
          flex: 0 0 14px;
          align-items: center;
          justify-content: center;
          color: currentColor;
          font-size: 13px;
          line-height: 1;
        }

        .discover-music-mock-search-row {
          grid-column: 2;
          grid-row: 1;
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          border-left: 0;
          padding: 0 24px 0 20px;
        }

        .discover-music-mock-search-label {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: var(--text-primary);
          cursor: text;
        }

        .discover-music-mock-search-icon {
          display: inline-flex;
          width: 16px;
          height: 100%;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
        }

        .discover-music-mock-search-icon svg {
          display: block;
          width: 13px;
          height: 13px;
        }

        .discover-music-mock-search-input {
          width: 100%;
          min-width: 0;
          border: 0;
          background: transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          font-weight: 300;
          outline: none;
        }

        .discover-music-mock-search-input::placeholder {
          color: var(--text-muted);
        }

        main:has(a[href^="/curated-playlists/"]) > section > div {
          padding-top: 76px !important;
        }

        main:has(a[href^="/curated-playlists/"]) section.mt-6.block:has(> form.group) {
          display: none !important;
        }
      `}</style>

      <form className="discover-music-mock-toolbar" onSubmit={handleSubmit}>
        <div className="fw-toolbar-float">
          <div className="fw-toolbar">
            <div className="fw-toolbar-filters" aria-hidden="true">
              <span className="discover-music-mock-filter-icon">≡</span>
              <span className="fw-toolbar-filters-label">Filters</span>
            </div>
          </div>
        </div>

        <div className="discover-music-mock-search-row">
          <label
            className="discover-music-mock-search-label"
            onClick={() => searchInputRef.current?.focus()}
          >
            <span className="discover-music-mock-search-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by scene, mood, artist, genre, instrument, or title..."
              className="discover-music-mock-search-input"
            />
          </label>
        </div>
      </form>
    </>
  );
}
