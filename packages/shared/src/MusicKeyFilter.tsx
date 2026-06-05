"use client";

import { useEffect, useRef, useState } from "react";
import type { FilmwaveKeyFilterValue } from "./music";
import { FilterPopover } from "./FilterPopover";

type AccidentalMode = "sharp" | "flat";
type ScaleMode = "major" | "minor" | null;

type MusicKeyFilterProps = {
  value: FilmwaveKeyFilterValue | null;
  onChange: (value: FilmwaveKeyFilterValue | null) => void;
};

const SHARP_ACCIDENTALS = ["C#", "D#", null, "F#", "G#", "A#"];
const FLAT_ACCIDENTALS = ["Db", "Eb", null, "Gb", "Ab", "Bb"];
const NATURALS = ["C", "D", "E", "F", "G", "A", "B"];

function getAccidentalModeFromNote(note: string | null): AccidentalMode {
  if (!note) return "sharp";
  if (note.includes("b")) return "flat";
  return "sharp";
}

function formatScaleLabel(scale: ScaleMode) {
  if (!scale) return "";
  return scale === "major" ? "Maj" : "Min";
}

function FilterChevron() {
  return (
    <svg
      className="filmwave-filter-trigger-chevron"
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1.5 3L4 5.5L6.5 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MusicKeyFilter({ value, onChange }: MusicKeyFilterProps) {
  const [open, setOpen] = useState(false);
  const [accidental, setAccidental] = useState<AccidentalMode>(
    getAccidentalModeFromNote(value?.note ?? null),
  );
  const [selectedNote, setSelectedNote] = useState<string | null>(
    value?.note ?? null,
  );
  const [scaleMode, setScaleMode] = useState<ScaleMode>(value?.scale ?? null);

  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedNote(value?.note ?? null);
    setScaleMode(value?.scale ?? null);

    if (value?.note) {
      setAccidental(getAccidentalModeFromNote(value.note));
    }
  }, [value]);

  function selectNote(note: string) {
    const nextNote = selectedNote === note ? null : note;

    setSelectedNote(nextNote);

    if (nextNote) {
      onChange({ note: nextNote, scale: scaleMode });
      return;
    }

    onChange(null);
  }

  function toggleScale(nextScale: "major" | "minor") {
    const next = scaleMode === nextScale ? null : nextScale;

    setScaleMode(next);

    if (selectedNote) {
      onChange({ note: selectedNote, scale: next });
    }
  }

  function clear() {
    setSelectedNote(null);
    setScaleMode(null);
    onChange(null);
  }

  const accidentals =
    accidental === "sharp" ? SHARP_ACCIDENTALS : FLAT_ACCIDENTALS;
  const hasActive = value !== null;
  const activeLabel = value
    ? [value.note, formatScaleLabel(value.scale)].filter(Boolean).join(" ")
    : null;

  return (
    <div ref={ref} className="filmwave-filter-popover-wrap">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`filmwave-filter-trigger${hasActive ? " is-active" : ""}${
          open ? " is-open" : ""
        }`}
        aria-expanded={open}
      >
        <span>Key</span>
        {hasActive && (
          <span className="filmwave-filter-trigger-active-label">
            {activeLabel}
          </span>
        )}
        <FilterChevron />
      </button>

      <FilterPopover open={open} triggerRef={triggerRef} width={300} className="filmwave-filter-panel">
        <div className="filmwave-filter-dropdown-header">
          <div className="filmwave-filter-dropdown-title">Key</div>
          {hasActive && (
            <button type="button" onClick={clear} className="filmwave-filter-clear-button">
              Clear
            </button>
          )}
        </div>

        <div className="filmwave-filter-body">
          <div className="filmwave-filter-segment-wrap is-two">
            {(["sharp", "flat"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAccidental(mode)}
                className={`filmwave-filter-segment-button${
                  accidental === mode ? " is-active" : ""
                }`}
              >
                {mode === "sharp" ? "Sharp" : "Flat"}
              </button>
            ))}
          </div>

          <div className="filmwave-key-grid-wrap">
            <div className="filmwave-key-grid is-accidental">
              {accidentals.map((note, index) =>
                note === null ? (
                  <div key={`spacer-${index}`} className="filmwave-key-spacer" />
                ) : (
                  <button
                    key={note}
                    type="button"
                    onClick={() => selectNote(note)}
                    className={`filmwave-key-button${selectedNote === note ? " is-active" : ""}`}
                  >
                    {note}
                  </button>
                ),
              )}
            </div>

            <div className="filmwave-key-grid">
              {NATURALS.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => selectNote(note)}
                  className={`filmwave-key-button${selectedNote === note ? " is-active" : ""}`}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          <div className="filmwave-key-scale-grid">
            {(["major", "minor"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => toggleScale(mode)}
                className={`filmwave-key-scale-button${scaleMode === mode ? " is-active" : ""}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </FilterPopover>
    </div>
  );
}
