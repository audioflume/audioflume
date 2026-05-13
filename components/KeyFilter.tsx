"use client";

import { useEffect, useRef, useState } from "react";
import {
  filterClearButtonClass,
  filterDropdownHeaderClass,
  filterDropdownTitleClass,
  filterIntentButtonActiveClass,
  filterIntentButtonInactiveClass,
  filterSegmentButtonActiveClass,
  filterSegmentButtonClass,
  filterSegmentButtonInactiveClass,
  filterSegmentWrapClass,
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";

type AccidentalMode = "sharp" | "flat";
type ScaleMode = "major" | "minor" | null;

type KeyValue = {
  note: string;
  scale: ScaleMode;
} | null;

type KeyFilterProps = {
  value: KeyValue;
  onChange: (value: KeyValue) => void;
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

export default function KeyFilter({ value, onChange }: KeyFilterProps) {
  const [open, setOpen] = useState(false);
  const [accidental, setAccidental] = useState<AccidentalMode>(
    getAccidentalModeFromNote(value?.note ?? null),
  );
  const [selectedNote, setSelectedNote] = useState<string | null>(
    value?.note ?? null,
  );
  const [scaleMode, setScaleMode] = useState<ScaleMode>(value?.scale ?? null);

  const ref = useRef<HTMLDivElement>(null);

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
      onChange({
        note: nextNote,
        scale: scaleMode,
      });

      return;
    }

    onChange(null);
  }

  function toggleScale(nextScale: "major" | "minor") {
    const next = scaleMode === nextScale ? null : nextScale;

    setScaleMode(next);

    if (selectedNote) {
      onChange({
        note: selectedNote,
        scale: next,
      });
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`${filterTriggerBaseClass} ${
          open || hasActive
            ? filterTriggerActiveClass
            : filterTriggerInactiveClass
        }`}
      >
        <span>Key</span>

        {hasActive && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10px] font-medium text-[var(--text-primary)]">
            {activeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-ui)]">
          <div className={filterDropdownHeaderClass}>
            <div className={filterDropdownTitleClass}>Key</div>

            {hasActive && (
              <button
                type="button"
                onClick={clear}
                className={filterClearButtonClass}
              >
                Clear
              </button>
            )}
          </div>

          <div className="p-3">
            <div className={`${filterSegmentWrapClass} grid-cols-2 gap-1.5`}>
              {(["sharp", "flat"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAccidental(mode)}
                  className={`${filterSegmentButtonClass} capitalize ${
                    accidental === mode
                      ? filterSegmentButtonActiveClass
                      : filterSegmentButtonInactiveClass
                  }`}
                >
                  {mode === "sharp" ? "Sharp" : "Flat"}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <div className="grid translate-x-[18px] grid-cols-7 gap-1.5">
                {accidentals.map((note, index) =>
                  note === null ? (
                    <div key={`spacer-${index}`} className="h-8" />
                  ) : (
                    <button
                      key={note}
                      type="button"
                      onClick={() => selectNote(note)}
                      className={`flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                        selectedNote === note
                          ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                          : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {note}
                    </button>
                  ),
                )}
              </div>

              <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                {NATURALS.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => selectNote(note)}
                    className={`flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                      selectedNote === note
                        ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                        : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-[14px] grid grid-cols-2 gap-1.5">
              {(["major", "minor"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleScale(mode)}
                  className={`flex h-8 items-center justify-center rounded-lg border border-[var(--border)] text-xs font-medium capitalize transition-colors ${
                    scaleMode === mode
                      ? filterIntentButtonActiveClass
                      : filterIntentButtonInactiveClass
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
