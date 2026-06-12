"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { FilmwaveBpmFilterValue, FilmwaveKeyFilterValue } from "./music";

type MusicFilterChipGroup = {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
};

type MusicFilterPanelPlaylist = { id: string; name: string };

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

type FilterSection = {
  id: string;
  title: string;
  kicker: string;
  count: number;
  content: ReactNode;
};

const FILTER_STACK_CSS = `
.fw-filter-stack-panel {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: var(--bg-secondary);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
}

.fw-filter-stack-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--border-subtle);
  padding: 20px 22px 16px;
}

.fw-filter-stack-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 1;
}

.fw-filter-stack-subtitle {
  margin-top: 7px;
  max-width: 480px;
  color: var(--text-muted);
  font-size: 12.5px;
  line-height: 1.45;
}

.fw-filter-stack-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fw-filter-stack-count {
  display: inline-flex;
  height: 27px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  background: var(--bg-tertiary);
  padding: 0 11px;
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
}

.fw-filter-stack-close {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}

.fw-filter-stack-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.fw-filter-stack-body {
  display: grid;
  grid-template-columns: minmax(170px, 0.34fr) minmax(0, 1fr);
  min-height: 430px;
}

.fw-filter-stack-nav {
  border-right: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-primary) 48%, transparent);
  padding: 12px;
}

.fw-filter-stack-nav-button {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 12px 11px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}

.fw-filter-stack-nav-button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.fw-filter-stack-nav-button.is-active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.fw-filter-stack-nav-count {
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--accent);
  padding: 0 5px;
  color: var(--accent-contrast, #111111);
  font-size: 10px;
  font-weight: 700;
}

.fw-filter-stack-main {
  min-width: 0;
  padding: 18px;
}

.fw-filter-stack-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 15px;
}

.fw-filter-stack-section-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.04em;
}

.fw-filter-stack-section-kicker {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 12px;
}

.fw-filter-stack-option-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.fw-filter-stack-option-grid.is-compact {
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
}

.fw-filter-stack-option {
  min-height: 46px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-tertiary);
  padding: 11px 12px;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease;
}

.fw-filter-stack-option:hover {
  border-color: var(--border-strong);
  background: var(--bg-hover);
  color: var(--text-primary);
}

.fw-filter-stack-option.is-selected {
  border-color: color-mix(in srgb, var(--accent) 56%, var(--border-strong));
  background: var(--accent);
  color: var(--accent-contrast, #111111);
  font-weight: 600;
}

.fw-filter-stack-option-main {
  display: block;
}

.fw-filter-stack-option-detail {
  display: block;
  margin-top: 4px;
  font-size: 10.5px;
  font-weight: 400;
  opacity: 0.68;
}

.fw-filter-stack-panel-row {
  display: grid;
  gap: 16px;
}

.fw-filter-stack-subsection {
  display: grid;
  gap: 8px;
}

.fw-filter-stack-subsection-title {
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fw-filter-stack-empty {
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-tertiary);
  padding: 18px;
  color: var(--text-muted);
  font-size: 12px;
}

.fw-filter-stack-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border-subtle);
  padding: 14px 18px;
}

.fw-filter-stack-clear,
.fw-filter-stack-apply {
  border: 0;
  font-family: inherit;
  cursor: pointer;
}

.fw-filter-stack-clear {
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
}

.fw-filter-stack-clear:hover {
  color: var(--text-primary);
}

.fw-filter-stack-clear:disabled {
  cursor: default;
  opacity: 0.35;
}

.fw-filter-stack-apply {
  min-width: 118px;
  border-radius: 8px;
  background: var(--text-primary);
  padding: 10px 16px;
  color: var(--bg-primary);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 760px) {
  .fw-filter-stack-body {
    grid-template-columns: 1fr;
  }

  .fw-filter-stack-nav {
    display: flex;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .fw-filter-stack-nav-button {
    width: auto;
    min-width: max-content;
  }
}
`;

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function groupKicker(label: string) {
  switch (label) {
    case "Mood":
      return "Start with the emotional read of the scene.";
    case "Genre":
      return "Narrow the musical lane without overthinking it.";
    case "Instruments":
      return "Choose the palette and texture you want in the cut.";
    case "Vocals":
      return "Control whether the cue sits behind dialogue or carries a voice.";
    case "Build":
      return "Shape how much the cue moves or develops.";
    case "Cue Points":
      return "Find tracks with useful moments for edits and transitions.";
    default:
      return "Refine the library around this dimension.";
  }
}

