"use client";

import {
  GENRE_OPTIONS,
  MOOD_OPTIONS,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
  REGION_OPTIONS,
} from "@filmwave/shared";
import { useAuth } from "@clerk/nextjs";
import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";

type DiscoverCuratedHeroCopyProps = {
  showIntroCopy?: boolean;
};

type DiscoverFilterKey = "mood" | "genre" | "region";
type DiscoverFilterSelections = Record<DiscoverFilterKey, string[]>;

const DISCOVER_FILTER_GROUPS = [
  { id: "mood", label: "Scene Mood", options: MOOD_OPTIONS },
  { id: "genre", label: "Genre", options: GENRE_OPTIONS },
  { id: "region", label: "Region", options: REGION_OPTIONS },
] satisfies readonly {
  id: DiscoverFilterKey;
  label: string;
  options: readonly string[];
}[];

const EMPTY_DISCOVER_FILTERS: DiscoverFilterSelections = {
  mood: [],
  genre: [],
  region: [],
};

function readStoredFilters(storageKey: string) {
  try {
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export default function DiscoverCuratedHeroCopy({
  showIntroCopy = true,
}: DiscoverCuratedHeroCopyProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const filterAreaRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<DiscoverFilterKey | null>(null);
  const [selectedFilters, setSelectedFilters] =
    useState<DiscoverFilterSelections>(EMPTY_DISCOVER_FILTERS);

  useEffect(() => {
    if (!activeFilter) return;

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (filterAreaRef.current?.contains(event.target)) return;
      setActiveFilter(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveFilter(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFilter]);

  function persistDiscoverFilters(cleanSearch: string) {
    if (!userId) return;

    const storageKey = `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${userId}`;
    const storedFilters = readStoredFilters(storageKey);

    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        ...storedFilters,
        search: cleanSearch,
        selectedMoods: selectedFilters.mood,
        selectedGenres: selectedFilters.genre,
        selectedRegions: selectedFilters.region,
      }),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSearch = search.trim();

    if (!showIntroCopy) {
      persistDiscoverFilters(cleanSearch);
      setActiveFilter(null);
    }

    router.push(
      cleanSearch
        ? `/music?search=${encodeURIComponent(cleanSearch)}`
        : "/music",
    );
  }

  function toggleFilterOption(filter: DiscoverFilterKey, option: string) {
    setSelectedFilters((current) => {
      const currentValues = current[filter];
      const nextValues = currentValues.includes(option)
        ? currentValues.filter((value) => value !== option)
        : [...currentValues, option];

      return {
        ...current,
        [filter]: nextValues,
      };
    });
  }

  return (
    <section className="discover-integrated-hero" aria-label="Discover music">
      {showIntroCopy ? (
        <>
          <div
            className="curated-video-hero discover-curated-hero-copy-shell"
            hidden
          >
            <div className="curated-video-hero-content discover-curated-hero-copy">
              <h1>Made for Film</h1>

              <p className="curated-video-hero-primary-copy">
                <span>Discover curated music playlists</span>
                <span>Premium audio soundtracks</span>
                <span>For film</span>
              </p>

              <div className="curated-video-hero-secondary-copy">
                <strong>(Tailored Sound)</strong>
                <span>
                  Discover curated music playlists, premium audio
                  <br />
                  soundtracks for film
                </span>
              </div>
            </div>
          </div>

          <style>{`
            .discover-home-search {
              display: grid;
              width: min(calc(100% - 80px), 800px);
              height: 68px;
              grid-template-columns: minmax(0, 1fr) 58px;
              align-items: center;
              margin-top: clamp(38px, 3.5vw, 52px);
              border: 0;
              border-radius: 28px;
              background: #fff;
              box-shadow: 0 18px 42px rgba(0, 0, 0, 0.18);
              pointer-events: auto;
            }

            .discover-home-search input {
              width: 100%;
              min-width: 0;
              height: 100%;
              border: 0;
              outline: 0;
              background: transparent;
              color: #111;
              padding: 0 12px 0 30px;
              font-family: var(--font-aktiv-grotesk), sans-serif;
              font-size: clamp(14px, 0.9vw, 17px);
              font-weight: 400;
            }

            .discover-home-search input::placeholder {
              color: rgba(17, 17, 17, 0.55);
              opacity: 1;
            }

            .discover-home-search button {
              display: inline-flex;
              width: 40px;
              height: 40px;
              align-items: center;
              justify-content: center;
              justify-self: end;
              margin-right: 12px;
              padding: 0;
              cursor: pointer;
              border: 0;
              border-radius: 999px;
              background: #f2f2f2;
              color: rgba(17, 17, 17, 0.62);
              font-family: var(--font-aktiv-grotesk), sans-serif;
              font-size: 22px;
              line-height: 1;
              transition:
                background-color 150ms ease,
                color 150ms ease,
                transform 150ms ease;
            }

            .discover-home-search button:hover,
            .discover-home-search button:focus-visible {
              background: #e4e4e4;
              color: #111;
              transform: translateX(1px);
            }

            .discover-home-search button:focus-visible {
              outline: 1px solid rgba(17, 17, 17, 0.35);
              outline-offset: 3px;
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search {
              background: var(--filmwave-neutral-surface);
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search input {
              color: #fff;
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search input::placeholder {
              color: rgba(255, 255, 255, 0.55);
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search button {
              background: #191919;
              color: rgba(255, 255, 255, 0.62);
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search button:hover,
            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search button:focus-visible {
              background: #242424;
              color: #fff;
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search button:focus-visible {
              outline-color: rgba(255, 255, 255, 0.72);
            }

            @media (max-width: 980px) {
              .discover-home-search {
                width: calc(100% - 64px);
                margin-top: 34px;
              }
            }

            @media (max-width: 720px) {
              .discover-home-search {
                width: calc(100% - 40px);
                height: 58px;
                grid-template-columns: minmax(0, 1fr) 52px;
                margin-right: auto;
                margin-left: auto;
                border-radius: 23px;
              }

              .discover-home-search input {
                padding-left: 22px;
                font-size: 14px;
              }

              .discover-home-search button {
                width: 36px;
                height: 36px;
                margin-right: 9px;
                font-size: 20px;
              }
            }
          `}</style>

          <form className="discover-home-search" onSubmit={handleSubmit}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search music library"
              aria-label="Search music library"
            />
            <button type="submit" aria-label="Search music library">
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="discover-integrated-values">
            <Link className="discover-integrated-value-link" href="/music">
              <strong>
                Human Curated Music Library
                <ArrowUpRightIcon
                  size={16}
                  className="discover-integrated-value-arrow"
                />
              </strong>
              <span>
                Human-picked tracks, thoughtful moods, and music chosen for
                real edits.
              </span>
            </Link>

            <Link
              className="discover-integrated-value-link"
              href="/sound-fx"
            >
              <strong>
                Thousands of Sound Effects
                <ArrowUpRightIcon
                  size={16}
                  className="discover-integrated-value-arrow"
                />
              </strong>
              <span>
                Thousands of sound effects, textures, and details for richer
                edits.
              </span>
            </Link>
          </div>
        </>
      ) : (
        <div className="discover-category-hero-controls">
          <form
            className="discover-category-search"
            style={{ marginTop: "10px" }}
            onSubmit={handleSubmit}
          >
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Describe a scene, mood, or feeling"
              aria-label="Search the music library"
            />
            <button type="submit" aria-label="Search the music library">
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="discover-category-browser" ref={filterAreaRef}>
            <h2>Browse by category</h2>

            <div className="discover-category-filter-controls">
              {DISCOVER_FILTER_GROUPS.map((group) => {
                const isOpen = activeFilter === group.id;
                const hasSelection = selectedFilters[group.id].length > 0;
                const panelId = `discover-category-panel-${group.id}`;

                return (
                  <button
                    key={group.id}
                    type="button"
                    className={`discover-category-filter-button${isOpen ? " is-open" : ""}${hasSelection ? " has-selection" : ""}`}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() =>
                      setActiveFilter((current) =>
                        current === group.id ? null : group.id,
                      )
                    }
                  >
                    <span>{group.label}</span>
                    <span
                      className="discover-category-filter-chevron"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}

              <button
                type="button"
                className="discover-category-filter-button is-future"
                disabled
                title="Style filters coming soon"
              >
                <span>Style</span>
                <span
                  className="discover-category-filter-chevron"
                  aria-hidden="true"
                />
              </button>
            </div>

            {activeFilter && (
              <div
                id={`discover-category-panel-${activeFilter}`}
                className="discover-category-filter-panel"
                role="group"
                aria-label={`${DISCOVER_FILTER_GROUPS.find((group) => group.id === activeFilter)?.label} filters`}
              >
                {DISCOVER_FILTER_GROUPS.find(
                  (group) => group.id === activeFilter,
                )?.options.map((option) => {
                  const isSelected = selectedFilters[activeFilter].includes(
                    option,
                  );

                  return (
                    <button
                      key={option}
                      type="button"
                      className={`discover-category-filter-pill${isSelected ? " is-selected" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => toggleFilterOption(activeFilter, option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
