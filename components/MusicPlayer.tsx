'use client'

import { usePlayer } from '@/context/PlayerContext'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'

const WAVEFORM_HIDE_WIDTH = 80
const BAR_WIDTH = 2
const BAR_GAP = 1
const BAR_TOTAL = BAR_WIDTH + BAR_GAP

function formatTime(s: number) {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function normalizePeaks(peaks: number[]) {
  let maxVal = 0
  for (let i = 0; i < peaks.length; i++) {
    const v = Math.abs(Number(peaks[i]) || 0)
    if (v > maxVal) maxVal = v
  }
  if (maxVal <= 0) return peaks.map(() => 0)
  return peaks.map((peak) => Math.abs(Number(peak) || 0) / maxVal)
}

function buildWaveformBars(peaks: number[], width: number) {
  if (!peaks.length || width <= 0) return []
  const barCount = Math.max(1, Math.floor(width / BAR_TOTAL))
  const normalizedPeaks = normalizePeaks(peaks)
  const samplesPerBar = normalizedPeaks.length / barCount
  return Array.from({ length: barCount }, (_, i) => {
    const start = Math.floor(i * samplesPerBar)
    const end = Math.min(normalizedPeaks.length, Math.floor((i + 1) * samplesPerBar))
    let barPeak = 0
    for (let j = start; j < end; j++) {
      if (normalizedPeaks[j] > barPeak) barPeak = normalizedPeaks[j]
    }
    return Math.max(2, Math.min(20, barPeak * 20))
  })
}

const PrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="19,20 9,12 19,4" />
    <rect x="5" y="4" width="2" height="16" />
  </svg>
)

const NextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,4 15,12 5,20" />
    <rect x="17" y="4" width="2" height="16" />
  </svg>
)

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
)

const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
)

export default function MusicPlayer() {
  const { currentSong, isPlaying, currentTime, duration, togglePlayPause, navigateTrack, seekTo } = usePlayer()

  const containerRef = useRef<HTMLDivElement>(null)
  const [peaks, setPeaks] = useState<number[]>([])
  const [waveformWidth, setWaveformWidth] = useState(0)

  const progress = duration > 0 && isFinite(duration)
    ? Math.max(0, Math.min(1, currentTime / duration))
    : 0

  const isWaveformCompact = waveformWidth <= WAVEFORM_HIDE_WIDTH
  const waveformBars = useMemo(() => buildWaveformBars(peaks, waveformWidth), [peaks, waveformWidth])

  useEffect(() => {
    if (!currentSong) { setPeaks([]); return }
    try {
      const parsed = JSON.parse(currentSong.waveformPeaks)
      setPeaks(Array.isArray(parsed) ? parsed.map((v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }) : [])
    } catch { setPeaks([]) }
  }, [currentSong?.id])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateWidth = () => setWaveformWidth(Math.floor(container.getBoundingClientRect().width))
    updateWidth()
    const ro = new ResizeObserver(updateWidth)
    ro.observe(container)
    window.addEventListener('resize', updateWidth)
    const t1 = window.setTimeout(updateWidth, 0)
    const t2 = window.setTimeout(updateWidth, 100)
    const t3 = window.setTimeout(updateWidth, 300)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateWidth)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [currentSong?.id])

  if (!currentSong) return null

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isWaveformCompact) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const nextProgress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(currentSong, nextProgress, isPlaying)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-[72px] items-center border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4">
      {/* Left - Cover + Info */}
      <div className="flex w-[clamp(185px,22vw,320px)] flex-shrink-0 items-center gap-3">
        {currentSong.coverArt ? (
          <div className="relative h-10 w-10 flex-shrink-0">
            <Image src={currentSong.coverArt} alt={currentSong.title} fill sizes="40px" className="rounded object-cover" />
          </div>
        ) : (
          <div className="h-10 w-10 flex-shrink-0 rounded bg-[var(--bg-hover)]" />
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[var(--text-primary)]">{currentSong.title}</div>
          <div className="truncate text-xs text-[var(--text-secondary)]">{currentSong.artist}</div>
        </div>
      </div>

      {/* Center - Controls + Waveform */}
      <div className="ml-[clamp(12px,2vw,24px)] mr-[40px] flex min-w-0 flex-1 items-center justify-center gap-[clamp(12px,2vw,24px)]">
        <button onClick={() => navigateTrack('prev')} className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]">
          <PrevIcon />
        </button>

        <button onClick={() => togglePlayPause(currentSong)} className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]">
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button onClick={() => navigateTrack('next')} className="flex-shrink-0 cursor-pointer text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]">
          <NextIcon />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex h-[24px] w-[86px] flex-shrink-0 items-center justify-center whitespace-nowrap text-xs text-[var(--icon-color)] min-[791px]:hidden">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-4 min-[791px]:flex">
            <span className={`${isWaveformCompact ? 'invisible' : ''} w-10 flex-shrink-0 text-right text-xs text-[var(--icon-color)]`}>
              {formatTime(currentTime)}
            </span>

            <div
              ref={containerRef}
              data-player-waveform-slot
              className="relative flex h-[24px] min-w-0 max-w-[500px] flex-1 cursor-pointer items-center"
              onClick={handleWaveformClick}
            >
              {!isWaveformCompact && (
                <div className="flex h-full w-full items-center">
                  {waveformBars.map((barHeight, index) => {
                    const barProgress = waveformBars.length > 0 ? index / waveformBars.length : 0
                    const isActive = barProgress <= progress
                    return (
                      <div
                        key={index}
                        className="flex-shrink-0 rounded-full"
                        style={{
                          width: `${BAR_WIDTH}px`,
                          height: `${barHeight}px`,
                          marginRight: `${BAR_GAP}px`,
                          backgroundColor: isActive ? 'var(--waveform-progress)' : 'var(--waveform-color)',
                        }}
                      />
                    )
                  })}
                </div>
              )}

              {isWaveformCompact && (
                <div className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-xs text-[var(--icon-color)]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              )}
            </div>

            <span className={`${isWaveformCompact ? 'invisible' : ''} w-10 flex-shrink-0 text-xs text-[var(--icon-color)]`}>
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Right - Meta + Actions */}
      <div className="ml-auto flex flex-shrink-0 -translate-x-4 items-center">
        <div className="mr-[clamp(24px,5vw,48px)] flex items-center gap-[clamp(24px,5vw,40px)] text-xs text-[var(--text-secondary)] max-[600px]:hidden">
          <span>{currentSong.key}</span>
          <span className="max-[645px]:hidden">{currentSong.bpm} BPM</span>
        </div>

        <div className="ml-auto flex flex-shrink-0 items-center justify-end gap-0">
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

          {currentSong.audioUrl && (
            <a
              href={currentSong.audioUrl}
              download
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[var(--icon-color)] transition-colors hover:bg-[rgba(255,255,255,0.18)] hover:text-[var(--text-primary)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}