function sectionTitle(label: string) {
  if (label === "Mood") return "Scene Feel";
  if (label === "Instruments") return "Instrumentation";
  if (label === "Build") return "Energy";
  if (label === "Cue Points") return "Edit Points";
  return label;
}

function OptionButton({
  selected,
  onClick,
  children,
  detail,
}: {
  selected?: boolean;
  onClick: () => void;
  children: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`fw-filter-stack-option${selected ? " is-selected" : ""}`}
      onClick={onClick}
    >
      <span className="fw-filter-stack-option-main">{children}</span>
      {detail ? <span className="fw-filter-stack-option-detail">{detail}</span> : null}
    </button>
  );
}

const BPM_MIN = 1;
const BPM_MAX = 300;

const TEMPO_RANGES = [
  { label: "Slow Burn", detail: "1-85 BPM", low: 1, high: 85 },
  { label: "Mid Tempo", detail: "86-120 BPM", low: 86, high: 120 },
  { label: "Driving", detail: "121-160 BPM", low: 121, high: 160 },
  { label: "High Energy", detail: "161-300 BPM", low: 161, high: 300 },
];

const TEMPO_EXACT = [80, 105, 120, 140];

const LENGTH_OPTIONS = [
  { label: "Short", detail: "0:00 - 1:00", value: "0:00 - 1:00" },
  { label: "Quick", detail: "1:00 - 2:00", value: "1:00 - 2:00" },
  { label: "Standard", detail: "2:00 - 3:00", value: "2:00 - 3:00" },
  { label: "Long", detail: "3:00 - 4:00", value: "3:00 - 4:00" },
  { label: "Extended", detail: "4:00+", value: "4:00+" },
];

const KEY_NOTES = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];

function sameTempoRange(value: FilmwaveBpmFilterValue | null, low: number, high: number) {
  return value?.mode === "range" && value.low === low && value.high === high;
}

function sameTempoExact(value: FilmwaveBpmFilterValue | null, exact: number) {
  return value?.mode === "exact" && value.exact === exact;
}

