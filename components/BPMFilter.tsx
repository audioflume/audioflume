"use client";

import { useEffect, useRef, useState } from "react";
import {
  filterClearButtonClass,
  filterDropdownHeaderClass,
  filterDropdownTitleClass,
  filterInputClass,
  filterSegmentButtonActiveClass,
  filterSegmentButtonClass,
  filterSegmentButtonInactiveClass,
  filterSegmentWrapClass,
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";

type Mode = "range" | "exact";

type BPMFilterProps = {
  value: { mode: Mode; low: number; high: number; exact: number } | null;
  onChange: (
    value: { mode: Mode; low: number; high: number; exact: number } | null,
  ) => void;
};

const MIN = 1;
const MAX = 300;
const PRESETS = [80, 105, 120, 140];

export default function BPMFilter({ value, onChange }: BPMFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(value?.mode || "range");
  const [low, setLow] = useState(value?.low || MIN);
  const [high, setHigh] = useState(value?.high || MAX);
  const [exact, setExact] = useState(value?.exact || MIN);

  const ref = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);

  const modeRef = useRef<Mode>(mode);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  const exactRef = useRef(exact);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    lowRef.current = low;
  }, [low]);

  useEffect(() => {
    highRef.current = high;
  }, [high]);

  useEffect(() => {
    exactRef.current = exact;
  }, [exact]);

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
    if (!value) return;

    setMode(value.mode);
    setLow(value.low);
    setHigh(value.high);
    setExact(value.exact);
  }, [value]);

  function toPercent(val: number) {
    return ((val - MIN) / (MAX - MIN)) * 100;
  }

  function fromPercent(pct: number) {
    return Math.round(MIN + (pct / 100) * (MAX - MIN));
  }

  function getValueFromMouse(e: MouseEvent | React.MouseEvent) {
    if (!rangeRef.current) return MIN;

    const rect = rangeRef.current.getBoundingClientRect();
    const pct = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
    );

    return fromPercent(pct);
  }

  function emitChange(
    nextMode = modeRef.current,
    nextLow = lowRef.current,
    nextHigh = highRef.current,
    nextExact = exactRef.current,
  ) {
    if (nextMode === "range" && (nextLow !== MIN || nextHigh !== MAX)) {
      onChange({
        mode: nextMode,
        low: nextLow,
        high: nextHigh,
        exact: nextExact,
      });

      return;
    }

    if (nextMode === "exact" && nextExact !== MIN) {
      onChange({
        mode: nextMode,
        low: nextLow,
        high: nextHigh,
        exact: nextExact,
      });

      return;
    }

    onChange(null);
  }

  function startDrag(handle: "low" | "high" | "exact") {
    function onMove(e: MouseEvent) {
      const val = getValueFromMouse(e);

      if (handle === "low") {
        const nextLow = Math.min(val, highRef.current - 1);

        lowRef.current = nextLow;
        setLow(nextLow);
        emitChange(modeRef.current, nextLow, highRef.current, exactRef.current);

        return;
      }

      if (handle === "high") {
        const nextHigh = Math.max(val, lowRef.current + 1);

        highRef.current = nextHigh;
        setHigh(nextHigh);
        emitChange(modeRef.current, lowRef.current, nextHigh, exactRef.current);

        return;
      }

      exactRef.current = val;
      setExact(val);
      emitChange(modeRef.current, lowRef.current, highRef.current, val);
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
    setExact(MIN);
    lowRef.current = MIN;
    highRef.current = MAX;
    exactRef.current = MIN;
    onChange(null);
  }

  function applyRangeLow(nextLow: number) {
    const cleaned = Math.min(Math.max(nextLow, MIN), highRef.current - 1);

    setLow(cleaned);
    lowRef.current = cleaned;
    emitChange("range", cleaned, highRef.current, exactRef.current);
  }

  function applyRangeHigh(nextHigh: number) {
    const cleaned = Math.max(Math.min(nextHigh, MAX), lowRef.current + 1);

    setHigh(cleaned);
    highRef.current = cleaned;
    emitChange("range", lowRef.current, cleaned, exactRef.current);
  }

  function applyExact(nextExact: number) {
    const cleaned = Math.min(Math.max(nextExact, MIN), MAX);

    setExact(cleaned);
    exactRef.current = cleaned;
    emitChange("exact", lowRef.current, highRef.current, cleaned);
  }

  function setRangeMode() {
    setMode("range");
    modeRef.current = "range";
    emitChange("range", lowRef.current, highRef.current, exactRef.current);
  }

  function setExactMode() {
    setMode("exact");
    modeRef.current = "exact";
    emitChange("exact", lowRef.current, highRef.current, exactRef.current);
  }

  const hasActive = value !== null;
  const activeLabel = value
    ? value.mode === "exact"
      ? `${value.exact}`
      : `${value.low}–${value.high}`
    : null;

  const activeStart = mode === "range" ? toPercent(low) : 0;
  const activeEnd = mode === "range" ? toPercent(high) : toPercent(exact);

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
        <span>BPM</span>

        {hasActive && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10px] font-medium text-[var(--text-primary)]">
            {activeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-ui)]">
          <div className={filterDropdownHeaderClass}>
            <div className={filterDropdownTitleClass}>BPM</div>

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
              <button
                type="button"
                onClick={setRangeMode}
                className={`${filterSegmentButtonClass} ${
                  mode === "range"
                    ? filterSegmentButtonActiveClass
                    : filterSegmentButtonInactiveClass
                }`}
              >
                Range
              </button>

              <button
                type="button"
                onClick={setExactMode}
                className={`${filterSegmentButtonClass} ${
                  mode === "exact"
                    ? filterSegmentButtonActiveClass
                    : filterSegmentButtonInactiveClass
                }`}
              >
                Exact
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {mode === "range" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Low
                    </div>

                    <input
                      type="number"
                      min={MIN}
                      max={MAX}
                      value={low}
                      onChange={(e) => setLow(Number(e.target.value))}
                      onBlur={() => applyRangeLow(low)}
                      className={`${filterInputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    />
                  </label>

                  <label>
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      High
                    </div>

                    <input
                      type="number"
                      min={MIN}
                      max={MAX}
                      value={high}
                      onChange={(e) => setHigh(Number(e.target.value))}
                      onBlur={() => applyRangeHigh(high)}
                      className={`${filterInputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    />
                  </label>
                </div>
              ) : (
                <label>
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Exact BPM
                  </div>

                  <input
                    type="number"
                    min={MIN}
                    max={MAX}
                    value={exact}
                    onChange={(e) => setExact(Number(e.target.value))}
                    onBlur={() => applyExact(exact)}
                    className={`${filterInputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  />
                </label>
              )}
            </div>

            <div className="mt-5 px-1">
              <div
                ref={rangeRef}
                className="relative h-[3px] cursor-pointer rounded-full bg-[var(--bg-tertiary)]"
                onClick={(e) => {
                  if (modeRef.current === "exact") {
                    const nextExact = getValueFromMouse(e);

                    setExact(nextExact);
                    exactRef.current = nextExact;
                    emitChange(
                      "exact",
                      lowRef.current,
                      highRef.current,
                      nextExact,
                    );
                  }
                }}
              >
                <div
                  className="absolute top-0 h-full rounded-full bg-[var(--text-primary)]"
                  style={{
                    left: `${activeStart}%`,
                    width: `${Math.max(0, activeEnd - activeStart)}%`,
                  }}
                />

                {mode === "range" ? (
                  <>
                    {(["low", "high"] as const).map((handle) => (
                      <div
                        key={handle}
                        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--text-primary)] shadow-sm active:cursor-grabbing"
                        style={{
                          left: `${toPercent(handle === "low" ? low : high)}%`,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startDrag(handle);
                        }}
                      />
                    ))}
                  </>
                ) : (
                  <div
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--text-primary)] shadow-sm active:cursor-grabbing"
                    style={{
                      left: `${toPercent(exact)}%`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startDrag("exact");
                    }}
                  />
                )}
              </div>

              <div className="mt-3 flex justify-between text-[10px] font-medium text-[var(--text-muted)]">
                <span>{MIN}</span>
                <span>{MAX}</span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {PRESETS.map((preset) => {
                const isSelected =
                  value?.mode === "exact" && value.exact === preset;

                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setExact(MIN);
                        exactRef.current = MIN;
                        onChange(null);
                        return;
                      }

                      setMode("exact");
                      modeRef.current = "exact";
                      setExact(preset);
                      exactRef.current = preset;
                      emitChange(
                        "exact",
                        lowRef.current,
                        highRef.current,
                        preset,
                      );
                    }}
                    className={`${filterSegmentButtonClass} ${
                      isSelected
                        ? filterSegmentButtonActiveClass
                        : `bg-[var(--bg-primary)] ${filterSegmentButtonInactiveClass}`
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
