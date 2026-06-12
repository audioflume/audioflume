"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import type { FilmwaveBpmFilterValue, FilmwaveKeyFilterValue } from "./music";

/* ------------------------------------------------------------------ */
/* Icons — solid filled glyphs                                         */
/* ------------------------------------------------------------------ */

function DefaultSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.5 3a7.5 7.5 0 1 0 4.71 13.33l4.13 4.13a1.4 1.4 0 0 0 1.98-1.98l-4.13-4.13A7.5 7.5 0 0 0 10.5 3ZM5.8 10.5a4.7 4.7 0 1 1 9.4 0 4.7 4.7 0 0 1-9.4 0Z"
      />
    </svg>
  );
}

/* Three descending filled bars — universal "filter" symbol,
   clearly distinct from both the old funnel and the mixer faders. */
function FilterBarsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="3" y="5" width="18" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="6" y="10.9" width="12" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="9.5" y="16.8" width="5" height="2.2" rx="1.1" fill="currentColor" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5.3 8.6a1.3 1.3 0 0 1 1.84-.04L12 13.2l4.86-4.64a1.3 1.3 0 0 1 1.8 1.88l-5.76 5.5a1.3 1.3 0 0 1-1.8 0l-5.76-5.5a1.3 1.3 0 0 1-.04-1.84Z"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.6 5.3a1.3 1.3 0 0 1 1.84.04l5.5 5.76a1.3 1.3 0 0 1 0 1.8l-5.5 5.76a1.3 1.3 0 0 1-1.88-1.8L13.2 12 8.56 7.14a1.3 1.3 0 0 1 .04-1.84Z"
      />
    </svg>
  );
}

function ClearXIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.34 4.93 12 10.59l5.66-5.66a1 1 0 1 1 1.41 1.41L13.41 12l5.66 5.66a1 1 0 0 1-1.41 1.41L12 13.41l-5.66 5.66a1 1 0 0 1-1.41-1.41L10.59 12 4.93 6.34a1 1 0 0 1 1.41-1.41Z"
      />
    </svg>
  );
}

function OptionCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

export type MusicFilterChipGroup = {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
};

type MusicLibraryToolbarProps = {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: Ref<HTMLInputElement>;
  searchIcon?: ReactNode;
  filterCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  /** When supplied, the count badge shows an × on hover that clears all filters. */
  onClearFilters?: () => void;
  actions?: ReactNode;
  chips?: ReactNode;
  stickyTop?: CSSProperties["top"];
  className?: string;
  children?: ReactNode;
};