export function MusicFilterPanel({
  open,
  groups,
  playlists = [],
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
  const [activeSectionId, setActiveSectionId] = useState("mood");

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const sections = useMemo<FilterSection[]>(() => {
    const nextSections: FilterSection[] = groups.map((group) => ({
      id: group.id,
      title: sectionTitle(group.label),
      kicker: groupKicker(group.label),
      count: group.selected.length,
      content: (
        <div className="fw-filter-stack-option-grid">
          {group.options.map((option) => (
            <OptionButton
              key={option}
              selected={group.selected.includes(option)}
              onClick={() => group.onToggle(option)}
            >
              {option}
            </OptionButton>
          ))}
        </div>
      ),
    }));

    if (onBpmChange) {
      nextSections.push({
        id: "tempo",
        title: "Tempo",
        kicker: "Use broad pacing first, then exact BPM only when it matters.",
        count: bpmValue ? 1 : 0,
        content: (
          <div className="fw-filter-stack-panel-row">
            <div className="fw-filter-stack-subsection">
              <div className="fw-filter-stack-subsection-title">Pacing</div>
              <div className="fw-filter-stack-option-grid">
                {TEMPO_RANGES.map((range) => {
                  const selected = sameTempoRange(bpmValue, range.low, range.high);
                  return (
                    <OptionButton
                      key={range.label}
                      selected={selected}
                      detail={range.detail}
                      onClick={() =>
                        onBpmChange(
                          selected
                            ? null
                            : {
                                mode: "range",
                                low: range.low,
                                high: range.high,
                                exact: BPM_MIN,
                              },
                        )
                      }
                    >
                      {range.label}
                    </OptionButton>
                  );
                })}
              </div>
            </div>

            <div className="fw-filter-stack-subsection">
              <div className="fw-filter-stack-subsection-title">Exact BPM</div>
              <div className="fw-filter-stack-option-grid is-compact">
                {TEMPO_EXACT.map((exact) => {
                  const selected = sameTempoExact(bpmValue, exact);
                  return (
                    <OptionButton
                      key={exact}
                      selected={selected}
                      onClick={() =>
                        onBpmChange(
                          selected
                            ? null
                            : {
                                mode: "exact",
                                low: BPM_MIN,
                                high: BPM_MAX,
                                exact,
                              },
                        )
                      }
                    >
                      {exact}
                    </OptionButton>
                  );
                })}
              </div>
            </div>
          </div>
        ),
      });
    }

    if (onKeyChange) {
      const note = keyValue?.note || null;
      const scale = keyValue?.scale ?? null;
      const emitKey = (nextNote: string | null, nextScale: "major" | "minor" | null) => {
        if (!nextNote && !nextScale) {
          onKeyChange(null);
          return;
        }
        onKeyChange({ note: nextNote ?? "", scale: nextScale });
      };

      nextSections.push({
        id: "key",
        title: "Key",
        kicker: "Use exact key, scale only, or both.",
        count: keyValue ? 1 : 0,
        content: (
          <div className="fw-filter-stack-panel-row">
            <div className="fw-filter-stack-subsection">
              <div className="fw-filter-stack-subsection-title">Note</div>
              <div className="fw-filter-stack-option-grid is-compact">
                {KEY_NOTES.map((keyNote) => (
                  <OptionButton
                    key={keyNote}
                    selected={note === keyNote}
                    onClick={() => emitKey(note === keyNote ? null : keyNote, scale)}
                  >
                    {keyNote}
                  </OptionButton>
                ))}
              </div>
            </div>

            <div className="fw-filter-stack-subsection">
              <div className="fw-filter-stack-subsection-title">Scale</div>
              <div className="fw-filter-stack-option-grid is-compact">
                {(["major", "minor"] as const).map((scaleMode) => (
                  <OptionButton
                    key={scaleMode}
                    selected={scale === scaleMode}
                    onClick={() => emitKey(note, scale === scaleMode ? null : scaleMode)}
                  >
                    {scaleMode === "major" ? "Major" : "Minor"}
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>
        ),
      });
    }

    if (onDurationsChange) {
      nextSections.push({
        id: "length",
        title: "Length",
        kicker: "Choose the shape of the cue before digging into individual tracks.",
        count: selectedDurations.length > 0 ? 1 : 0,
        content: (
          <div className="fw-filter-stack-option-grid">
            {LENGTH_OPTIONS.map((option) => {
              const selected = selectedDurations.includes(option.value);
              return (
                <OptionButton
                  key={option.value}
                  selected={selected}
                  detail={option.detail}
                  onClick={() => onDurationsChange(selected ? [] : [option.value])}
                >
                  {option.label}
                </OptionButton>
              );
            })}
          </div>
        ),
      });
    }

    if (onSelectPlaylist) {
      nextSections.push({
        id: "playlist",
        title: "Playlist",
        kicker: "Filter the library through one of your saved playlists.",
        count: selectedPlaylistId ? 1 : 0,
        content: playlistsLoading ? (
          <div className="fw-filter-stack-empty">Loading playlists…</div>
        ) : playlists.length === 0 ? (
          <div className="fw-filter-stack-empty">No playlists yet.</div>
        ) : (
          <div className="fw-filter-stack-option-grid">
            {playlists.map((playlist) => {
              const selected = selectedPlaylistId === playlist.id;
              return (
                <OptionButton
                  key={playlist.id}
                  selected={selected}
                  onClick={() => onSelectPlaylist(selected ? null : playlist)}
                >
                  {playlist.name}
                </OptionButton>
              );
            })}
          </div>
        ),
      });
    }

    if (onToggleMarkers) {
      nextSections.push({
        id: "display",
        title: "Display",
        kicker: "Control helper overlays without changing the filter result.",
        count: markersActive ? 1 : 0,
        content: (
          <div className="fw-filter-stack-option-grid">
            <button
              type="button"
              disabled={markersDisabled}
              aria-pressed={markersActive}
              className={`fw-filter-stack-option${markersActive ? " is-selected" : ""}`}
              onClick={onToggleMarkers}
            >
              <span className="fw-filter-stack-option-main">Cue markers</span>
              <span className="fw-filter-stack-option-detail">Show edit points on waveform rows</span>
            </button>
          </div>
        ),
      });
    }

    return nextSections;
  }, [
    bpmValue,
    groups,
    keyValue,
    markersActive,
    markersDisabled,
    onBpmChange,
    onDurationsChange,
    onKeyChange,
    onSelectPlaylist,
    onToggleMarkers,
    playlists,
    playlistsLoading,
    selectedDurations,
    selectedPlaylistId,
  ]);

  useEffect(() => {
    if (!open || sections.length === 0) return;
    if (!sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, open, sections]);

  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const activeCount = sections
    .filter((section) => section.id !== "display")
    .reduce((total, section) => total + section.count, 0);

  return (
    <div className={`fw-filter-panel-wrap${open ? " is-open" : ""}`} aria-hidden={!open}>
      <style>{FILTER_STACK_CSS}</style>
      <div className="fw-filter-panel-reveal">
        <div className="fw-filter-stack-panel">
          <div className="fw-filter-stack-head">
            <div>
              <h2 className="fw-filter-stack-title">Filters</h2>
              <div className="fw-filter-stack-subtitle">
                Build the search like a scene brief: feel, energy, voice, texture, tempo.
              </div>
            </div>
            <div className="fw-filter-stack-head-actions">
              <div className="fw-filter-stack-count">
                {activeCount === 1 ? "1 active" : `${activeCount} active`}
              </div>
              <button
                type="button"
                className="fw-filter-stack-close"
                aria-label="Close filters"
                onClick={onClose}
              >
                <XIcon />
              </button>
            </div>
          </div>

          <div className="fw-filter-stack-body">
            <div className="fw-filter-stack-nav" role="tablist" aria-label="Filter sections">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSection?.id === section.id}
                  className={`fw-filter-stack-nav-button${activeSection?.id === section.id ? " is-active" : ""}`}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  <span>{section.title}</span>
                  {section.count > 0 && (
                    <span className="fw-filter-stack-nav-count">{section.count}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="fw-filter-stack-main" role="tabpanel">
              {activeSection ? (
                <>
                  <div className="fw-filter-stack-section-head">
                    <div>
                      <h3 className="fw-filter-stack-section-title">{activeSection.title}</h3>
                      <div className="fw-filter-stack-section-kicker">{activeSection.kicker}</div>
                    </div>
                  </div>
                  {activeSection.content}
                </>
              ) : (
                <div className="fw-filter-stack-empty">No filters available.</div>
              )}
            </div>
          </div>

          <div className="fw-filter-stack-footer">
            <button
              type="button"
              className="fw-filter-stack-clear"
              disabled={!hasActive || !onClearAll}
              onClick={onClearAll}
            >
              Clear all
            </button>
            <button type="button" className="fw-filter-stack-apply" onClick={onClose}>
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
