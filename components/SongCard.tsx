'use client'

import { useState, useEffect, useRef } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import Waveform from './Waveform'
import Image from 'next/image'

type Song = {
  id: string
  title: string
  artist: string
  genre: string
  bpm: number
  key: string
  duration: number
  audioUrl: string
  coverArt: string | null
  waveformPeaks: string
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
    <polygon points="5,3 19,12 5,21" />
  </svg>
)

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
)

export default function SongCard({
  song,
  isFirst = false,
  isLast = false,
}: {
  song: Song
  isFirst?: boolean
  isLast?: boolean
}) {
  const { togglePlayPause, currentSong, isPlaying } = usePlayer()
  const [isHovering, setIsHovering] = useState(false)
  const [cardWidth, setCardWidth] = useState(9999)
  const cardRef = useRef<HTMLDivElement>(null)

  const isCurrentSong = currentSong?.id === song.id
  const actuallyPlaying = isCurrentSong && isPlaying
  const displayIcon = actuallyPlaying ? <PauseIcon /> : <PlayIcon />
  const showWaveform = cardWidth > 600

  useEffect(() => {
    if (!cardRef.current) return
    const ro = new ResizeObserver(entries => {
      setCardWidth(entries[0].contentRect.width)
    })
    ro.observe(cardRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!isCurrentSong) return
    if (!cardRef.current) return
    if (isFirst) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    cardRef.current.scrollIntoView({
      behavior: 'smooth',
      block: isLast ? 'end' : 'nearest',
    })
  }, [isCurrentSong, isFirst, isLast])

  return (
    <div
  ref={cardRef}
  className="group flex w-full scroll-mt-48 scroll-mb-40 items-center gap-4 px-8 py-4 hover:bg-[var(--bg-hover)] cursor-pointer"
  style={{
    borderBottom: '1px solid var(--border-subtle)',
  }}
>
      <div
        className="relative w-10 h-10 flex-shrink-0 cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => togglePlayPause(song)}
      >
        {song.coverArt ? (
          <Image src={song.coverArt} alt={song.title} fill sizes="40px" className="object-cover rounded" />
        ) : (
          <div className="w-10 h-10 bg-[var(--bg-hover)] rounded" />
        )}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/50 rounded transition-opacity ${
            isCurrentSong ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {isCurrentSong ? displayIcon : <PlayIcon />}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col max-w-[220px]">
        <span className="text-[var(--text-primary)] text-sm font-medium truncate">{song.title}</span>
        <span className="text-[var(--text-secondary)] text-xs truncate">{song.artist}</span>
      </div>

      {showWaveform && (
        <div className="flex flex-1 items-center gap-4 min-w-0">
          <div className="flex-1 min-w-0 max-w-[500px]">
            <Waveform song={song} />
          </div>
          <span className="flex-shrink-0 text-right text-xs text-[var(--text-secondary)]">
            {formatDuration(song.duration)}
          </span>
        </div>
      )}

      <div className="ml-auto flex flex-shrink-0 items-center gap-12">
        <div className="grid grid-cols-[56px_72px] items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span className="text-right">{song.key}</span>
          <span className="text-right tabular-nums">{song.bpm} BPM</span>
        </div>

        <div className="flex items-center justify-end">
  <button className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[var(--icon-color)] transition-colors hover:bg-[rgba(255,255,255,0.18)] hover:text-[var(--text-primary)]">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  </button>

  <button className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[var(--icon-color)] transition-colors hover:bg-[rgba(255,255,255,0.18)] hover:text-[var(--text-primary)]">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  </button>

  <button className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[var(--icon-color)] transition-colors hover:bg-[rgba(255,255,255,0.18)] hover:text-[var(--text-primary)]">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  </button>
</div>
      </div>
    </div>
  )
}