export function MusicLibraryToolbar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  searchInputRef,
  searchIcon,
  filterCount,
  filtersOpen,
  onToggleFilters,
  onClearFilters,
  actions,
  chips,
  stickyTop,
  className = "",
  children,
}: MusicLibraryToolbarProps) {
  return (
    <div
      className={`fw-toolbar-sticky${className ? ` ${className}` : ""}`}
      style={stickyTop !== undefined ? { top: stickyTop } : undefined}
    >
      <div className="fw-toolbar-float">
        <div className="fw-toolbar">
          <label className="fw-toolbar-search">
            <span className="fw-toolbar-search-icon" aria-hidden="true">
              {searchIcon ?? <DefaultSearchIcon />}
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            {searchValue.length > 0 && (
              <button
                type="button"
                className="fw-toolbar-search-clear"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
              >
                <ClearXIcon />
              </button>
            )}
          </label>

          <button
            type="button"
            className={`fw-toolbar-filters${filtersOpen ? " is-open" : ""}${
              filterCount > 0 ? " is-active" : ""
            }`}
            aria-expanded={filtersOpen}
            onClick={onToggleFilters}
          >
            <FilterBarsIcon />
            <span className="fw-toolbar-filters-label">Filters</span>

            {filterCount > 0 && (
              <span
                className={`fw-toolbar-filters-count${onClearFilters ? " is-clearable" : ""}`}
                role={onClearFilters ? "button" : undefined}
                aria-label={onClearFilters ? "Clear all filters" : undefined}
                title={onClearFilters ? "Clear all filters" : undefined}
                onClick={(event) => {
                  if (!onClearFilters) return;
                  event.stopPropagation();
                  onClearFilters();
                }}
              >
                <span className="fw-toolbar-filters-count-num">{filterCount}</span>
                {onClearFilters && (
                  <span className="fw-toolbar-filters-count-x" aria-hidden="true">
                    <ClearXIcon />
                  </span>
                )}
              </span>
            )}

            <span
              className={`fw-toolbar-filters-chevron${filtersOpen ? " is-open" : ""}`}
            >
              <ChevronDownIcon />
            </span>
          </button>

          {actions && <div className="fw-toolbar-actions">{actions}</div>}
        </div>

        {chips && <div className="fw-active-chips">{chips}</div>}
      </div>

      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared slider helpers                                               */
/* ------------------------------------------------------------------ */

function getSliderValueFromMouse(
  track: HTMLDivElement | null,
  clientX: number,
  min: number,
  max: number,
) {
  if (!track) return min;
  const rect = track.getBoundingClientRect();
  const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  return Math.round(min + (percent / 100) * (max - min));
}

function toSliderPercent(value: number, min: number, max: number) {
  return ((value - min) / (max - min)) * 100;
}

/* ------------------------------------------------------------------ */
/* Option list — checkable list rows                                   */
/* ------------------------------------------------------------------ */

function MusicFilterOptionRow({
  selected,
  onToggle,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`fw-filter-option${selected ? " is-selected" : ""}`}
      onClick={onToggle}
    >
      <span className="fw-filter-option-check" aria-hidden="true">
        {selected && <OptionCheckIcon />}
      </span>
      <span className="fw-filter-option-label">{children}</span>
    </button>
  );
}

function MusicFilterOptionList({ group }: { group: MusicFilterChipGroup }) {
  return (
    <div className="fw-filter-option-list">
      {group.options.map((option) => (
        <MusicFilterOptionRow
          key={option}
          selected={group.selected.includes(option)}
          onToggle={() => group.onToggle(option)}
        >
          {option}
        </MusicFilterOptionRow>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BPM section                                                         */
/* ------------------------------------------------------------------ */

const BPM_MIN = 1;
const BPM_MAX = 300;
const BPM_PRESETS = [80, 105, 120, 140];

type BpmMode = "range" | "exact";

function MusicBpmSection({
  value,
  onChange,
}: {
  value: FilmwaveBpmFilterValue | null;
  onChange: (value: FilmwaveBpmFilterValue | null) => void;
}) {
  const [mode, setMode] = useState<BpmMode>(value?.mode || "range");
  const [low, setLow] = useState(value?.low || BPM_MIN);
  const [high, setHigh] = useState(value?.high || BPM_MAX);
  const [exact, setExact] = useState(value?.exact || BPM_MIN);
  const rangeRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<BpmMode>(mode);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  const exactRef = useRef(exact);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { lowRef.current = low; }, [low]);
  useEffect(() => { highRef.current = high; }, [high]);
  useEffect(() => { exactRef.current = exact; }, [exact]);

  useEffect(() => {
    if (!value) {
      setMode("range"); setLow(BPM_MIN); setHigh(BPM_MAX); setExact(BPM_MIN);
      modeRef.current = "range"; lowRef.current = BPM_MIN; highRef.current = BPM_MAX; exactRef.current = BPM_MIN;
      return;
    }
    setMode(value.mode); setLow(value.low); setHigh(value.high); setExact(value.exact);
    modeRef.current = value.mode; lowRef.current = value.low; highRef.current = value.high; exactRef.current = value.exact;
  }, [value]);

  function emitChange(
    nextMode = modeRef.current,
    nextLow = lowRef.current,
    nextHigh = highRef.current,
    nextExact = exactRef.current,
  ) {
    if (nextMode === "range" && (nextLow !== BPM_MIN || nextHigh !== BPM_MAX)) {
      onChange({ mode: nextMode, low: nextLow, high: nextHigh, exact: nextExact });
      return;
    }
    if (nextMode === "exact" && nextExact !== BPM_MIN) {
      onChange({ mode: nextMode, low: nextLow, high: nextHigh, exact: nextExact });
      return;
    }
    onChange(null);
  }

  function startDrag(handle: "low" | "high" | "exact") {
    function onMove(event: MouseEvent) {
      const next = getSliderValueFromMouse(rangeRef.current, event.clientX, BPM_MIN, BPM_MAX);
      if (handle === "low") {
        const nextLow = Math.min(next, highRef.current - 1);
        lowRef.current = nextLow; setLow(nextLow);
        emitChange(modeRef.current, nextLow, highRef.current, exactRef.current);
        return;
      }
      if (handle === "high") {
        const nextHigh = Math.max(next, lowRef.current + 1);
        highRef.current = nextHigh; setHigh(nextHigh);
        emitChange(modeRef.current, lowRef.current, nextHigh, exactRef.current);
        return;
      }
      exactRef.current = next; setExact(next);
      emitChange(modeRef.current, lowRef.current, highRef.current, next);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      emitChange();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function applyRangeLow(nextLow: number) {
    const cleaned = Math.min(Math.max(Number.isFinite(nextLow) ? nextLow : BPM_MIN, BPM_MIN), highRef.current - 1);
    setLow(cleaned); lowRef.current = cleaned;
    emitChange("range", cleaned, highRef.current, exactRef.current);
  }

  function applyRangeHigh(nextHigh: number) {
    const cleaned = Math.max(Math.min(Number.isFinite(nextHigh) ? nextHigh : BPM_MAX, BPM_MAX), lowRef.current + 1);
    setHigh(cleaned); highRef.current = cleaned;
    emitChange("range", lowRef.current, cleaned, exactRef.current);
  }

  function applyExact(nextExact: number) {
    const cleaned = Math.min(Math.max(Number.isFinite(nextExact) ? nextExact : BPM_MIN, BPM_MIN), BPM_MAX);
    setExact(cleaned); exactRef.current = cleaned;
    emitChange("exact", lowRef.current, highRef.current, cleaned);
  }

  function switchMode(nextMode: BpmMode) {
    setMode(nextMode); modeRef.current = nextMode;
    emitChange(nextMode, lowRef.current, highRef.current, exactRef.current);
  }

  function handleTrackClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (modeRef.current !== "exact") return;
    const next = getSliderValueFromMouse(rangeRef.current, event.clientX, BPM_MIN, BPM_MAX);
    setExact(next); exactRef.current = next;
    emitChange("exact", lowRef.current, highRef.current, next);
  }

  function blurOnEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
  }

  const activeStart = mode === "range" ? toSliderPercent(low, BPM_MIN, BPM_MAX) : 0;
  const activeEnd = mode === "range"
    ? toSliderPercent(high, BPM_MIN, BPM_MAX)
    : toSliderPercent(exact, BPM_MIN, BPM_MAX);

  return (
    <div className="fw-filter-control-stack">
      <div className="fw-segment">
        {(["range", "exact"] as const).map((segmentMode) => (
          <button
            key={segmentMode}
            type="button"
            className={mode === segmentMode ? "is-active" : ""}
            onClick={() => switchMode(segmentMode)}
          >
            {segmentMode === "range" ? "Range" : "Exact"}
          </button>
        ))}
      </div>

      <div className="fw-filter-bpm-row">
        {mode === "range" ? (
          <>
            <label className="fw-filter-mini-field">
              <span>Low</span>
              <input type="number" min={BPM_MIN} max={BPM_MAX} value={low}
                onChange={(e) => setLow(Number(e.target.value))}
                onBlur={() => applyRangeLow(low)} onKeyDown={blurOnEnter}
                className="fw-filter-input" />
            </label>
            <span className="fw-filter-bpm-dash" aria-hidden="true">–</span>
            <label className="fw-filter-mini-field">
              <span>High</span>
              <input type="number" min={BPM_MIN} max={BPM_MAX} value={high}
                onChange={(e) => setHigh(Number(e.target.value))}
                onBlur={() => applyRangeHigh(high)} onKeyDown={blurOnEnter}
                className="fw-filter-input" />
            </label>
          </>
        ) : (
          <label className="fw-filter-mini-field">
            <span>Exact BPM</span>
            <input type="number" min={BPM_MIN} max={BPM_MAX} value={exact}
              onChange={(e) => setExact(Number(e.target.value))}
              onBlur={() => applyExact(exact)} onKeyDown={blurOnEnter}
              className="fw-filter-input" />
          </label>
        )}
      </div>

      <div className="fw-range-area">
        <div ref={rangeRef} className="fw-range-track" onClick={handleTrackClick}>
          <div className="fw-range-fill"
            style={{ left: `${activeStart}%`, width: `${Math.max(0, activeEnd - activeStart)}%` }} />
          {mode === "range" ? (
            (["low", "high"] as const).map((handle) => (
              <div key={handle} className="fw-range-handle"
                style={{ left: `${toSliderPercent(handle === "low" ? low : high, BPM_MIN, BPM_MAX)}%` }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag(handle); }} />
            ))
          ) : (
            <div className="fw-range-handle"
              style={{ left: `${toSliderPercent(exact, BPM_MIN, BPM_MAX)}%` }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag("exact"); }} />
          )}
        </div>
        <div className="fw-range-labels"><span>{BPM_MIN}</span><span>{BPM_MAX}</span></div>
      </div>

      <div className="fw-filter-chip-grid fw-filter-subrow">
        {BPM_PRESETS.map((preset) => {
          const isSelected = value?.mode === "exact" && value.exact === preset;
          return (
            <button key={preset} type="button" aria-pressed={isSelected}
              className={`fw-filter-chip${isSelected ? " is-selected" : ""}`}
              onClick={() => {
                if (isSelected) { setExact(BPM_MIN); exactRef.current = BPM_MIN; onChange(null); return; }
                setMode("exact"); modeRef.current = "exact";
                setExact(preset); exactRef.current = preset;
                emitChange("exact", lowRef.current, highRef.current, preset);
              }}>
              {preset}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Duration section                                                    */
/* ------------------------------------------------------------------ */

const DURATION_MIN = 0;
const DURATION_MAX = 300;

const DURATION_INTENTS = [
  { title: "Short", detail: "<1:00", low: 0, high: 60 },
  { title: "Quick", detail: "1–2 min", low: 60, high: 120 },
  { title: "Standard", detail: "2–3 min", low: 120, high: 180 },
  { title: "Long", detail: "3–4 min", low: 180, high: 240 },
  { title: "Extended", detail: "4:00+", low: 240, high: 300 },
];

function formatDurationTime(seconds: number) {
  const clean = Math.max(DURATION_MIN, Math.min(DURATION_MAX, Math.round(seconds)));
  return `${Math.floor(clean / 60)}:${String(clean % 60).padStart(2, "0")}`;
}

function parseDurationTime(value: string) {
  const [m = "0", s = "0"] = value.split(":");
  return Number(m) * 60 + Number(s);
}

function formatDurationLabel(low: number, high: number) {
  if (low === 0 && high === 60) return "0:00 - 1:00";
  if (low === 60 && high === 120) return "1:00 - 2:00";
  if (low === 120 && high === 180) return "2:00 - 3:00";
  if (low === 180 && high === 240) return "3:00 - 4:00";
  if (low === 240 && high === 300) return "4:00+";
  if (high === DURATION_MAX) return `${formatDurationTime(low)}+`;
  return `${formatDurationTime(low)} - ${formatDurationTime(high)}`;
}

function parseSelectedDuration(selected: string[]) {
  const first = selected[0];
  if (!first) return { low: DURATION_MIN, high: DURATION_MAX };
  if (first === "0:00 - 1:00") return { low: 0, high: 60 };
  if (first === "1:00 - 2:00") return { low: 60, high: 120 };
  if (first === "2:00 - 3:00") return { low: 120, high: 180 };
  if (first === "3:00 - 4:00") return { low: 180, high: 240 };
  if (first === "4:00+") return { low: 240, high: 300 };
  if (first.endsWith("+")) return { low: parseDurationTime(first.replace("+", "")), high: DURATION_MAX };
  if (first.includes(" - ")) {
    const [a, b] = first.split(" - ");
    return { low: parseDurationTime(a), high: parseDurationTime(b) };
  }
  return { low: DURATION_MIN, high: DURATION_MAX };
}

function MusicDurationSection({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const initial = parseSelectedDuration(selected);
  const [low, setLow] = useState(initial.low);
  const [high, setHigh] = useState(initial.high);
  const rangeRef = useRef<HTMLDivElement>(null);
  const lowRef = useRef(low);
  const highRef = useRef(high);

  useEffect(() => { lowRef.current = low; }, [low]);
  useEffect(() => { highRef.current = high; }, [high]);

  useEffect(() => {
    const next = parseSelectedDuration(selected);
    setLow(next.low); setHigh(next.high);
    lowRef.current = next.low; highRef.current = next.high;
  }, [selected]);

  function emitChange(nextLow = lowRef.current, nextHigh = highRef.current) {
    if (nextLow === DURATION_MIN && nextHigh === DURATION_MAX) { onChange([]); return; }
    onChange([formatDurationLabel(nextLow, nextHigh)]);
  }

  function startDrag(handle: "low" | "high") {
    function onMove(event: MouseEvent) {
      const next = getSliderValueFromMouse(rangeRef.current, event.clientX, DURATION_MIN, DURATION_MAX);
      if (handle === "low") {
        const nextLow = Math.min(next, highRef.current - 5);
        lowRef.current = nextLow; setLow(nextLow); emitChange(nextLow, highRef.current);
        return;
      }
      const nextHigh = Math.max(next, lowRef.current + 5);
      highRef.current = nextHigh; setHigh(nextHigh); emitChange(lowRef.current, nextHigh);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      emitChange();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const activeStart = toSliderPercent(low, DURATION_MIN, DURATION_MAX);
  const activeEnd = toSliderPercent(high, DURATION_MIN, DURATION_MAX);
  const hasActive = selected.length > 0;

  return (
    <div className="fw-filter-control-stack">
      <div className="fw-duration-summary">
        <span>{formatDurationTime(low)}</span>
        <span className="fw-duration-summary-mid">Range</span>
        <span>{high === DURATION_MAX ? `${formatDurationTime(high)}+` : formatDurationTime(high)}</span>
      </div>

      <div className="fw-range-area">
        <div ref={rangeRef} className="fw-range-track">
          <div className="fw-range-fill"
            style={{ left: `${activeStart}%`, width: `${Math.max(0, activeEnd - activeStart)}%` }} />
          {(["low", "high"] as const).map((handle) => (
            <div key={handle} className="fw-range-handle"
              style={{ left: `${toSliderPercent(handle === "low" ? low : high, DURATION_MIN, DURATION_MAX)}%` }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag(handle); }} />
          ))}
        </div>
        <div className="fw-range-labels"><span>0:00</span><span>5:00+</span></div>
      </div>

      <div className="fw-filter-chip-grid fw-filter-subrow">
        {DURATION_INTENTS.map((intent) => {
          const isSelected = low === intent.low && high === intent.high && hasActive;
          return (
            <button key={intent.title} type="button" aria-pressed={isSelected}
              className={`fw-filter-chip fw-filter-chip-stacked${isSelected ? " is-selected" : ""}`}
              onClick={() => {
                if (isSelected) {
                  setLow(DURATION_MIN); setHigh(DURATION_MAX);
                  lowRef.current = DURATION_MIN; highRef.current = DURATION_MAX;
                  onChange([]);
                  return;
                }
                setLow(intent.low); setHigh(intent.high);
                lowRef.current = intent.low; highRef.current = intent.high;
                emitChange(intent.low, intent.high);
              }}>
              <span>{intent.title}</span><small>{intent.detail}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Key section                                                         */
/* ------------------------------------------------------------------ */

const SHARP_ACCIDENTALS = ["C#", "D#", null, "F#", "G#", "A#"];
const FLAT_ACCIDENTALS = ["Db", "Eb", null, "Gb", "Ab", "Bb"];
const NATURAL_NOTES = ["C", "D", "E", "F", "G", "A", "B"];

function MusicKeySection({
  value,
  onChange,
}: {
  value: FilmwaveKeyFilterValue | null;
  onChange: (value: FilmwaveKeyFilterValue | null) => void;
}) {
  const [accidental, setAccidental] = useState<"sharp" | "flat">(
    value?.note?.includes("b") ? "flat" : "sharp",
  );

  useEffect(() => {
    if (value?.note) setAccidental(value.note.includes("b") ? "flat" : "sharp");
  }, [value]);

  const note = value?.note ?? null;
  const scale = value?.scale ?? null;

  function emit(nextNote: string | null, nextScale: "major" | "minor" | null) {
    if (!nextNote && !nextScale) { onChange(null); return; }
    onChange({ note: nextNote ?? "", scale: nextScale });
  }

  const accidentals = accidental === "sharp" ? SHARP_ACCIDENTALS : FLAT_ACCIDENTALS;

  return (
    <div className="fw-filter-control-stack">
      <div className="fw-segment">
        {(["sharp", "flat"] as const).map((m) => (
          <button key={m} type="button" className={accidental === m ? "is-active" : ""}
            onClick={() => setAccidental(m)}>
            {m === "sharp" ? "Sharp" : "Flat"}
          </button>
        ))}
      </div>

      <div className="fw-filter-chip-grid fw-filter-subrow">
        {accidentals.map((n, i) =>
          n === null ? (
            <span key={`sp${i}`} className="fw-filter-chip fw-filter-chip-compact fw-key-spacer" />
          ) : (
            <button key={n} type="button" aria-pressed={note === n}
              className={`fw-filter-chip fw-filter-chip-compact${note === n ? " is-selected" : ""}`}
              onClick={() => emit(note === n ? null : n, scale)}>{n}</button>
          ),
        )}
      </div>

      <div className="fw-filter-chip-grid fw-filter-subrow">
        {NATURAL_NOTES.map((n) => (
          <button key={n} type="button" aria-pressed={note === n}
            className={`fw-filter-chip fw-filter-chip-compact${note === n ? " is-selected" : ""}`}
            onClick={() => emit(note === n ? null : n, scale)}>{n}</button>
        ))}
      </div>

      <div className="fw-filter-chip-grid fw-filter-subrow">
        {(["major", "minor"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={scale === s}
            className={`fw-filter-chip${scale === s ? " is-selected" : ""}`}
            onClick={() => emit(note, scale === s ? null : s)}>
            {s === "major" ? "Major" : "Minor"}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Playlist section                                                    */
/* ------------------------------------------------------------------ */

export type MusicFilterPanelPlaylist = { id: string; name: string };

function MusicPlaylistSection({
  playlists,
  loading,
  selectedPlaylistId,
  onSelect,
}: {
  playlists: MusicFilterPanelPlaylist[];
  loading?: boolean;
  selectedPlaylistId?: string | null;
  onSelect: (playlist: MusicFilterPanelPlaylist | null) => void;
}) {
  if (loading) return <div className="fw-filter-empty">Loading…</div>;
  if (playlists.length === 0) return <div className="fw-filter-empty">No playlists yet</div>;

  return (
    <div className="fw-filter-option-list">
      {playlists.map((playlist) => {
        const isSelected = selectedPlaylistId === playlist.id;
        return (
          <MusicFilterOptionRow key={playlist.id} selected={isSelected}
            onToggle={() => onSelect(isSelected ? null : playlist)}>
            {playlist.name}
          </MusicFilterOptionRow>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter panel — rail + detail                                        */
/* ------------------------------------------------------------------ */

type MusicFilterPanelProps = {
  open: boolean;
  groups: MusicFilterChipGroup[];
  playlists?: MusicFilterPanelPlaylist[];
  playlistsLoading?: boolean;
  selectedPlaylistId?: string | null;
  onSelectPlaylist?: (playlist: MusicFilterPanelPlaylist | null) => void;
  bpmValue?: FilmwaveBpmFilterValue | null;
  onBpmChange?: (value: FilmwaveBpmFilterValue | null) => void;
  keyValue?: FilmwaveKeyFilterValue | null;
  onKeyChange?: (value: FilmwaveKeyFilterValue | null) => void;
  selectedDurations?: string[];
  onDurationsChange?: (selected: string[]) => void;
  markersActive?: boolean;
  markersDisabled?: boolean;
  onToggleMarkers?: () => void;
  hasActive?: boolean;
  onClearAll?: () => void;
  onClose: () => void;
};

export function MusicFilterPanel({
  open,
  groups,
  playlists,
  playlistsLoading = false,
  selectedPlaylistId = null,
  onSelectPlaylist,
  bpmValue = null,
  onBpmChange,
  keyValue = null,
  onKeyChange,
  selectedDurations = [],
  onDurationsChange,
  markersActive = false,
  markersDisabled = false,
  onToggleMarkers,
  hasActive = false,
  onClearAll,
  onClose,
}: MusicFilterPanelProps) {
  const sections: Array<{ id: string; label: string; count: number }> = [
    ...groups.map((g) => ({ id: g.id, label: g.label, count: g.selected.length })),
    ...(onSelectPlaylist ? [{ id: "playlist", label: "Playlist", count: selectedPlaylistId ? 1 : 0 }] : []),
    ...(onDurationsChange ? [{ id: "duration", label: "Duration", count: selectedDurations.length > 0 ? 1 : 0 }] : []),
    ...(onBpmChange ? [{ id: "bpm", label: "BPM", count: bpmValue ? 1 : 0 }] : []),
    ...(onKeyChange ? [{ id: "key", label: "Key", count: keyValue ? 1 : 0 }] : []),
    ...(onToggleMarkers ? [{ id: "display", label: "Display", count: markersActive ? 1 : 0 }] : []),
  ];

  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.some((s) => s.id === activeSectionId)) return;
    setActiveSectionId(sections[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length, activeSectionId]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const activeGroup = groups.find((g) => g.id === activeSectionId);

  function renderDetail() {
    if (activeGroup) return <MusicFilterOptionList group={activeGroup} />;
    if (activeSectionId === "playlist" && onSelectPlaylist)
      return <MusicPlaylistSection playlists={playlists ?? []} loading={playlistsLoading}
        selectedPlaylistId={selectedPlaylistId} onSelect={onSelectPlaylist} />;
    if (activeSectionId === "duration" && onDurationsChange)
      return <MusicDurationSection selected={selectedDurations} onChange={onDurationsChange} />;
    if (activeSectionId === "bpm" && onBpmChange)
      return <MusicBpmSection value={bpmValue} onChange={onBpmChange} />;
    if (activeSectionId === "key" && onKeyChange)
      return <MusicKeySection value={keyValue} onChange={onKeyChange} />;
    if (activeSectionId === "display" && onToggleMarkers)
      return (
        <div className="fw-filter-option-list">
          <button type="button" disabled={markersDisabled} aria-pressed={markersActive}
            className={`fw-filter-option${markersActive ? " is-selected" : ""}`}
            onClick={onToggleMarkers}>
            <span className="fw-filter-option-check" aria-hidden="true">
              {markersActive && <OptionCheckIcon />}
            </span>
            <span className="fw-filter-option-label">Show cue markers</span>
          </button>
        </div>
      );
    return null;
  }

  return (
    <div className={`fw-filter-panel-wrap${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="fw-filter-panel-reveal">
        <div className="fw-filter-panel">
          <div className="fw-filter-panel-body">
            <nav className="fw-filter-rail" aria-label="Filter categories">
              {sections.map((section) => {
                const isActive = section.id === activeSectionId;
                return (
                  <button key={section.id} type="button"
                    className={`fw-filter-rail-item${isActive ? " is-active" : ""}`}
                    aria-current={isActive}
                    onClick={() => setActiveSectionId(section.id)}>
                    <span className="fw-filter-rail-label">{section.label}</span>
                    {section.count > 0 && (
                      <span className="fw-filter-rail-count">{section.count}</span>
                    )}
                    <span className="fw-filter-rail-chevron" aria-hidden="true">
                      <ChevronRightIcon />
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="fw-filter-detail">
              {activeSection && (
                <h3 className="fw-filter-group-label">
                  {activeSection.label}
                  {activeSection.count > 0 && (
                    <span className="fw-filter-group-count">{activeSection.count}</span>
                  )}
                </h3>
              )}
              {renderDetail()}
            </div>
          </div>

          <div className="fw-filter-panel-footer">
            {hasActive && onClearAll ? (
              <button type="button" className="fw-filter-clear-all" onClick={onClearAll}>Clear all</button>
            ) : <span />}
            <button type="button" className="fw-filter-done" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick chips                                                         */
/* ------------------------------------------------------------------ */

export function MusicQuickChips({ children }: { children: ReactNode }) {
  return <div className="fw-quick-row">{children}</div>;
}

export function MusicQuickChipsEnd({ children }: { children: ReactNode }) {
  return <span className="fw-quick-end">{children}</span>;
}

export function MusicQuickChip({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`fw-filter-chip fw-quick-chip${active ? " is-selected" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* List shell                                                          */
/* ------------------------------------------------------------------ */

export function MusicListShell({
  title = "All tracks",
  meta,
  children,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fw-song-list">
      <div className="fw-song-list-head">
        <div className="fw-song-list-title">{title}</div>
        {meta && <div className="fw-song-list-meta">{meta}</div>}
      </div>
      {children}
    </div>
  );
}
