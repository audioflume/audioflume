'use client'

import { useState, useRef, useEffect } from 'react'

type Mode = 'range' | 'exact'

type BPMFilterProps = {
  value: { mode: Mode; low: number; high: number; exact: number } | null
  onChange: (value: { mode: Mode; low: number; high: number; exact: number } | null) => void
}

const MIN = 1
const MAX = 300

export default function BPMFilter({ value, onChange }: BPMFilterProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('range')
  const [low, setLow] = useState(MIN)
  const [high, setHigh] = useState(MAX)
  const [exact, setExact] = useState(MIN)
  const ref = useRef<HTMLDivElement>(null)
  const rangeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toPercent(val: number) {
    return ((val - MIN) / (MAX - MIN)) * 100
  }

  function fromPercent(pct: number) {
    return Math.round(MIN + (pct / 100) * (MAX - MIN))
  }

  function getValueFromMouse(e: MouseEvent | React.MouseEvent) {
    if (!rangeRef.current) return MIN
    const rect = rangeRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    return fromPercent(pct)
  }

  function startDrag(handle: 'low' | 'high' | 'exact') {
    function onMove(e: MouseEvent) {
      const val = getValueFromMouse(e)
      if (handle === 'low') setLow(Math.min(val, high - 1))
      else if (handle === 'high') setHigh(Math.max(val, low + 1))
      else setExact(val)
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      emitChange()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function emitChange() {
    if (mode === 'range' && (low !== MIN || high !== MAX)) {
      onChange({ mode, low, high, exact })
    } else if (mode === 'exact' && exact !== MIN) {
      onChange({ mode, low, high, exact })
    } else {
      onChange(null)
    }
  }

  function clear() {
    setLow(MIN)
    setHigh(MAX)
    setExact(MIN)
    onChange(null)
  }

  const hasActive = value !== null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 cursor-pointer py-1 rounded-md border text-xs font-medium transition-colors ${hasActive ? 'pl-3 pr-2' : 'px-3'} border-[var(--border)] text-[var(--text-primary)] hover:opacity-70`}
      >
        BPM
        {hasActive && (
          <span className="w-1.75 h-1.75 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl z-50 p-4">
          {/* Mode toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-3 text-sm">
              <button
                onClick={() => setMode('range')}
                className={`transition-colors ${mode === 'range' ? 'text-[var(--text-primary)] underline underline-offset-4' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                Range
              </button>
              <button
                onClick={() => setMode('exact')}
                className={`transition-colors ${mode === 'exact' ? 'text-[var(--text-primary)] underline underline-offset-4' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                Exact
              </button>
            </div>

            {mode === 'range' ? (
              <div className="flex gap-2">
                {(['low', 'high'] as const).map((handle) => (
                  <div key={handle} className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-[var(--text-muted)]">{handle === 'low' ? 'Low' : 'High'}</span>
                    <input
                      type="number"
                      min={MIN}
                      max={MAX}
                      value={handle === 'low' ? low : high}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (handle === 'low') setLow(Math.min(v, high - 1))
                        else setHigh(Math.max(v, low + 1))
                      }}
                      onBlur={emitChange}
                      className="w-14 text-center text-xs text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border)] rounded px-1 py-1 outline-none focus:border-[var(--text-secondary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-[var(--text-muted)]">Exact</span>
                <input
                  type="number"
                  min={MIN}
                  max={MAX}
                  value={exact}
                  onChange={(e) => setExact(Number(e.target.value))}
                  onBlur={emitChange}
                  className="w-14 text-center text-xs text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border)] rounded px-1 py-1 outline-none focus:border-[var(--text-secondary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            )}
          </div>

          {/* Slider track */}
          <div
            ref={rangeRef}
            className="relative h-[2px] bg-[var(--bg-elevated)] rounded-full mx-1 mb-3 cursor-pointer"
            onClick={(e) => {
              if (mode === 'exact') {
                setExact(getValueFromMouse(e))
                emitChange()
              }
            }}
          >
            {mode === 'range' ? (
              <div
                className="absolute h-full bg-[var(--text-secondary)] rounded-full"
                style={{ left: `${toPercent(low)}%`, right: `${100 - toPercent(high)}%` }}
              />
            ) : (
              <div
                className="absolute h-full bg-[var(--text-secondary)] rounded-full"
                style={{ left: 0, right: `${100 - toPercent(exact)}%` }}
              />
            )}

            {mode === 'range' ? (
              <>
                {(['low', 'high'] as const).map((handle) => (
                  <div
                    key={handle}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[var(--text-primary)] shadow cursor-grab active:cursor-grabbing"
                    style={{ left: `${toPercent(handle === 'low' ? low : high)}%` }}
                    onMouseDown={(e) => { e.preventDefault(); startDrag(handle) }}
                  />
                ))}
              </>
            ) : (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[var(--text-primary)] shadow cursor-grab active:cursor-grabbing"
                style={{ left: `${toPercent(exact)}%` }}
                onMouseDown={(e) => { e.preventDefault(); startDrag('exact') }}
              />
            )}
          </div>

          {/* Min/Max labels */}
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-3">
            <span>{MIN}</span>
            <span>{MAX}</span>
          </div>

          {/* Clear */}
          <button
            onClick={clear}
            className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}