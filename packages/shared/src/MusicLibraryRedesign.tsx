"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from "react";
import type { FilmwaveBpmFilterValue, FilmwaveKeyFilterValue } from "./music";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function DefaultSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.2 16.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FunnelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
      <path
        d="M4 5H20L14 12.5V19L10 17V12.5L4 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClearSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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
  actions,
  chips,
  stickyTop,
  className = "",
  children,
}: MusicLibraryToolbarProps) {
  const internalSearchRef = useRef<HTMLInputElement | null>(null);

  function setSearchRefs(node: HTMLInputElement | null) {
    internalSearchRef.current = node;

    if (typeof searchInputRef === "function") {
      searchInputRef(node);
      return;
    }

    if (searchInputRef && "current" in searchInputRef) {
      (searchInputRef as MutableRefObject<HTMLInputElement | null>).current = node;
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      internalSearchRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
              ref={setSearchRefs}
              type="text"
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            {searchValue.length === 0 && (
              <kbd className="fw-toolbar-search-kbd" aria-hidden="true">/</kbd>
            )}
            {searchValue.length > 0 && (
              <button
                type="button"
                className="fw-toolbar-search-clear"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
              >
                <ClearSearchIcon />
              </button>
            )}
          </label>

          <button
            type="button"
            className={`fw-toolbar-filters${filtersOpen ? " is-open" : ""}${filterCount > 0 ? " is-active" : ""}`}
            aria-expanded={filtersOpen}
            onClick={onToggleFilters}
          >
            <FunnelIcon />
            <span className="fw-toolbar-filters-label">Filters</span>
            {filterCount > 0 && (
              <span className="fw-toolbar-filters-count">{filterCount}</span>
            )}
            <span className={`fw-toolbar-filters-chevron${filtersOpen ? " is-open" : ""}`}>
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
/* Native panel sections (BPM / Key / Duration / Playlist / Markers)   */
/* ------------------------------------------------------------------ */

const BPM_MIN = 1;
const BPM_MAX = 300;
const BPM_PRESETS = [80, 105, 120, 140];

function MusicBpmSection({
  value,
  onChange,
}: {
  value: FilmwaveBpmFilterValue | null;
  onChange: (value: FilmwaveBpmFilterValue | null) => void;
}) {
  const [low, setLow] = useState(value?.mode === "range" ? value.low : BPM_MIN);
  const [high, setHigh] = useState(value?.mode === "range" ? value.high : BPM_MAX);

  useEffect(() => {
    if (value?.mode === "range") {
      setLow(value.low);
      setHigh(value.high);
      return;
    }

    setLow(BPM_MIN);
    setHigh(BPM_MAX);
  }, [value]);

  function applyRange(nextLow: number, nextHigh: number) {
    const cleanLow = Math.max(
      BPM_MIN,
      Math.min(Number.isFinite(nextLow) ? nextLow : BPM_MIN, BPM_MAX - 1),
    );
    const cleanHigh = Math.min(
      BPM_MAX,
      Math.max(Number.isFinite(nextHigh) ? nextHigh : BPM_MAX, cleanLow + 1),
    );

    setLow(cleanLow);
    setHigh(cleanHigh);

    if (cleanLow === BPM_MIN && cleanHigh === BPM_MAX) {
      onChange(null);
      return;
    }

    onChange({ mode: "range", low: cleanLow, high: cleanHigh, exact: BPM_MIN });
  }

  function blurOnEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
  }

  const hasActive = value !== null;

  return (
    <section className="fw-filter-group">
      <h3 className="fw-filter-group-label">
        BPM
        {hasActive && <span className="fw-filter-group-count">1</span>}
      </h3>

      <div className="fw-filter-chip-grid">
        {BPM_PRESETS.map((preset) => {
          const isSelected = value?.mode === "exact" && value.exact === preset;

          return (
            <button
              key={preset}
              type="button"
              aria-pressed={isSelected}
              className={`fw-filter-chip${isSelected ? " is-selected" : ""}`}
              onClick={() =>
                onChange(
                  isSelected
                    ? null
                    : { mode: "exact", low: BPM_MIN, high: BPM_MAX, exact: preset },
                )
              }
            >
              {preset}
            </button>
          );
        })}
      </div>

      <div className="fw-filter-bpm-row">
        <label className="fw-filter-mini-field">
          <span>Low</span>
          <input
            type="number"
            min={BPM_MIN}
            max={BPM_MAX}
            value={low}
            onChange={(event) => setLow(Number(event.target.value))}
            onBlur={() => applyRange(low, high)}
            onKeyDown={blurOnEnter}
            className="fw-filter-input"
          />
        </label>
        <span className="fw-filter-bpm-dash" aria-hidden="true">–</span>
        <label className="fw-filter-mini-field">
          <span>High</span>
          <input
            type="number"
            min={BPM_MIN}
            max={BPM_MAX}
            value={high}
            onChange={(event) => setHigh(Number(event.target.value))}
            onBlur={() => applyRange(low, high)}
            onKeyDown={blurOnEnter}
            className="fw-filter-input"
          />
        </label>
      </div>
    </section>
  );
}

const KEY_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function MusicKeySection({
  value,
  onChange,
}: {
  value: FilmwaveKeyFilterValue | null;
  onChange: (value: FilmwaveKeyFilterValue | null) => void;
}) {
  const note = value?.note ?? null;
  const scale = value?.scale ?? null;

  return (
    <section className="fw-filter-group">
      <h3 className="fw-filter-group-label">
        Key
        {value && <span className="fw-filter-group-count">1</span>}
      </h3>

      <div className="fw-filter-chip-grid">
        {KEY_NOTES.map((keyNote) => {
          const isSelected = note === keyNote;

          return (
            <button
              key={keyNote}
              type="button"
              aria-pressed={isSelected}
              className={`fw-filter-chip fw-filter-chip-compact${isSelected ? " is-selected" : ""}`}
              onClick={() =>
                onChange(isSelected ? null : { note: keyNote, scale })
              }
            >
              {keyNote}
            </button>
          );
        })}
      </div>

      <div className="fw-filter-chip-grid fw-filter-subrow">
        {(["major", "minor"] as const).map((scaleMode) => {
          const isSelected = Boolean(note) && scale === scaleMode;

          return (
            <button
              key={scaleMode}
              type="button"
              disabled={!note}
              aria-pressed={isSelected}
              className={`fw-filter-chip${isSelected ? " is-selected" : ""}`}
              onClick={() => {
                if (!note) return;
                onChange({ note, scale: scale === scaleMode ? null : scaleMode });
              }}
            >
              {scaleMode === "major" ? "Major" : "Minor"}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const DURATION_INTENTS = [
  { title: "Short", detail: "<1:00", label: "0:00 - 1:00" },
  { title: "Quick", detail: "1–2 min", label: "1:00 - 2:00" },
  { title: "Standard", detail: "2–3 min", label: "2:00 - 3:00" },
  { title: "Long", detail: "3–4 min", label: "3:00 - 4:00" },
  { title: "Extended", detail: "4:00+", label: "4:00+" },
];

function MusicDurationSection({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <section className="fw-filter-group">
      <h3 className="fw-filter-group-label">
        Duration
        {selected.length > 0 && (
          <span className="fw-filter-group-count">{selected.length}</span>
        )}
      </h3>

      <div className="fw-filter-chip-grid">
        {DURATION_INTENTS.map((intent) => {
          const isSelected = selected[0] === intent.label;

          return (
            <button
              key={intent.label}
              type="button"
              aria-pressed={isSelected}
              className={`fw-filter-chip fw-filter-chip-stacked${isSelected ? " is-selected" : ""}`}
              onClick={() => onChange(isSelected ? [] : [intent.label])}
            >
              <span>{intent.title}</span>
              <small>{intent.detail}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

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
  return (
    <section className="fw-filter-group">
      <h3 className="fw-filter-group-label">
        Playlist
        {selectedPlaylistId && <span className="fw-filter-group-count">1</span>}
      </h3>

      {loading ? (
        <div className="fw-filter-empty">Loading playlists…</div>
      ) : playlists.length === 0 ? (
        <div className="fw-filter-empty">No playlists yet</div>
      ) : (
        <div className="fw-filter-chip-grid">
          {playlists.map((playlist) => {
            const isSelected = selectedPlaylistId === playlist.id;

            return (
              <button
                key={playlist.id}
                type="button"
                aria-pressed={isSelected}
                className={`fw-filter-chip${isSelected ? " is-selected" : ""}`}
                onClick={() => onSelect(isSelected ? null : playlist)}
              >
                {playlist.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Filter panel                                                        */
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
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <div className={`fw-filter-panel-wrap${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="fw-filter-panel-reveal">
        <div className="fw-filter-panel">
          <div className="fw-filter-panel-scroll">
            <div className="fw-filter-panel-grid">
              {groups.map((group) => (
                <section key={group.id} className="fw-filter-group">
                  <h3 className="fw-filter-group-label">
                    {group.label}
                    {group.selected.length > 0 && (
                      <span className="fw-filter-group-count">{group.selected.length}</span>
                    )}
                  </h3>
                  <div className="fw-filter-chip-grid">
                    {group.options.map((option) => {
                      const isSelected = group.selected.includes(option);

                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={isSelected}
                          className={`fw-filter-chip${isSelected ? " is-selected" : ""}`}
                          onClick={() => group.onToggle(option)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              {onSelectPlaylist && (
                <MusicPlaylistSection
                  playlists={playlists ?? []}
                  loading={playlistsLoading}
                  selectedPlaylistId={selectedPlaylistId}
                  onSelect={onSelectPlaylist}
                />
              )}

              {onDurationsChange && (
                <MusicDurationSection
                  selected={selectedDurations}
                  onChange={onDurationsChange}
                />
              )}

              {onBpmChange && (
                <MusicBpmSection value={bpmValue} onChange={onBpmChange} />
              )}

              {onKeyChange && (
                <MusicKeySection value={keyValue} onChange={onKeyChange} />
              )}

              {onToggleMarkers && (
                <section className="fw-filter-group">
                  <h3 className="fw-filter-group-label">
                    Display
                    {markersActive && <span className="fw-filter-group-count">1</span>}
                  </h3>
                  <div className="fw-filter-chip-grid">
                    <button
                      type="button"
                      disabled={markersDisabled}
                      aria-pressed={markersActive}
                      className={`fw-filter-chip${markersActive ? " is-selected" : ""}`}
                      onClick={onToggleMarkers}
                    >
                      Cue markers
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>

          <div className="fw-filter-panel-footer">
            {hasActive && onClearAll ? (
              <button type="button" className="fw-filter-clear-all" onClick={onClearAll}>
                Clear all
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="fw-filter-done" onClick={onClose}>
              Done
            </button>
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
