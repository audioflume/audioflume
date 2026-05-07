'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

type Playlist = {
  id: number
  name: string
}

type PlaylistFilterProps = {
  selected: { id: number; name: string } | null
  onChange: (selected: { id: number; name: string } | null) => void
}

export default function PlaylistFilter({ selected, onChange }: PlaylistFilterProps) {
  const [open, setOpen] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { userId } = useAuth()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open || !userId || playlists.length > 0) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('playlists')
        .select('id, name')
        .eq('clerk_user_id', userId!)
        .order('name')
      setPlaylists(data ?? [])
      setLoading(false)
    }
    load()
  }, [open, userId, playlists.length])

  function toggle(id: number, name: string) {
    onChange(selected?.id === id ? null : { id, name })
  }

  const hasActive = selected !== null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 cursor-pointer py-1 rounded-md border text-xs font-medium transition-colors ${hasActive ? 'pl-3 pr-2' : 'px-3'} border-[var(--border)] text-[var(--text-primary)] hover:opacity-70`}
      >
        Playlists
        {hasActive && (
          <span className="w-1.75 h-1.75 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl z-50 overflow-hidden">
          <div className="max-h-[360px] overflow-y-auto py-1.5">
            {loading ? (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)]">Loading...</div>
            ) : playlists.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)]">No playlists found</div>
            ) : (
              playlists.map((playlist) => {
                const isSelected = selected?.id === playlist.id
                return (
                  <button
                    key={playlist.id}
                    onClick={() => toggle(playlist.id, playlist.name)}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <span className={isSelected ? 'font-medium' : ''}>{playlist.name}</span>
                    <span className={`text-lg leading-none ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>+</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}