"use client";

import {
  MOOD_OPTIONS,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
} from "@filmwave/shared";
import { useAuth } from "@clerk/nextjs";
import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";

type DiscoverCuratedHeroCopyProps = {
  showIntroCopy?: boolean;
};

type DiscoverFilterKey = "mood" | "genre" | "region";
type DiscoverFilterSelections = Record<DiscoverFilterKey, string[]>;

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
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] =
    useState<DiscoverFilterSelections>(EMPTY_DISCOVER_FILTERS);

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
    }

    router.push(
      cleanSearch
        ? `/music?search=${encodeURIComponent(cleanSearch)}`
        : "/music",
    );
  }

  function handleMoodFilterClick(option: string) {
    if (userId) {
      const storageKey = `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${userId}`;
      const storedFilters = readStoredFilters(storageKey);

      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          ...storedFilters,
          search: "",
          selectedMoods: [option],
        }),
      );
    }

    router.push("/music");
  }

  return (
    <section className="discover-integrated-hero" aria-label="Discover music">
      <style>{`
        :where(html.light, html[data-theme="light"])
          .discover-home-search
          input[type="search"]::-webkit-search-cancel-button,
        :where(html.light, html[data-theme="light"])
          .discover-category-search
          input[type="search"]::-webkit-search-cancel-button {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          cursor: pointer;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 2l8 8M10 2L2 10' stroke='%23111' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
          opacity: 0.72;
        }

        :where(html:not(.light):not([data-theme="light"]))
          .discover-integrated-hero {
          --discover-search-arrow-background: #202020;
          --discover-search-arrow-background-hover: #2b2b2b;
        }

        :where(html:not(.light):not([data-theme="light"]))
          .discover-category-search button {
          background: var(--discover-search-arrow-background);
        }

        :where(html:not(.light):not([data-theme="light"]))
          .discover-category-search button:hover,
        :where(html:not(.light):not([data-theme="light"]))
          .discover-category-search button:focus-visible {
          background: var(--discover-search-arrow-background-hover);
        }

        .discover-mood-browser {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: center;
          pointer-events: auto;
        }

        .discover-category-description {
          width: min(calc(100% - 40px), 420px);
          margin: 65px 0 40px;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(17px, 1.15vw, 22px);
          font-weight: 300;
          letter-spacing: -0.025em;
          line-height: 1.35;
          text-align: center;
        }

        .discover-mood-pill-list {
          display: flex;
          width: min(calc(100% - 80px), 1320px);
          overflow: visible;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 10px 2px;
        }

        @media (max-width: 980px) {
          .discover-mood-pill-list {
            width: calc(100% - 64px);
          }
        }

        @media (max-width: 720px) {
          .discover-category-description {
            width: calc(100% - 40px);
            font-size: 18px;
          }

          .discover-mood-pill-list {
            width: calc(100% - 32px);
            gap: 7px;
            padding-right: 4px;
            padding-left: 4px;
          }
        }
      `}</style>

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
              background: var(--filmwave-white);
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
              color: var(--filmwave-black);
              padding: 0 12px 0 30px;
              font-family: var(--font-aktiv-grotesk), sans-serif;
              font-size: clamp(14px, 0.9vw, 17px);
              font-weight: 400;
            }

            .discover-home-search input::placeholder {
              color: color-mix(in srgb, var(--filmwave-black) 55%, transparent);
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
              background: var(--filmwave-neutral-surface);
              color: color-mix(in srgb, var(--filmwave-black) 62%, transparent);
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
              background: color-mix(
                in srgb,
                var(--filmwave-neutral-surface) 92%,
                var(--filmwave-black) 8%
              );
              color: var(--filmwave-black);
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
              color: var(--filmwave-white);
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search input::placeholder {
              color: rgba(255, 255, 255, 0.55);
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search button {
              background: var(--discover-search-arrow-background);
              color: rgba(255, 255, 255, 0.62);
            }

            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search button:hover,
            :where(html:not(.light):not([data-theme="light"]))
              .discover-home-search button:focus-visible {
              background: var(--discover-search-arrow-background-hover);
              color: var(--filmwave-white);
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
              placeholder="Describe a scene, mood, or feeling"
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

          <div className="discover-mood-browser">
            <p className="discover-category-description">
              A highly curated library of royalty-free audio and sound effects
              made with intention for filmmakers.
            </p>

            <div
              className="discover-mood-pill-list"
              role="group"
              aria-label="Scene Mood filters"
            >
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="discover-category-filter-pill"
                  onClick={() => handleMoodFilterClick(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
