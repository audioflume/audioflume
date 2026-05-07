'use client'

import { useEffect, useRef } from 'react'
import { usePlayer } from '@/context/PlayerContext'

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

function drawWaveform(canvas: HTMLCanvasElement, peaks: number[], progress: number) {
  const container = canvas.parentElement
  if (!container) return

  const dpr = window.devicePixelRatio || 1
  const w = container.clientWidth
  const h = container.clientHeight || 40

  if (w < 10) return

  canvas.width = w * dpr
  canvas.height = h * dpr

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const barWidth = 2
  const barGap = 1
  const barTotal = barWidth + barGap
  const barCount = Math.max(1, Math.floor(w / barTotal))
  const midY = h / 2

  let maxVal = 0
  for (let i = 0; i < peaks.length; i++) {
    const v = Math.abs(peaks[i])
    if (v > maxVal) maxVal = v
  }

  const scale = maxVal > 0 ? 1 / maxVal : 1
  const samplesPerBar = Math.max(1, Math.ceil(peaks.length / barCount))
  const progressBars = Math.floor(barCount * Math.max(0, Math.min(1, progress)))

  const progressColor = getComputedStyle(document.documentElement).getPropertyValue('--waveform-progress').trim()
  const inactiveColor = getComputedStyle(document.documentElement).getPropertyValue('--waveform-color').trim()

  for (let i = 0; i < barCount; i++) {
    const start = i * samplesPerBar
    const end = Math.min(peaks.length, start + samplesPerBar)

    let barPeak = 0
    for (let j = start; j < end; j++) {
      const v = Math.abs(peaks[j])
      if (v > barPeak) barPeak = v
    }

    const peak = barPeak * scale
    const maxBarH = h * 0.85
    const barH = Math.max(2, Math.min(maxBarH, peak * maxBarH))
    const x = i * barTotal

    ctx.fillStyle = i < progressBars ? progressColor : inactiveColor
    ctx.fillRect(x, midY - barH / 2, barWidth, barH)
  }
}

export default function Waveform({ song }: { song: Song }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const peaksRef = useRef<number[]>([])

  const { registerWaveform, unregisterWaveform, seekTo: contextSeekTo, isPlaying, currentSong } = usePlayer()

  const isPlayingRef = useRef(isPlaying)
  const currentSongIdRef = useRef<string | null>(currentSong?.id ?? null)

  useEffect(() => {
    isPlayingRef.current = isPlaying
    currentSongIdRef.current = currentSong?.id ?? null
  }, [isPlaying, currentSong?.id])

  useEffect(() => {
    try {
      const parsed = JSON.parse(song.waveformPeaks)
      peaksRef.current = Array.isArray(parsed) ? parsed : []
    } catch {
      peaksRef.current = []
    }
    if (canvasRef.current) drawWaveform(canvasRef.current, peaksRef.current, 0)
  }, [song.waveformPeaks])

  useEffect(() => {
    registerWaveform(song.id, {
      seekTo: (progress: number) => {
        progressRef.current = progress
        if (canvasRef.current) drawWaveform(canvasRef.current, peaksRef.current, progress)
      },
    })
    return () => unregisterWaveform(song.id)
  }, [song.id, registerWaveform, unregisterWaveform])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      if (canvasRef.current) drawWaveform(canvasRef.current, peaksRef.current, progressRef.current)
    })
    ro.observe(container)

    const observer = new MutationObserver(() => {
      if (canvasRef.current) drawWaveform(canvasRef.current, peaksRef.current, progressRef.current)
    })
    observer.observe(document.documentElement, { attributeFilter: ['class'] })

    return () => {
      ro.disconnect()
      observer.disconnect()
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    progressRef.current = progress
    if (canvasRef.current) drawWaveform(canvasRef.current, peaksRef.current, progress)
    contextSeekTo(song, progress, isPlayingRef.current)
  }

  return (
    <div ref={containerRef} className="flex-1 cursor-pointer h-6" onPointerDown={handlePointerDown}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}