"use client";

import { useEffect, useRef, useState } from "react";
import type { FilmwaveBpmFilterValue } from "./music";
import { FilterPopover } from "./FilterPopover";
import { FilterTrigger } from "./FilterTrigger";

type Mode = "range" | "exact";

type MusicBpmFilterProps = {
  value: FilmwaveBpmFilterValue | null;
  onChange: (value: FilmwaveBpmFilterValue | null) => void;
};

const MIN = 1;
const MAX = 300;
const PRESETS = [80, 105, 120, 140];

function formatBpmLabel(value: FilmwaveBpmFilterValue): string {
  if (value.mode === "exact") return `${value.exact}`;
  return `${value.low}–${value.high}`;
}

export function MusicBpmFilter({ value, onChange }: MusicBpmFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(value?.mode || "range");
  const [low, setLow] = useState(value?.low || MIN);
  const [high, setHigh] = useState(value?.high || MAX);
  const [exact, setExact] = useState(value?.exact || MIN);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>(mode);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  const exactRef = useRef(exact);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { lowRef.current = low; }, [low]);
  useEffect(() => { highRef.current = high; }, [high]);
  useEffect(() => { exactRef.current = exact; }, [exact]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    return fromPercent(pct);
  }

  function emitChange(nextMode = modeRef.current, nextLow = lowRef.current, nextHigh = highRef.current, nextExact = exactRef.current) {
    if (nextMode === "range" && (nextLow !== MIN || nextHigh !== MAX)) {
      onChange({ mode: nextMode, low: nextLow, high: nextHigh, exact: nextExact });
      return;
    }
    if (nextMode === "exact" && nextExact !== MIN) {
      onChange({ mode: nextMode, low: nextLow, high: nextHigh, exact: nextExact });
      return;
    }
    onChange(null);
  }

  function startDrag(handle: "low" | "high" | "exact") {
    function onMove(e: MouseEvent) {
      const val = getValueFromMouse(e);
      if (handle === "low") {
        const nextLow = Math.min(val, highRef.current - 1);
        lowRef.current = nextLow; setLow(nextLow);
        emitChange(modeRef.current, nextLow, highRef.current, exactRef.current);
        return;
      }
      if (handle === "high") {
        const nextHigh = Math.max(val, lowRef.current + 1);
        highRef.current = nextHigh; setHigh(nextHigh);
        emitChange(modeRef.current, lowRef.current, nextHigh, exactRef.current);
        return;
      }
      exactRef.current = val; setExact(val);
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
    setLow(MIN); setHigh(MAX); setExact(MIN);
    lowRef.current = MIN; highRef.current = MAX; exactRef.current = MIN;
    onChange(null);
  }

  function applyRangeLow(nextLow: number) {
    const cleaned = Math.min(Math.max(nextLow, MIN), highRef.current - 1);
    setLow(cleaned); lowRef.current = cleaned;
    emitChange("range", cleaned, highRef.current, exactRef.current);
  }

  function applyRangeHigh(nextHigh: number) {
    const cleaned = Math.max(Math.min(nextHigh, MAX), lowRef.current + 1);
    setHigh(cleaned); highRef.current = cleaned;
    emitChange("range", lowRef.current, cleaned, exactRef.current);
  }

  function applyExact(nextExact: number) {
    const cleaned = Math.min(Math.max(nextExact, MIN), MAX);
    setExact(cleaned); exactRef.current = cleaned;
    emitChange("exact", lowRef.current, highRef.current, cleaned);
  }

  const hasActive = value !== null;
  const activeStart = mode === "range" ? toPercent(low) : 0;
  const activeEnd = mode === "range" ? toPercent(high) : toPercent(exact);

  return (
    <div ref={ref} className="filmwave-filter-popover-wrap">
      <FilterTrigger
        buttonRef={triggerRef}
        label="BPM"
        activeLabel={hasActive ? formatBpmLabel(value) : undefined}
        active={hasActive}
        open={open}
        onClick={() => setOpen((current) => !current)}
        onClear={hasActive ? clear : undefined}
      />
      <FilterPopover open={open} triggerRef={triggerRef} width={300} className="filmwave-filter-panel">
        <div className="filmwave-filter-dropdown-header">
          <div className="filmwave-filter-dropdown-title">BPM</div>
          {hasActive && <button type="button" onClick={clear} className="filmwave-filter-clear-button">Clear</button>}
        </div>
        <div className="filmwave-filter-body">
          <div className="filmwave-filter-segment-wrap is-two">
            <button type="button" onClick={() => { setMode("range"); modeRef.current = "range"; emitChange("range", lowRef.current, highRef.current, exactRef.current); }} className={`filmwave-filter-segment-button${mode === "range" ? " is-active" : ""}`}>Range</button>
            <button type="button" onClick={() => { setMode("exact"); modeRef.current = "exact"; emitChange("exact", lowRef.current, highRef.current, exactRef.current); }} className={`filmwave-filter-segment-button${mode === "exact" ? " is-active" : ""}`}>Exact</button>
          </div>
          <div className="filmwave-filter-field-grid">
            {mode === "range" ? (
              <div className="filmwave-filter-two-col">
                <label><div className="filmwave-filter-field-label">Low</div><input type="number" min={MIN} max={MAX} value={low} onChange={(e) => setLow(Number(e.target.value))} onBlur={() => applyRangeLow(low)} className="filmwave-filter-input" /></label>
                <label><div className="filmwave-filter-field-label">High</div><input type="number" min={MIN} max={MAX} value={high} onChange={(e) => setHigh(Number(e.target.value))} onBlur={() => applyRangeHigh(high)} className="filmwave-filter-input" /></label>
              </div>
            ) : (
              <label><div className="filmwave-filter-field-label">Exact BPM</div><input type="number" min={MIN} max={MAX} value={exact} onChange={(e) => setExact(Number(e.target.value))} onBlur={() => applyExact(exact)} className="filmwave-filter-input" /></label>
            )}
          </div>
          <div className="filmwave-filter-range-area">
            <div ref={rangeRef} className="filmwave-filter-range-track" onClick={(e) => { if (modeRef.current === "exact") { const nextExact = getValueFromMouse(e); setExact(nextExact); exactRef.current = nextExact; emitChange("exact", lowRef.current, highRef.current, nextExact); } }}>
              <div className="filmwave-filter-range-fill" style={{ left: `${activeStart}%`, width: `${Math.max(0, activeEnd - activeStart)}%` }} />
              {mode === "range" ? (["low", "high"] as const).map((handle) => (
                <div key={handle} className="filmwave-filter-range-handle" style={{ left: `${toPercent(handle === "low" ? low : high)}%` }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag(handle); }} />
              )) : (
                <div className="filmwave-filter-range-handle" style={{ left: `${toPercent(exact)}%` }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag("exact"); }} />
              )}
            </div>
            <div className="filmwave-filter-range-labels"><span>{MIN}</span><span>{MAX}</span></div>
          </div>
          <div className="filmwave-filter-preset-grid is-four">
            {PRESETS.map((preset) => {
              const isSelected = value?.mode === "exact" && value.exact === preset;
              return <button key={preset} type="button" onClick={() => { if (isSelected) { setExact(MIN); exactRef.current = MIN; onChange(null); return; } setMode("exact"); modeRef.current = "exact"; setExact(preset); exactRef.current = preset; emitChange("exact", lowRef.current, highRef.current, preset); }} className={`filmwave-filter-segment-button${isSelected ? " is-active" : ""}`}>{preset}</button>;
            })}
          </div>
        </div>
      </FilterPopover>
    </div>
  );
}
