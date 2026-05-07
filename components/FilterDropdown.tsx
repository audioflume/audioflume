'use client'

import { useState, useRef, useEffect } from 'react'

type FilterDropdownProps = {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export default function FilterDropdown({ label, options, selected, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    )
  }

  const hasActive = selected.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 cursor-pointer ${hasActive ? 'pl-3 pr-2' : 'px-3'} py-1 rounded-md border text-xs font-medium transition-colors ${
          open
            ? 'border-[var(--border)] text-[var(--text-primary)] opacity-100'
            : 'border-[var(--border)] text-[var(--text-primary)] hover:opacity-70'
        }`}
      >
        {label}
        {hasActive && (
          <span className="w-1.75 h-1.75 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl z-50 overflow-hidden">
          <div className="max-h-[360px] overflow-y-auto py-1.5">
            {options.map((option) => {
              const isSelected = selected.includes(option)
              return (
                <button
                  key={option}
                  onClick={() => toggle(option)}
                  className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <span className={isSelected ? 'font-medium' : ''}>{option}</span>
                  <span className={`text-lg leading-none ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>+</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}