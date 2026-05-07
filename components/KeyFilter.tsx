'use client'

import { useState, useRef, useEffect } from 'react'

type AccidentalMode = 'sharp' | 'flat'
type ScaleMode = 'major' | 'minor' | null

type KeyValue = {
  note: string
  scale: ScaleMode
} | null

type KeyFilterProps = {
  value: KeyValue
  onChange: (value: KeyValue) => void
}

const SHARP_ACCIDENTALS = ['C#', 'D#', null, 'F#', 'G#', 'A#']
const FLAT_ACCIDENTALS  = ['Db', 'Eb', null, 'Gb', 'Ab', 'Bb']
const NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export default function KeyFilter({ value, onChange }: KeyFilterProps) {
  const [open, setOpen] = useState(false)
  const [accidental, setAccidental] = useState<AccidentalMode>('sharp')
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [scaleMode, setScaleMode] = useState<ScaleMode>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectNote(note: string) {
    const next = selectedNote === note ? null : note
    setSelectedNote(next)
    onChange(next ? { note: next, scale: scaleMode } : null)
  }

  function toggleScale(mode: 'major' | 'minor') {
    const next = scaleMode === mode ? null : mode
    setScaleMode(next)
    onChange(selectedNote ? { note: selectedNote, scale: next } : null)
  }

  function clear() {
    setSelectedNote(null)
    setScaleMode(null)
    onChange(null)
  }

  const accidentals = accidental === 'sharp' ? SHARP_ACCIDENTALS : FLAT_ACCIDENTALS
  const hasActive = value !== null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 cursor-pointer py-1 rounded-md border text-xs font-medium transition-colors ${hasActive ? 'pl-3 pr-2' : 'px-3'} border-[var(--border)] text-[var(--text-primary)] hover:opacity-70`}
      >
        Key
        {hasActive && (
          <span className="w-1.75 h-1.75 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl z-50 p-4">

          {/* Sharp / Flat tabs */}
          <div className="flex mb-4 border-b border-[var(--border)]">
            {(['sharp', 'flat'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setAccidental(mode)}
                className={`flex-1 pb-2 text-sm transition-colors capitalize relative ${
                  accidental === mode ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                {accidental === mode && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--text-primary)] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Accidental row */}
          <div className="flex gap-2 mb-2">
            {accidentals.map((note, i) =>
              note === null ? (
                <div key={i} className="flex-1" />
              ) : (
                <button
                  key={note}
                  onClick={() => selectNote(note)}
                  className={`flex-1 py-2 rounded text-xs font-medium border transition-colors ${
                    selectedNote === note
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  {note}
                </button>
              )
            )}
          </div>

          {/* Natural row */}
          <div className="flex gap-2 mb-4">
            {NATURALS.map((note) => (
              <button
                key={note}
                onClick={() => selectNote(note)}
                className={`flex-1 py-2 rounded text-xs font-medium border transition-colors ${
                  selectedNote === note
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                    : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                }`}
              >
                {note}
              </button>
            ))}
          </div>

          {/* Major / Minor */}
          <div className="flex gap-2 mb-4">
            {(['major', 'minor'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => toggleScale(mode)}
                className={`flex-1 py-2 rounded text-sm font-medium border transition-colors capitalize ${
                  scaleMode === mode
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                    : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
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