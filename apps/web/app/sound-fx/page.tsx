"use client";

import FilterDropdown from "@/components/FilterDropdown";
import Footer from "@/components/Footer";
import {
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";
import {
  iconButtonClass,
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";
import { useDeferredValue, useMemo, useState } from "react";

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
  designedFor: string[];
  loudness: "Subtle" | "Medium" | "Loud";
  rating: number;
  downloads: number;
  added: string;
};

type SortValue = "relevance" | "newest" | "shortest" | "longest" | "popular";

type FilterPill = {
  id: string;
  label: string;
  onRemove: () => void;
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
    designedFor: ["Trailer", "Titles", "Reveal"],
    loudness: "Loud",
    rating: 98,
    downloads: 4210,
    added: "2026-04-18",
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
    designedFor: ["Dialogue", "Documentary", "Detail"],
    loudness: "Subtle",
    rating: 91,
    downloads: 1756,
    added: "2026-03-22",
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
    designedFor: ["Scene Bed", "Documentary", "B-Roll"],
    loudness: "Medium",
    rating: 94,
    downloads: 3022,
    added: "2026-04-02",
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
    designedFor: ["Social", "Montage", "Editorial"],
    loudness: "Medium",
    rating: 87,
    downloads: 1349,
    added: "2026-02-14",
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
    designedFor: ["Scene Bed", "Podcast", "Focus"],
    loudness: "Subtle",
    rating: 96,
    downloads: 3862,
    added: "2026-05-03",
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
    designedFor: ["Drama", "Action", "Cut Point"],
    loudness: "Loud",
    rating: 89,
    downloads: 2195,
    added: "2026-01-30",
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
    designedFor: ["YouTube", "Tech", "Scene Change"],
    loudness: "Medium",
    rating: 92,
    downloads: 2641,
    added: "2026-04-26",
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
    designedFor: ["Scene Bed", "Travel", "Documentary"],
    loudness: "Subtle",
    rating: 95,
    downloads: 2984,
    added: "2026-03-08",
  },
  {
    id: "SFX-0009",
    title: "Bass Whoosh Rise",
    collection: "Trailer Toolkit",
    category: "Whooshes",
    character: "Heavy",
    source: "Hybrid",
    environment: "Studio",
    duration: 8,
    format: "WAV",
    type: "One Shot",
    tags: ["Whoosh", "Rise", "Bass", "Trailer"],
    designedFor: ["Trailer", "Reveal", "Transition"],
    loudness: "Loud",
    rating: 97,
    downloads: 4055,
    added: "2026-05-08",
  },
  {
    id: "SFX-0010",
    title: "Kitchen Plate Setdown",
    collection: "Foley Essentials",
    category: "Foley",
    character: "Natural",
    source: "Recorded",
    environment: "Interior",
    duration: 1,
    format: "WAV",
    type: "One Shot",
    tags: ["Kitchen", "Plate", "Ceramic", "Table"],
    designedFor: ["Dialogue", "Lifestyle", "Detail"],
    loudness: "Subtle",
    rating: 84,
    downloads: 996,
    added: "2026-02-28",
  },
  {
    id: "SFX-0011",
    title: "Neon Sign Electrical Hum",
    collection: "Device Sounds",
    category: "Devices",
    character: "Atmospheric",
    source: "Hybrid",
    environment: "Interior",
    duration: 25,
    format: "MP3",
    type: "Loop",
    tags: ["Electric", "Hum", "Neon", "Room Tone"],
    designedFor: ["Scene Bed", "Sci-Fi", "Night"],
    loudness: "Medium",
    rating: 88,
    downloads: 1510,
    added: "2026-04-10",
  },
  {
    id: "SFX-0012",
    title: "Ocean Cliff Wind",
    collection: "Nature Beds",
    category: "Weather",
    character: "Atmospheric",
    source: "Recorded",
    environment: "Exterior",
    duration: 76,
    format: "WAV",
    type: "Loop",
    tags: ["Wind", "Ocean", "Cliff", "Coastal"],
    designedFor: ["Travel", "Documentary", "Scene Bed"],
    loudness: "Medium",
    rating: 93,
    downloads: 2448,
    added: "2026-01-16",
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
  "Whooshes",
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
const ENVIRONMENT_FILTERS = ["Interior", "Exterior", "Studio"];
const FORMAT_FILTERS = ["WAV", "MP3"];
const LOUDNESS_FILTERS = ["Subtle", "Medium", "Loud"];
const DURATION_FILTERS = ["< 5s", "5s - 15s", "15s - 60s", "60s+"];
const QUICK_FILTERS = ["Trailer", "Foley", "Ambience", "Whooshes", "Weather"];
const INITIAL_BATCH_SIZE = 8;

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 38.31 38.31" fill="none" aria-hidden="true">
      <path
        d="M38.31,35.48l-11.75-11.74c1.89-2.49,3.03-5.58,3.03-8.94C29.6,6.64,22.96,0,14.8,0S0,6.64,0,14.8s6.64,14.8,14.8,14.8c3.36,0,6.45-1.14,8.94-3.03l11.75,11.74,2.83-2.83ZM14.8,25.6c-5.96,0-10.8-4.84-10.8-10.8S8.84,4,14.8,4s10.8,4.85,10.8,10.8-4.84,10.8-10.8,10.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5V19L19 12L8 5Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4V15" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M7.5 10.5L12 15L16.5 10.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20H19" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7H14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M18 7H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4 17H6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M10 17H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="8" cy="17" r="2" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18 15L18.9 17.1L21 18L18.9 18.9L18 21L17.1 18.9L15 18L17.1 17.1L18 15Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `0:${String(seconds).padStart(2, "0")}`;

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function includesAny(values: string[], selected: string[]) {
  if (selected.length === 0) return true;
  return selected.some((selectedValue) => values.includes(selectedValue));
}

function matchesDuration(duration: number, selected: string[]) {
  if (selected.length === 0) return true;

  return selected.some((value) => {
    if (value === "< 5s") return duration < 5;
    if (value === "5s - 15s") return duration >= 5 && duration <= 15;
    if (value === "15s - 60s") return duration > 15 && duration <= 60;
    if (value === "60s+") return duration > 60;
    return true;
  });
}

function getSearchIndex(item: SfxItem) {
  return [
    item.id,
    item.title,
    item.collection,
    item.category,
    item.character,
    item.source,
    item.environment,
    item.type,
    item.format,
    item.loudness,
    ...item.tags,
    ...item.designedFor,
  ]
    .join(" ")
    .toLowerCase();
}

function getWaveBars(item: SfxItem) {
  const seed = item.title.length + item.duration + item.id.length;

  return Array.from({ length: 36 }, (_, index) => {
    const value = Math.sin((index + 1) * seed * 0.18);
    const normalized = Math.abs(value);
    return Math.max(4, Math.round(6 + normalized * 24));
  });
}

function SfxWaveform({ item, selected }: { item: SfxItem; selected: boolean }) {
  return (
    <div className="flex h-8 items-center gap-[3px]" aria-hidden="true">
      {getWaveBars(item).map((height, index) => (
        <span
          key={index}
          className={`w-0.5 rounded-full transition-colors ${
            selected || index < 15
              ? "bg-[var(--waveform-progress)]"
              : "bg-[var(--waveform-color)]"
          }`}
          style={{ height }}
        />
      ))}
    </div>
  );
}

function SortButton({
  value,
  current,
  label,
  onClick,
}: {
  value: SortValue;
  current: SortValue;
  label: string;
  onClick: (value: SortValue) => void;
}) {
  const active = value === current;

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  );
}

export default function SoundFxPage() {
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedLoudness, setSelectedLoudness] = useState<string[]>([]);
  const [sort, setSort] = useState<SortValue>("relevance");
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const indexedItems = useMemo(
    () => SFX_ITEMS.map((item) => ({ item, searchIndex: getSearchIndex(item) })),
    [],
  );

  const activeFilterCount =
    selectedCategories.length +
    selectedCharacters.length +
    selectedSources.length +
    selectedTypes.length +
    selectedDurations.length +
    selectedEnvironments.length +
    selectedFormats.length +
    selectedLoudness.length;

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    const nextItems = indexedItems
      .filter(({ item, searchIndex }) => {
        if (query && !searchIndex.includes(query)) return false;
        if (!includesAny([item.category], selectedCategories)) return false;
        if (!includesAny([item.character], selectedCharacters)) return false;
        if (!includesAny([item.source], selectedSources)) return false;
        if (!includesAny([item.type], selectedTypes)) return false;
        if (!includesAny([item.environment], selectedEnvironments)) return false;
        if (!includesAny([item.format], selectedFormats)) return false;
        if (!includesAny([item.loudness], selectedLoudness)) return false;
        if (!matchesDuration(item.duration, selectedDurations)) return false;

        return true;
      })
      .map(({ item, searchIndex }) => ({
        ...item,
        relevance: query ? searchIndex.indexOf(query) : 0,
      }));

    return nextItems.sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.added).getTime() - new Date(a.added).getTime();
      }
      if (sort === "shortest") return a.duration - b.duration;
      if (sort === "longest") return b.duration - a.duration;
      if (sort === "popular") return b.downloads - a.downloads;

      if (a.relevance !== b.relevance) return a.relevance - b.relevance;
      return b.rating - a.rating;
    });
  }, [
    deferredSearch,
    indexedItems,
    selectedCategories,
    selectedCharacters,
    selectedDurations,
    selectedEnvironments,
    selectedFormats,
    selectedLoudness,
    selectedSources,
    selectedTypes,
    sort,
  ]);

  const displayedItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  const activePills: FilterPill[] = [
    ...(search.trim()
      ? [
          {
            id: "search",
            label: `Search: ${search.trim()}`,
            onRemove: () => setSearch(""),
          },
        ]
      : []),
    ...selectedCategories.map((value) => ({
      id: `category-${value}`,
      label: value,
      onRemove: () => setSelectedCategories(toggleValue(selectedCategories, value)),
    })),
    ...selectedCharacters.map((value) => ({
      id: `character-${value}`,
      label: value,
      onRemove: () => setSelectedCharacters(toggleValue(selectedCharacters, value)),
    })),
    ...selectedSources.map((value) => ({
      id: `source-${value}`,
      label: value,
      onRemove: () => setSelectedSources(toggleValue(selectedSources, value)),
    })),
    ...selectedTypes.map((value) => ({
      id: `type-${value}`,
      label: value,
      onRemove: () => setSelectedTypes(toggleValue(selectedTypes, value)),
    })),
    ...selectedDurations.map((value) => ({
      id: `duration-${value}`,
      label: value,
      onRemove: () => setSelectedDurations(toggleValue(selectedDurations, value)),
    })),
    ...selectedEnvironments.map((value) => ({
      id: `environment-${value}`,
      label: value,
      onRemove: () =>
        setSelectedEnvironments(toggleValue(selectedEnvironments, value)),
    })),
    ...selectedFormats.map((value) => ({
      id: `format-${value}`,
      label: value,
      onRemove: () => setSelectedFormats(toggleValue(selectedFormats, value)),
    })),
    ...selectedLoudness.map((value) => ({
      id: `loudness-${value}`,
      label: value,
      onRemove: () => setSelectedLoudness(toggleValue(selectedLoudness, value)),
    })),
  ];

  function clearFilters() {
    setSearch("");
    setSelectedCategories([]);
    setSelectedCharacters([]);
    setSelectedSources([]);
    setSelectedTypes([]);
    setSelectedDurations([]);
    setSelectedEnvironments([]);
    setSelectedFormats([]);
    setSelectedLoudness([]);
    setVisibleCount(INITIAL_BATCH_SIZE);
    setSelectedRowId(null);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(INITIAL_BATCH_SIZE);
  }

  function updateFilter(next: () => void) {
    next();
    setVisibleCount(INITIAL_BATCH_SIZE);
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="min-h-screen pt-14 ml-[var(--sidebar-width)] transition-[margin-left] duration-200">
        <div className="sticky top-[56px] z-[90] border-b border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-xl">
          <div className="flex min-h-[58px] items-center gap-4 px-7">
            <div className="flex min-w-0 flex-1 cursor-text items-center gap-3 text-[var(--text-muted)]">
              <SearchIcon />
              <input
                type="text"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Search by sound, scene, tag, collection..."
                className="w-full bg-transparent text-[15px] font-[300] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="hidden items-center gap-2 text-[11px] text-[var(--text-muted)] md:flex">
              <span>{filteredItems.length} results</span>
              <span>·</span>
              <span>{compactNumber(12484)} library sounds</span>
            </div>
          </div>

          <div className="flex min-h-[54px] items-center gap-3 overflow-x-auto px-7 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterDropdown
              label="Category"
              options={CATEGORY_FILTERS}
              selected={selectedCategories}
              onChange={(selected) =>
                updateFilter(() => setSelectedCategories(selected))
              }
            />
            <FilterDropdown
              label="Character"
              options={CHARACTER_FILTERS}
              selected={selectedCharacters}
              onChange={(selected) =>
                updateFilter(() => setSelectedCharacters(selected))
              }
            />
            <FilterDropdown
              label="Source"
              options={SOURCE_FILTERS}
              selected={selectedSources}
              onChange={(selected) => updateFilter(() => setSelectedSources(selected))}
            />
            <FilterDropdown
              label="Type"
              options={TYPE_FILTERS}
              selected={selectedTypes}
              onChange={(selected) => updateFilter(() => setSelectedTypes(selected))}
            />
            <FilterDropdown
              label="Duration"
              options={DURATION_FILTERS}
              selected={selectedDurations}
              onChange={(selected) =>
                updateFilter(() => setSelectedDurations(selected))
              }
            />
            <FilterDropdown
              label="Environment"
              options={ENVIRONMENT_FILTERS}
              selected={selectedEnvironments}
              onChange={(selected) =>
                updateFilter(() => setSelectedEnvironments(selected))
              }
            />
            <FilterDropdown
              label="Format"
              options={FORMAT_FILTERS}
              selected={selectedFormats}
              onChange={(selected) => updateFilter(() => setSelectedFormats(selected))}
            />
            <FilterDropdown
              label="Loudness"
              options={LOUDNESS_FILTERS}
              selected={selectedLoudness}
              onChange={(selected) =>
                updateFilter(() => setSelectedLoudness(selected))
              }
            />

            <button
              type="button"
              className={`${filterTriggerBaseClass} ml-auto shrink-0 ${
                activeFilterCount > 0 || search.trim()
                  ? filterTriggerActiveClass
                  : filterTriggerInactiveClass
              }`}
              onClick={clearFilters}
            >
              <SlidersIcon />
              <span>{activeFilterCount} active</span>
            </button>
          </div>

          {activePills.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto border-t border-[var(--border-subtle)] px-7 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activePills.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={pill.onRemove}
                  className="inline-flex h-7 shrink-0 items-center gap-2 rounded-full bg-[var(--bg-elevated)] px-3 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <span>{pill.label}</span>
                  <span className="text-[var(--text-muted)]">×</span>
                </button>
              ))}

              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="px-8 pt-[38px] pb-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Sound FX Library
              </div>
              <h1 className="mt-2 max-w-[760px] font-[family-name:var(--font-aktiv-grotesk)] text-[56px] font-medium leading-[0.94] tracking-[-0.055em] text-[var(--text-primary)]">
                Find the right sound faster.
              </h1>
              <p className="mt-4 max-w-[560px] text-sm leading-6 text-[var(--text-secondary)]">
                Search thousands of production-ready effects with focused filters,
                fast previews, and metadata built for editors working on a deadline.
              </p>
            </div>

            <div className="grid min-w-[260px] grid-cols-3 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2">
              <div className="rounded-xl bg-[var(--bg-primary)] p-3">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Shown
                </div>
                <div className="mt-1 text-lg font-medium">{displayedItems.length}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-primary)] p-3">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Results
                </div>
                <div className="mt-1 text-lg font-medium">{filteredItems.length}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-primary)] p-3">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Total
                </div>
                <div className="mt-1 text-lg font-medium">12.4k</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            {QUICK_FILTERS.map((filter) => {
              const isCategory = CATEGORY_FILTERS.includes(filter);
              const isActive = isCategory
                ? selectedCategories.includes(filter)
                : search.toLowerCase() === filter.toLowerCase();

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    if (isCategory) {
                      updateFilter(() =>
                        setSelectedCategories(toggleValue(selectedCategories, filter)),
                      );
                    } else {
                      updateSearch(isActive ? "" : filter);
                    }
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                    isActive
                      ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)]">
          <div className="flex min-h-[46px] flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-8 py-2">
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <SparkIcon />
              <span>
                Showing {displayedItems.length} of {filteredItems.length} matches
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-card)] p-1">
              <SortButton value="relevance" current={sort} label="Relevant" onClick={setSort} />
              <SortButton value="newest" current={sort} label="Newest" onClick={setSort} />
              <SortButton value="shortest" current={sort} label="Shortest" onClick={setSort} />
              <SortButton value="longest" current={sort} label="Longest" onClick={setSort} />
              <SortButton value="popular" current={sort} label="Popular" onClick={setSort} />
            </div>
          </div>

          <div className="hidden min-h-[38px] grid-cols-[minmax(280px,1.1fr)_minmax(180px,0.7fr)_minmax(220px,0.9fr)_90px_90px_80px] items-center gap-6 border-b border-[var(--border-subtle)] px-8 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] xl:grid">
            <div>Sound</div>
            <div>Preview</div>
            <div>Use Case</div>
            <div className="text-right">Length</div>
            <div className="text-right">Format</div>
            <div className="text-right">Action</div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-8 text-center">
              <div className="text-base font-medium text-[var(--text-primary)]">
                No sound effects found
              </div>
              <p className="mt-2 max-w-[380px] text-sm leading-6 text-[var(--text-secondary)]">
                Try removing a filter, shortening the search phrase, or browsing a
                broader category.
              </p>
              <button type="button" onClick={clearFilters} className={`${primaryPillButtonClass} mt-5`}>
                Reset search
              </button>
            </div>
          ) : (
            displayedItems.map((item) => {
              const selected = selectedRowId === item.id;

              return (
                <article
                  key={item.id}
                  className={`grid min-h-[82px] cursor-pointer grid-cols-1 gap-4 border-b border-[var(--border-subtle)] px-5 py-4 transition hover:bg-[var(--bg-hover)] md:px-8 xl:grid-cols-[minmax(280px,1.1fr)_minmax(180px,0.7fr)_minmax(220px,0.9fr)_90px_90px_80px] xl:items-center xl:gap-6 xl:py-0 ${
                    selected ? "bg-[var(--bg-hover)]" : ""
                  }`}
                  onClick={() => setSelectedRowId(selected ? null : item.id)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--icon-color)] transition hover:border-[var(--border-hover)] hover:bg-[var(--icon-button-hover)] hover:text-[var(--text-primary)] ${
                        selected ? "border-[var(--border-hover)] bg-[var(--icon-button-hover)] text-[var(--text-primary)]" : ""
                      }`}
                      aria-label={`Preview ${item.title}`}
                    >
                      <PlayIcon />
                    </button>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {item.title}
                      </div>
                      <div className="mt-1 truncate text-xs text-[var(--text-subtle)]">
                        {item.collection} · {item.category} · {item.source}
                      </div>
                    </div>
                  </div>

                  <SfxWaveform item={item} selected={selected} />

                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-[var(--text-secondary)]">
                      {item.designedFor.join(" · ")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[var(--bg-card)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-[var(--text-secondary)] xl:text-right">
                    {formatDuration(item.duration)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] xl:text-right">
                    {item.format}
                  </div>
                  <div className="flex items-center gap-2 xl:justify-end">
                    <button
                      type="button"
                      className={iconButtonClass}
                      aria-label={`Download ${item.title}`}
                    >
                      <DownloadIcon />
                    </button>
                  </div>

                  {selected && (
                    <div className="grid gap-3 border-t border-[var(--border-subtle)] pt-4 xl:col-span-6 xl:grid-cols-[1fr_auto] xl:items-center">
                      <div className="flex flex-wrap gap-3 text-[11px] text-[var(--text-secondary)]">
                        <span>{item.environment}</span>
                        <span>·</span>
                        <span>{item.type}</span>
                        <span>·</span>
                        <span>{item.loudness}</span>
                        <span>·</span>
                        <span>{compactNumber(item.downloads)} downloads</span>
                        <span>·</span>
                        <span>{item.rating}% match score</span>
                      </div>

                      <button type="button" className={secondaryPillButtonClass}>
                        Add to project
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}

          {hasMore && (
            <div className="flex justify-center px-8 py-6">
              <button
                type="button"
                className={secondaryPillButtonClass}
                onClick={() => setVisibleCount((count) => count + INITIAL_BATCH_SIZE)}
              >
                Load {Math.min(INITIAL_BATCH_SIZE, filteredItems.length - visibleCount)} more
              </button>
            </div>
          )}
        </div>

        <div className={`px-8 ${playerVisible ? "pb-[132px]" : "pb-10"}`}>
          <Footer />
        </div>
      </section>
    </main>
  );
}
