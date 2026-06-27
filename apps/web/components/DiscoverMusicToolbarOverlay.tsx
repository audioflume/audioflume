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
        .discover-searchbar-visual-shell {
          position: fixed;
          top: var(--filmwave-header-height, 56px);
          right: 0;
          left: 0;
          z-index: var(--filmwave-z-search-filter, 60);
          box-sizing: border-box;
          height: 50px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
          padding: 0 24px;
        }

        .discover-searchbar-visual-form {
          display: flex;
          height: 100%;
          align-items: center;
        }

        .discover-searchbar-visual-pill {
          display: flex;
          width: 100%;
          height: 32px;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: var(--text-primary);
          cursor: text;
        }

        .discover-searchbar-visual-icon {
          display: inline-flex;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
        }

        .discover-searchbar-visual-icon svg {
          display: block;
          width: 13px;
          height: 13px;
        }

        .discover-searchbar-visual-input {
          width: 100%;
          min-width: 0;
          border: 0;
          background: transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 300;
          outline: none;
        }

        .discover-searchbar-visual-input::placeholder {
          color: var(--text-muted);
        }

        main:has(a[href^="/curated-playlists/"]) > section > div {
          padding-top: 76px !important;
        }

        main:has(a[href^="/curated-playlists/"]) section.mt-6.block:has(> form.group) {
          display: none !important;
        }
      `}</style>

      <div className="discover-searchbar-visual-shell">
        <form className="discover-searchbar-visual-form" onSubmit={handleSubmit}>
          <label
            className="discover-searchbar-visual-pill"
            onClick={() => searchInputRef.current?.focus()}
          >
            <span className="discover-searchbar-visual-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by scene, mood, artist, genre, instrument, or title..."
              className="discover-searchbar-visual-input"
            />
          </label>
        </form>
      </div>
    </>
  );
}
