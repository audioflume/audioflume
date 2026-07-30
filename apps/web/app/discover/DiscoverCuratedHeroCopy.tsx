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
import SearchIcon from "@/components/icons/SearchIcon";

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
          <div className="curated-video-hero discover-curated-hero-copy-shell">
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

          <form className="discover-integrated-search" onSubmit={handleSubmit}>
            <span
              className="discover-integrated-search-icon"
              aria-hidden="true"
            >
              <SearchIcon size={15} />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search music library"
              aria-label="Search music library"
            />
            <button type="submit">
              <span>Search</span>
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
          <form className="discover-category-search" onSubmit={handleSubmit}>
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
                    style={{ height: "22px" }}
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
                style={{ height: "22px" }}
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
