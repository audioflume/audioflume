"use client";

import { useEffect, useRef, useState } from "react";
import FilterPopover from "@/components/FilterPopover";
import {
  filterClearButtonClass,
  filterDropdownHeaderClass,
  filterDropdownTitleClass,
  filterIntentButtonActiveClass,
  filterIntentButtonInactiveClass,
  filterSummaryClass,
  filterSummaryLabelClass,
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";

type DurationFilterProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

const MIN = 0;
const MAX = 300;

const INTENTS = [
  { title: "Short", detail: "< 1:00", low: 0, high: 60 },
  { title: "Quick", detail: "1–2min", low: 60, high: 120 },
  { title: "Standard", detail: "2–3min", low: 120, high: 180 },
  { title: "Long", detail: "3–4min", low: 180, high: 240 },
  { title: "Extended", detail: "4:00+", low: 240, high: 300 },
];

function formatTime(seconds: number) {
  const cleanSeconds = Math.max(MIN, Math.min(MAX, Math.round(seconds)));
  const mins = Math.floor(cleanSeconds / 60);
  const secs = cleanSeconds % 60;

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const [minutes = "0", seconds = "0"] = value.split(":");

  return Number(minutes) * 60 + Number(seconds);
}

function formatDurationLabel(low: number, high: number) {
  if (low === 0 && high === 60) return "0:00 - 1:00";
  if (low === 60 && high === 120) return "1:00 - 2:00";
  if (low === 120 && high === 180) return "2:00 - 3:00";
  if (low === 180 && high === 240) return "3:00 - 4:00";
  if (low === 240 && high === 300) return "4:00+";

  if (high === MAX) return `${formatTime(low)}+`;

  return `${formatTime(low)} - ${formatTime(high)}`;
}

function parseSelectedDuration(selected: string[]) {
  const first = selected[0];

  if (!first) return { low: MIN, high: MAX };

  if (first === "0:00 - 1:00") return { low: 0, high: 60 };
  if (first === "1:00 - 2:00") return { low: 60, high: 120 };
  if (first === "2:00 - 3:00") return { low: 120, high: 180 };
  if (first === "3:00 - 4:00") return { low: 180, high: 240 };
  if (first === "4:00+") return { low: 240, high: 300 };

  if (first.endsWith("+")) {
    return { low: parseTime(first.replace("+", "")), high: MAX };
  }

  if (first.includes(" - ")) {
    const [lowValue, highValue] = first.split(" - ");

    return { low: parseTime(lowValue), high: parseTime(highValue) };
  }

  return { low: MIN, high: MAX };
}

export default function DurationFilter({ selected, onChange }: DurationFilterProps) {
  const [open, setOpen] = useState(false);
  const initial = parseSelectedDuration(selected);
  const [low, setLow] = useState(initial.low);
  const [high, setHigh] = useState(initial.high);

  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const lowRef = useRef(low);
  const highRef = useRef(high);

  useEffect(() => {
    lowRef.current = low;
  }, [low]);

  useEffect(() => {
    highRef.current = high;
  }, [high]);

  useEffect(() => {
    const next = parseSelectedDuration(selected);

    setLow(next.low);
    setHigh(next.high);
    lowRef.current = next.low;
    highRef.current = next.high;
  }, [selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toPercent(value: number) {
    return ((value - MIN) / (MAX - MIN)) * 100;
  }

  function fromPercent(percent: number) {
    return Math.round(MIN + (percent / 100) * (MAX - MIN));
  }

  function getValueFromMouse(e: MouseEvent | React.MouseEvent) {
    if (!rangeRef.current) return MIN;

    const rect = rangeRef.current.getBoundingClientRect();
    const percent = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
    );

    return fromPercent(percent);
  }

  function emitChange(nextLow = lowRef.current, nextHigh = highRef.current) {
    if (nextLow === MIN && nextHigh === MAX) {
      onChange([]);
      return;
    }

    onChange([formatDurationLabel(nextLow, nextHigh)]);
  }

  function startDrag(handle: "low" | "high") {
    function onMove(e: MouseEvent) {
      const value = getValueFromMouse(e);

      if (handle === "low") {
        const nextLow = Math.min(value, highRef.current - 5);

        lowRef.current = nextLow;
        setLow(nextLow);
        emitChange(nextLow, highRef.current);
        return;
      }

      const nextHigh = Math.max(value, lowRef.current + 5);

      highRef.current = nextHigh;
      setHigh(nextHigh);
      emitChange(lowRef.current, nextHigh);
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      emitChange();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function clear() {
    setLow(MIN);
    setHigh(MAX);
    lowRef.current = MIN;
    highRef.current = MAX;
    onChange([]);
  }

  function applyIntent(nextLow: number, nextHigh: number) {
    setLow(nextLow);
    setHigh(nextHigh);
    lowRef.current = nextLow;
    highRef.current = nextHigh;
    emitChange(nextLow, nextHigh);
  }

  const hasActive = selected.length > 0;
  const activeLabel = hasActive ? selected[0] : null;
  const activeStart = toPercent(low);
  const activeEnd = toPercent(high);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${filterTriggerBaseClass} ${
          hasActive ? filterTriggerActiveClass : filterTriggerInactiveClass
        } ${open ? "is-open" : ""}`}
      >
        <span>Duration</span>

        {hasActive && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10px] font-medium text-[var(--text-primary)]">
            {activeLabel}
          </span>
        )}
      </button>

      <FilterPopover
        open={open}
        triggerRef={triggerRef}
        width={320}
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-ui)]"
      >
        <div className={filterDropdownHeaderClass}>
          <div className={filterDropdownTitleClass}>Duration</div>

          {hasActive && (
            <button type="button" onClick={clear} className={filterClearButtonClass}>
              Clear
            </button>
          )}
        </div>

        <div className="p-3">
          <div className={filterSummaryClass}>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              {formatTime(low)}
            </span>
            <span className={filterSummaryLabelClass}>Range</span>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              {high === MAX ? `${formatTime(high)}+` : formatTime(high)}
            </span>
          </div>

          <div className="mt-5 px-1">
            <div ref={rangeRef} className="relative h-[3px] cursor-pointer rounded-full bg-[var(--bg-tertiary)]">
              <div
                className="absolute top-0 h-full rounded-full bg-[var(--text-primary)]"
                style={{ left: `${activeStart}%`, width: `${Math.max(0, activeEnd - activeStart)}%` }}
              />
              {(["low", "high"] as const).map((handle) => (
                <div
                  key={handle}
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--text-primary)] shadow-sm active:cursor-grabbing"
                  style={{ left: `${toPercent(handle === "low" ? low : high)}%` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startDrag(handle);
                  }}
                />
              ))}
            </div>

            <div className="mt-3 flex justify-between text-[10px] font-medium text-[var(--text-muted)]">
              <span>0:00</span>
              <span>5:00+</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {INTENTS.map((intent) => {
              const isSelected = low === intent.low && high === intent.high;
              return (
                <button
                  key={intent.title}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      clear();
                      return;
                    }
                    applyIntent(intent.low, intent.high);
                  }}
                  className={`flex h-[54px] flex-col items-start justify-center rounded-lg px-2 text-left transition ${
                    isSelected ? filterIntentButtonActiveClass : filterIntentButtonInactiveClass
                  }`}
                >
                  <span className="text-[10px] font-medium leading-none">{intent.title}</span>
                  <span className={`mt-1.5 text-[10px] leading-none ${isSelected ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>
                    {intent.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </FilterPopover>
    </div>
  );
}
