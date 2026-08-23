"use client";

import { MOOD_OPTIONS } from "@filmwave/shared";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function SoundFxPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSearch = search.trim();

    router.push(
      cleanSearch
        ? `/sound-fx?search=${encodeURIComponent(cleanSearch)}`
        : "/sound-fx",
    );
  }

  function handleMoodFilterClick(option: string) {
    router.push(`/sound-fx?mood=${encodeURIComponent(option)}`);
  }

  return (
    <main className="sound-fx-discover-top min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        .sound-fx-discover-top .sound-fx-discover-content {
          min-height: 100vh;
          padding-top: calc(
            var(--filmwave-header-height, 75px) + clamp(38px, 3.7vw, 60px)
          );
          transition: margin-left 200ms ease;
        }

        .sound-fx-discover-top .discover-category-hero-controls {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: center;
          pointer-events: auto;
        }

        .sound-fx-discover-top .discover-category-search {
          display: grid;
          width: min(calc(100% - 80px), 800px);
          height: 68px;
          grid-template-columns: minmax(0, 1fr) 58px;
          align-items: center;
          margin-top: 10px;
          border: 0;
          border-radius: 28px;
          background: var(--filmwave-neutral-surface);
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.18);
        }

        .sound-fx-discover-top .discover-category-search input {
          width: 100%;
          min-width: 0;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--filmwave-white);
          padding: 0 12px 0 30px;
          font-family: var(--font-zalando-sans), sans-serif;
          font-size: clamp(14px, 0.9vw, 17px);
          font-weight: 400;
        }

        .sound-fx-discover-top .discover-category-search input::placeholder {
          color: rgba(255, 255, 255, 0.55);
          opacity: 1;
        }

        .sound-fx-discover-top .discover-category-search button {
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
          background: #202020;
          color: rgba(255, 255, 255, 0.62);
          font-family: var(--font-zalando-sans), sans-serif;
          font-size: 22px;
          font-weight: 200;
          line-height: 1;
          transition:
            background-color 150ms ease,
            color 150ms ease,
            transform 150ms ease;
        }

        .sound-fx-discover-top .discover-category-search button:hover,
        .sound-fx-discover-top .discover-category-search button:focus-visible {
          background: #2b2b2b;
          color: var(--filmwave-white);
          transform: translateX(1px);
        }

        .sound-fx-discover-top .discover-category-search button:focus-visible {
          outline: 1px solid rgba(255, 255, 255, 0.72);
          outline-offset: 3px;
        }

        .sound-fx-discover-top .discover-mood-browser {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: center;
          pointer-events: auto;
        }

        .sound-fx-discover-top .discover-category-description {
          width: min(calc(100% - 40px), 420px);
          margin: 65px 0 40px;
          color: var(--text-primary);
          font-family: var(--font-zalando-sans), sans-serif;
          font-size: clamp(17px, 1.15vw, 22px);
          font-weight: 200;
          letter-spacing: -0.025em;
          line-height: 1.35;
          text-align: center;
        }

        .sound-fx-discover-top .discover-mood-pill-list {
          display: flex;
          width: min(calc(100% - 80px), 1320px);
          overflow: visible;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 10px 2px;
        }

        .sound-fx-discover-top .discover-category-filter-pill {
          display: inline-flex;
          min-height: 22px;
          align-items: center;
          justify-content: center;
          padding: 2px 10px;
          cursor: pointer;
          border: 1px solid transparent;
          border-radius: 999px;
          background: var(--filmwave-neutral-surface);
          color: rgba(255, 255, 255, 0.82);
          font-family: var(--font-zalando-sans), sans-serif;
          font-size: 12px;
          font-weight: 320;
          line-height: 1.15;
          transition:
            border-color 150ms ease,
            background-color 150ms ease,
            color 150ms ease;
        }

        .sound-fx-discover-top .discover-category-filter-pill:focus-visible {
          outline: 1px solid currentColor;
          outline-offset: 2px;
        }

        :where(html.light, html[data-theme="light"])
          .sound-fx-discover-top
          .discover-category-search {
          background: var(--filmwave-neutral-surface);
          box-shadow: none;
        }

        :where(html.light, html[data-theme="light"])
          .sound-fx-discover-top
          .discover-category-search input {
          color: var(--text-primary);
        }

        :where(html.light, html[data-theme="light"])
          .sound-fx-discover-top
          .discover-category-search input::placeholder {
          color: var(--text-muted);
        }

        :where(html.light, html[data-theme="light"])
          .sound-fx-discover-top
          .discover-category-search button {
          background: var(--filmwave-neutral-surface);
          color: color-mix(in srgb, var(--filmwave-black) 62%, transparent);
        }

        :where(html.light, html[data-theme="light"])
          .sound-fx-discover-top
          .discover-category-search button:hover,
        :where(html.light, html[data-theme="light"])
          .sound-fx-discover-top
          .discover-category-search button:focus-visible {
          background: color-mix(
            in srgb,
            var(--filmwave-neutral-surface) 88%,
            var(--filmwave-black) 12%
          );
          color: var(--filmwave-black);
        }

        :where(html.light, html[data-theme="light"])
          .sound-fx-discover-top
          .discover-category-filter-pill {
          border-color: transparent;
          color: var(--text-secondary);
        }

        @media (max-width: 980px) {
          .sound-fx-discover-top .discover-category-search {
            width: calc(100% - 64px);
          }

          .sound-fx-discover-top .discover-mood-pill-list {
            width: calc(100% - 64px);
          }
        }

        @media (max-width: 720px) {
          .sound-fx-discover-top .sound-fx-discover-content {
            padding-top: calc(var(--filmwave-header-height, 75px) + 28px);
          }

          .sound-fx-discover-top .discover-category-search {
            width: calc(100% - 40px);
            height: 58px;
            grid-template-columns: minmax(0, 1fr) 52px;
            border-radius: 23px;
          }

          .sound-fx-discover-top .discover-category-search input {
            padding-left: 22px;
            font-size: 14px;
            font-weight: 320;
          }

          .sound-fx-discover-top .discover-category-search button {
            width: 36px;
            height: 36px;
            margin-right: 9px;
            font-size: 20px;
            font-weight: 200;
          }

          .sound-fx-discover-top .discover-category-description {
            width: calc(100% - 40px);
            font-size: 18px;
            font-weight: 200;
          }

          .sound-fx-discover-top .discover-mood-pill-list {
            width: calc(100% - 32px);
            gap: 7px;
            padding-right: 4px;
            padding-left: 4px;
          }

          .sound-fx-discover-top .discover-category-filter-pill {
            min-height: 22px;
            padding-right: 10px;
            padding-left: 10px;
            font-size: 11px;
            font-weight: 320;
          }
        }
      `}</style>

      <section className="sound-fx-discover-content">
        <div className="discover-category-hero-controls">
          <form className="discover-category-search" onSubmit={handleSubmit}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Describe a scene, mood, or feeling"
              aria-label="Search the sound effects library"
            />
            <button type="submit" aria-label="Search the sound effects library">
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
      </section>
    </main>
  );
}
