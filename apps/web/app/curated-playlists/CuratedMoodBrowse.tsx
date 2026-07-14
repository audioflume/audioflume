"use client";

import { useAuth } from "@clerk/nextjs";
import { MUSIC_FILTER_STORAGE_KEY_PREFIX } from "@filmwave/shared";
import { useRouter } from "next/navigation";

type MoodBrowseOption = {
  label: string;
  mood?: string;
  genre?: string;
};

const MOOD_BROWSE_OPTIONS: MoodBrowseOption[] = [
  { label: "All" },
  { label: "Calm", mood: "Peaceful" },
  { label: "Tension", mood: "Tense" },
  { label: "Uplifting", mood: "Uplifting" },
  { label: "Dark", mood: "Dark" },
  { label: "Ambient", genre: "Ambient" },
  { label: "Rhythmic", mood: "Energetic" },
  { label: "Cinematic", genre: "Cinematic" },
];

function readStoredFilters(storageKey: string) {
  try {
    const stored = sessionStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : {};

    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export default function CuratedMoodBrowse() {
  const { userId } = useAuth();
  const router = useRouter();

  function browse(option: MoodBrowseOption) {
    if (userId) {
      const storageKey = `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${userId}`;
      const currentFilters = readStoredFilters(storageKey);

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          ...currentFilters,
          search: "",
          selectedMoods: option.mood ? [option.mood] : [],
          selectedGenres: option.genre ? [option.genre] : [],
          selectedPlaylist: null,
        }),
      );
    }

    router.push("/music");
  }

  return (
    <section className="curated-mood-browse" aria-labelledby="curated-mood-browse-title">
      <style>{`
        .curated-mood-browse {
          width: 100%;
          padding: 42px 0 2px;
        }

        .curated-mood-browse h2 {
          margin: 0 0 24px;
          color: var(--text-primary);
          font-family: var(--font-instrument-sans), var(--font-satoshi), sans-serif;
          font-size: clamp(20px, 1.65vw, 25px);
          font-weight: 500;
          letter-spacing: -0.035em;
          line-height: 1;
        }

        .curated-mood-browse-list {
          display: grid;
          grid-template-columns: repeat(8, minmax(max-content, 1fr));
          align-items: end;
          gap: clamp(24px, 3.4vw, 64px);
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0 0 9px;
          scrollbar-width: none;
          overscroll-behavior-x: contain;
        }

        .curated-mood-browse-list::-webkit-scrollbar {
          display: none;
        }

        .curated-mood-browse-button {
          position: relative;
          display: inline-flex;
          width: fit-content;
          min-width: 0;
          cursor: pointer;
          align-items: center;
          justify-content: flex-start;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: var(--text-secondary);
          padding: 0 0 9px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
          transition: color 150ms ease;
        }

        .curated-mood-browse-button::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 1px;
          transform: scaleX(0);
          transform-origin: left;
          background: currentColor;
          transition: transform 150ms ease;
        }

        .curated-mood-browse-button:hover,
        .curated-mood-browse-button:focus-visible {
          color: var(--text-primary);
          outline: none;
        }

        .curated-mood-browse-button:hover::after,
        .curated-mood-browse-button:focus-visible::after,
        .curated-mood-browse-button.is-active::after {
          transform: scaleX(1);
        }

        .curated-mood-browse-button.is-active {
          color: var(--text-primary);
        }

        @media (max-width: 720px) {
          .curated-mood-browse {
            padding-top: 32px;
          }

          .curated-mood-browse h2 {
            margin-bottom: 20px;
          }

          .curated-mood-browse-list {
            grid-template-columns: repeat(8, max-content);
            gap: 32px;
            margin-right: calc(0px - var(--curated-page-gutter));
            padding-right: var(--curated-page-gutter);
          }
        }
      `}</style>

      <h2 id="curated-mood-browse-title">Browse by Mood</h2>

      <div className="curated-mood-browse-list" role="list">
        {MOOD_BROWSE_OPTIONS.map((option, index) => (
          <button
            key={option.label}
            type="button"
            className={`curated-mood-browse-button ${index === 0 ? "is-active" : ""}`}
            onClick={() => browse(option)}
            role="listitem"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
