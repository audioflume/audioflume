'use client'

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

export default function SongCard({ song }: { song: Song }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-white/10 hover:bg-white/5 cursor-pointer group">
      
      {/* Cover Art + Play Button */}
      <div className="relative w-10 h-10 flex-shrink-0">
        {song.coverArt ? (
          <Image src={song.coverArt} alt={song.title} fill className="object-cover rounded" />
        ) : (
          <div className="w-10 h-10 bg-white/10 rounded" />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>

      {/* Song Info */}
      <div className="flex flex-col w-48 flex-shrink-0">
        <span className="text-white text-sm font-medium truncate">{song.title}</span>
        <span className="text-white/50 text-xs truncate">{song.artist}</span>
      </div>

      {/* Waveform */}
      <Waveform audioUrl={song.audioUrl} peaks={song.waveformPeaks} />

      {/* Meta */}
      <div className="flex items-center gap-4 text-white/50 text-xs flex-shrink-0">
        <span>{formatDuration(song.duration)}</span>
        <span>{song.key}</span>
        <span>{song.bpm} BPM</span>
      </div>

      {/* Icons */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Heart */}
        <button className="text-white/40 hover:text-white transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        {/* More */}
        <button className="text-white/40 hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>
        {/* Download */}
        <button className="text-white/40 hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>

    </div>
  )
}