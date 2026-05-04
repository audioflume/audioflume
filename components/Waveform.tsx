'use client'

import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'

type Props = {
  audioUrl: string
  peaks: string
}

export default function Waveform({ audioUrl, peaks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let parsedPeaks: number[] | undefined
    try {
      parsedPeaks = peaks ? JSON.parse(peaks) : undefined
    } catch {
      parsedPeaks = undefined
    }

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255,255,255,0.3)',
      progressColor: 'rgba(255,255,255,0.9)',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 40,
      interact: true,
      url: audioUrl,
      peaks: parsedPeaks ? [parsedPeaks] : undefined,
    })

    return () => {
      wavesurferRef.current?.destroy()
    }
  }, [audioUrl, peaks])

  return <div ref={containerRef} className="flex-1" />
}