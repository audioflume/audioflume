"use client";

import Footer from "@/components/Footer";
import { iconButtonClass, iconButtonActiveClass } from "@/components/uiClasses";
import {
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";
import { usePlayer } from "@/context/PlayerContext";
import { useMemo, useState } from "react";

type SfxItem = {
  id: string;
  title: string;
  collection: string;
  category: string;
  character: string;
  source: "Recorded" | "Designed" | "Hybrid";
  environment: "Interior" | "Exterior" | "Studio";
  duration: number;
  format: "WAV" | "MP3";
  type: "One Shot" | "Loop";
  tags: string[];
};

const SFX_ITEMS: SfxItem[] = [
  {
    id: "SFX-0001",
    title: "Deep Cinematic Hit",
    collection: "Trailer Toolkit",
    category: "Impacts",
    character: "Heavy",
    source: "Designed",
    environment: "Studio",
    duration: 4,
    format: "WAV",
    type: "One Shot",
    tags: ["Trailer", "Impact", "Dark", "Low End"],
  },
  {
    id: "SFX-0002",
    title: "Soft Cloth Movement",
    collection: "Foley Essentials",
    category: "Foley",
    character: "Subtle",
    source: "Recorded",
    environment: "Interior",
    duration: 2,
    format: "WAV",
    type: "One Shot",
    tags: ["Fabric", "Movement", "Organic", "Close"],
  },
  {
    id: "SFX-0003",
    title: "Urban Night Ambience",
    collection: "City Beds",
    category: "Ambience",
    character: "Atmospheric",
    source: "Recorded",
    environment: "Exterior",
    duration: 42,
    format: "WAV",
    type: "Loop",
    tags: ["City", "Night", "Street", "Bed"],
  },
  {
    id: "SFX-0004",
    title: "Camera Shutter Burst",
    collection: "Device Sounds",
    category: "Devices",
    character: "Mechanical",
    source: "Recorded",
    environment: "Studio",
    duration: 3,
    format: "MP3",
    type: "One Shot",
    tags: ["Camera", "Click", "Photo", "Mechanical"],
  },
  {
    id: "SFX-0005",
    title: "Rain on Window Loop",
    collection: "Weather Beds",
    category: "Weather",
    character: "Soft",
    source: "Recorded",
    environment: "Interior",
    duration: 58,
    format: "WAV",
    type: "Loop",
    tags: ["Rain", "Window", "Calm", "Interior"],
  },
  {
    id: "SFX-0006",
    title: "Metal Door Slam",
    collection: "Doors + Rooms",
    category: "Doors",
    character: "Hard",
    source: "Recorded",
    environment: "Interior",
    duration: 2,
    format: "WAV",
    type: "One Shot",
    tags: ["Door", "Metal", "Slam", "Industrial"],
  },
  {
    id: "SFX-0007",
    title: "Digital Glitch Sweep",
    collection: "Modern Transitions",
    category: "Transitions",
    character: "Digital",
    source: "Designed",
    environment: "Studio",
    duration: 5,
    format: "WAV",
    type: "One Shot",
    tags: ["Glitch", "Sweep", "Tech", "Transition"],
  },
  {
    id: "SFX-0008",
    title: "Forest Morning Bed",
    collection: "Nature Beds",
    category: "Ambience",
    character: "Natural",
    source: "Recorded",
    environment: "Exterior",
    duration: 64,
    format: "WAV",
    type: "Loop",
    tags: ["Forest", "Birds", "Morning", "Nature"],
  },
];

const CATEGORY_FILTERS = [
  "Impacts",
  "Foley",
  "Ambience",
  "Devices",
  "Weather",
  "Doors",
  "Transitions",
];

const CHARACTER_FILTERS = [
  "Heavy",
  "Subtle",
  "Atmospheric",
  "Mechanical",
  "Soft",
  "Hard",
  "Digital",
  "Natural",
];

const SOURCE_FILTERS = ["Recorded", "Designed", "Hybrid"];
const TYPE_FILTERS = ["One Shot", "Loop"];
const DURATION_FILTERS = ["Under 5s", "5s - 30s", "30s+"];

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 38.31 38.31" fill="none">
      <path
        d="M38.31,35.48l-11.75-11.74c1.89-2.49,3.03-5.58,3.03-8.94C29.6,6.64,22.96,0,14.8,0S0,6.64,0,14.8s6.64,14.8,14.8,14.8c3.36,0,6.45-1.14,8.94-3.03l11.75,11.74,2.83-2.83ZM14.8,25.6c-5.96,0-10.8-4.84-10.8-10.8S8.84,4,14.8,4s10.8,4.85,10.8,10.8-4.84,10.8-10.8,10.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5V19L19 12L8 5Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4V15"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M7.5 10.5L12 15L16.5 10.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20H19"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7H14"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M18 7H20"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M4 17H6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M10 17H20"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="8" cy="17" r="2" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `0:${String(seconds).padStart(2, "0")}`;

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function includesAll(values: string[], selected: string[]) {
  if (selected.length === 0) return true;
  return selected.every((value) => values.includes(value));
}

function matchesDuration(duration: number, selected: string[]) {
  if (selected.length === 0) return true;

  return selected.some((value) => {
    if (value === "Under 5s") return duration < 5;
    if (value === "5s - 30s") return duration >= 5 && duration <= 30;
    if (value === "30s+") return duration > 30;
    return true;
  });
}

function getWaveBars(item: SfxItem) {
  const seed = item.title.length + item.duration + item.id.length;

  return Array.from({ length: 42 }, (_, index) => {
    const value = Math.sin((index + 1) * seed * 0.18);
    const normalized = Math.abs(value);
    return Math.max(4, Math.round(6 + normalized * 26));
  });
}

function SfxWaveform({ item }: { item: SfxItem }) {
  return (
    <div className="sfx-waveform" aria-hidden="true">
      {getWaveBars(item).map((height, index) => (
        <span key={index} style={{ height }} />
      ))}
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${filterTriggerBaseClass} ${
        active ? filterTriggerActiveClass : filterTriggerInactiveClass
      }`}
    >
      {active && (
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      )}
      {label}
    </button>
  );
}

export default function SoundFxPage() {
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const activeFilterCount =
    selectedCategories.length +
    selectedCharacters.length +
    selectedSources.length +
    selectedTypes.length +
    selectedDurations.length;

  const filteredItems = useMemo(() => {
    return SFX_ITEMS.filter((item) => {
      const query = search.trim().toLowerCase();

      const searchableText = [
        item.id,
        item.title,
        item.collection,
        item.category,
        item.character,
        item.source,
        item.environment,
        item.type,
        item.format,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase();

      if (query && !searchableText.includes(query)) return false;
      if (!includesAll([item.category], selectedCategories)) return false;
      if (!includesAll([item.character], selectedCharacters)) return false;
      if (!includesAll([item.source], selectedSources)) return false;
      if (!includesAll([item.type], selectedTypes)) return false;
      if (!matchesDuration(item.duration, selectedDurations)) return false;

      return true;
    });
  }, [
    search,
    selectedCategories,
    selectedCharacters,
    selectedSources,
    selectedTypes,
    selectedDurations,
  ]);

  function clearFilters() {
    setSearch("");
    setSelectedCategories([]);
    setSelectedCharacters([]);
    setSelectedSources([]);
    setSelectedTypes([]);
    setSelectedDurations([]);
    setSelectedRowId(null);
  }

  return (
    <main className="soundfx-page">
      <style>{`
        .soundfx-page {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .soundfx-inner {
          min-height: 100vh;
          margin-left: var(--sidebar-width);
          padding-top: 56px;
          transition: margin-left 0.2s ease;
        }

        .soundfx-sticky {
          position: sticky;
          top: 56px;
          z-index: 90;
          background: color-mix(in srgb, var(--bg-primary) 96%, transparent);
          backdrop-filter: blur(18px);
        }

        .soundfx-search-row {
          display: flex;
          min-height: 58px;
          align-items: center;
          border-bottom: 1px solid var(--border);
          padding: 0 28px;
        }

        .soundfx-search-wrap {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 12px;
          color: var(--text-muted);
        }

        .soundfx-search-input {
          width: 100%;
          border: 0;
          background: transparent;
          color: var(--text-primary);
          font-size: 15px;
          font-weight: 300;
          outline: none;
        }

        .soundfx-search-input::placeholder {
          color: var(--text-muted);
        }

        .soundfx-filter-row {
          display: flex;
          min-height: 54px;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border-bottom: 1px solid var(--border);
          padding: 0 28px;
        }

        .soundfx-filter-scroll {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .soundfx-filter-scroll::-webkit-scrollbar {
          display: none;
        }

        .soundfx-filter-tools {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 7px;
        }

        .soundfx-filter-count {
          font-size: 11px;
          color: var(--text-muted);
        }

        .soundfx-clear {
          height: 28px;
          cursor: pointer;
          border: 0;
          background: transparent;
          padding: 0;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: color 0.15s ease;
        }

        .soundfx-clear:hover {
          color: var(--text-primary);
        }

        .soundfx-body {
          padding: 72px 0 0;
        }

        .soundfx-intro {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 48px;
          align-items: end;
          padding: 0 28px 48px;
        }

        .soundfx-kicker,
        .soundfx-stat-label,
        .soundfx-column-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .soundfx-title {
          margin-top: 8px;
          max-width: 780px;
          font-family: var(--font-instrument-sans);
          font-size: clamp(54px, 7vw, 86px);
          font-weight: 500;
          line-height: 0.88;
          letter-spacing: -0.075em;
          color: var(--text-primary);
        }

        .soundfx-summary {
          display: grid;
          border-top: 1px solid var(--border);
        }

        .soundfx-stat-row {
          display: grid;
          grid-template-columns: 1fr auto;
          min-height: 38px;
          align-items: center;
          border-bottom: 1px solid var(--border-subtle);
        }

        .soundfx-stat-row strong {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .soundfx-index {
          border-top: 1px solid var(--border-subtle);
        }

        .soundfx-index-header {
          display: grid;
          grid-template-columns: minmax(250px, 1fr) minmax(260px, 0.9fr) 92px 120px 120px 92px;
          gap: 28px;
          min-height: 38px;
          align-items: center;
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 28px;
        }

        .soundfx-row {
          display: grid;
          grid-template-columns: minmax(250px, 1fr) minmax(260px, 0.9fr) 92px 120px 120px 92px;
          gap: 28px;
          min-height: 76px;
          align-items: center;
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 28px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .soundfx-row:hover,
        .soundfx-row.is-selected {
          background: var(--bg-hover);
        }

        .soundfx-primary-cell {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 14px;
        }

        .soundfx-play {
          display: flex;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--icon-color);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .soundfx-row:hover .soundfx-play,
        .soundfx-row.is-selected .soundfx-play {
          border-color: var(--border-hover);
          background: var(--icon-button-hover);
          color: var(--text-primary);
        }

        .soundfx-title-wrap {
          min-width: 0;
        }

        .soundfx-name {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .soundfx-sub {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          color: var(--text-subtle);
        }

        .sfx-waveform {
          display: flex;
          height: 34px;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .sfx-waveform span {
          width: 2px;
          border-radius: 999px;
          background: var(--waveform-color);
          transition: background 0.15s ease;
        }

        .soundfx-row:hover .sfx-waveform span:nth-child(-n + 18),
        .soundfx-row.is-selected .sfx-waveform span:nth-child(-n + 18) {
          background: var(--waveform-progress);
        }

        .soundfx-muted {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .soundfx-right {
          text-align: right;
        }

        .soundfx-actions {
          display: flex;
          justify-content: flex-end;
        }

        .soundfx-expanded {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          border-top: 1px solid var(--border-subtle);
          padding: 0 0 18px 48px;
        }

        .soundfx-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding-top: 2px;
        }

        .soundfx-tags span {
          font-size: 11px;
          color: var(--text-muted);
        }

        .soundfx-detail-meta {
          display: flex;
          align-items: center;
          gap: 18px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .soundfx-empty {
          border-bottom: 1px solid var(--border-subtle);
          padding: 56px 28px;
        }

        .soundfx-empty h2 {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .soundfx-empty p {
          margin-top: 8px;
          max-width: 420px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .soundfx-load {
          display: flex;
          justify-content: center;
          padding: 24px 28px 0;
        }

        .soundfx-load button {
          height: 32px;
          cursor: pointer;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg-secondary);
          padding: 0 14px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: background 0.15s ease, color 0.15s ease;
        }

        .soundfx-load button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .soundfx-footer-wrap {
          padding-top: 38px;
        }

        @media (max-width: 1160px) {
          .soundfx-intro {
            grid-template-columns: 1fr;
          }

          .soundfx-index-header,
          .soundfx-row {
            grid-template-columns: minmax(240px, 1fr) minmax(220px, 0.8fr) 88px 92px;
          }

          .soundfx-index-header > :nth-child(4),
          .soundfx-index-header > :nth-child(5),
          .soundfx-row > :nth-child(4),
          .soundfx-row > :nth-child(5) {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .soundfx-search-row,
          .soundfx-filter-row,
          .soundfx-intro,
          .soundfx-index-header,
          .soundfx-row,
          .soundfx-empty {
            padding-left: 18px;
            padding-right: 18px;
          }

          .soundfx-body {
            padding-top: 48px;
          }

          .soundfx-title {
            font-size: 52px;
          }

          .soundfx-index-header {
            display: none;
          }

          .soundfx-row {
            grid-template-columns: minmax(0, 1fr) 36px;
            gap: 14px;
          }

          .soundfx-row > :nth-child(2),
          .soundfx-row > :nth-child(3),
          .soundfx-row > :nth-child(4),
          .soundfx-row > :nth-child(5) {
            display: none;
          }

          .soundfx-expanded {
            padding-left: 0;
          }
        }
      `}</style>

      <section className="soundfx-inner">
        <div className="soundfx-sticky">
          <div className="soundfx-search-row">
            <div className="soundfx-search-wrap">
              <SearchIcon />

              <input
                className="soundfx-search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Sound FX Library"
              />
            </div>
          </div>

          <div className="soundfx-filter-row">
            <div className="soundfx-filter-scroll">
              <FilterButton
                label="Category"
                active={selectedCategories.length > 0}
                onClick={() =>
                  setSelectedCategories((current) =>
                    current.length ? [] : [CATEGORY_FILTERS[0]],
                  )
                }
              />

              <FilterButton
                label="Character"
                active={selectedCharacters.length > 0}
                onClick={() =>
                  setSelectedCharacters((current) =>
                    current.length ? [] : ["Natural"],
                  )
                }
              />

              <FilterButton
                label="Source"
                active={selectedSources.length > 0}
                onClick={() =>
                  setSelectedSources((current) =>
                    current.length ? [] : ["Recorded"],
                  )
                }
              />

              <FilterButton
                label="Type"
                active={selectedTypes.length > 0}
                onClick={() =>
                  setSelectedTypes((current) =>
                    current.length ? [] : ["One Shot"],
                  )
                }
              />

              <FilterButton
                label="Duration"
                active={selectedDurations.length > 0}
                onClick={() =>
                  setSelectedDurations((current) =>
                    current.length ? [] : ["Under 5s"],
                  )
                }
              />
            </div>

            <div className="soundfx-filter-tools">
              <span className="soundfx-filter-count">
                {activeFilterCount} active
              </span>

              <button
                type="button"
                className={iconButtonClass}
                aria-label="Filter settings"
              >
                <SlidersIcon />
              </button>

              <button
                type="button"
                className="soundfx-clear"
                onClick={clearFilters}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="soundfx-body">
          <section className="soundfx-intro">
            <div>
              <div className="soundfx-kicker">Sound FX Library</div>
              <h1 className="soundfx-title">Sound Effects</h1>
            </div>

            <div className="soundfx-summary">
              <div className="soundfx-stat-row">
                <span className="soundfx-stat-label">Visible</span>
                <strong>{filteredItems.length}</strong>
              </div>

              <div className="soundfx-stat-row">
                <span className="soundfx-stat-label">Total Library</span>
                <strong>12,484</strong>
              </div>

              <div className="soundfx-stat-row">
                <span className="soundfx-stat-label">Batch Size</span>
                <strong>100</strong>
              </div>
            </div>
          </section>

          <section className="soundfx-index">
            <div className="soundfx-index-header">
              <div className="soundfx-column-label">Sound</div>
              <div className="soundfx-column-label">Preview</div>
              <div className="soundfx-column-label soundfx-right">Length</div>
              <div className="soundfx-column-label soundfx-right">
                Character
              </div>
              <div className="soundfx-column-label soundfx-right">Format</div>
              <div className="soundfx-column-label soundfx-right">Action</div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="soundfx-empty">
                <h2>No sound effects found</h2>
                <p>
                  Try clearing a filter or searching for a broader sound effect
                  term.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const selected = selectedRowId === item.id;

                return (
                  <article
                    key={item.id}
                    className={`soundfx-row ${selected ? "is-selected" : ""}`}
                    onClick={() => setSelectedRowId(selected ? null : item.id)}
                  >
                    <div className="soundfx-primary-cell">
                      <button
                        type="button"
                        className="soundfx-play"
                        aria-label={`Preview ${item.title}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <PlayIcon />
                      </button>

                      <div className="soundfx-title-wrap">
                        <span className="soundfx-name">{item.title}</span>
                        <span className="soundfx-sub">
                          {item.collection} · {item.category}
                        </span>
                      </div>
                    </div>

                    <SfxWaveform item={item} />

                    <div className="soundfx-muted soundfx-right">
                      {formatDuration(item.duration)}
                    </div>

                    <div className="soundfx-muted soundfx-right">
                      {item.character}
                    </div>

                    <div className="soundfx-muted soundfx-right">
                      {item.format} · {item.type}
                    </div>

                    <div className="soundfx-actions">
                      <button
                        type="button"
                        className={`${iconButtonClass} ${
                          selected ? iconButtonActiveClass : ""
                        }`}
                        aria-label={`Download ${item.title}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DownloadIcon />
                      </button>
                    </div>

                    {selected && (
                      <div className="soundfx-expanded">
                        <div className="soundfx-tags">
                          {item.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>

                        <div className="soundfx-detail-meta">
                          <span>{item.id}</span>
                          <span>{item.source}</span>
                          <span>{item.environment}</span>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>

          <div className="soundfx-load">
            <button type="button">Load next 100 sounds</button>
          </div>

          <div
            className="soundfx-footer-wrap"
            style={{
              paddingBottom: playerVisible ? "104px" : "32px",
            }}
          >
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
}
