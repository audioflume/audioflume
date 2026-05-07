'use client'

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react'

type Song = {
  id: string
  title: string
  artist: string
  audioUrl: string
  coverArt: string | null
  waveformPeaks: string
  duration: number
  key: string
  bpm: number
}

type WaveformHandle = {
  seekTo: (progress: number) => void
}

type PlayerContextType = {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  togglePlayPause: (song: Song) => void
  seekTo: (song: Song, progress: number, shouldPlay: boolean) => void
  registerWaveform: (songId: string, handle: WaveformHandle) => void
  unregisterWaveform: (songId: string) => void
  setQueue: (songs: Song[]) => void
  navigateTrack: (direction: 'prev' | 'next') => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformsRef = useRef<Map<string, WaveformHandle>>(new Map())
  const currentSongRef = useRef<Song | null>(null)
  const queueRef = useRef<Song[]>([])
  const navigateTrackRef = useRef<
    (direction: 'prev' | 'next', forcePlay?: boolean) => void
  >(() => {})

  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  function getAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const audio = new Audio()

      audio.addEventListener('play', () => setIsPlaying(true))

      audio.addEventListener('pause', () => setIsPlaying(false))

      audio.addEventListener('ended', () => {
        const currentId = currentSongRef.current?.id

        if (currentId) {
          waveformsRef.current.get(currentId)?.seekTo(0)
        }

        setCurrentTime(0)
        setIsPlaying(false)

        navigateTrackRef.current('next', true)
      })

      audio.addEventListener('timeupdate', () => {
        if (!audio.duration || !isFinite(audio.duration)) return

        const progress = audio.currentTime / audio.duration
        const id = currentSongRef.current?.id

        if (id) {
          waveformsRef.current.get(id)?.seekTo(progress)
        }

        setCurrentTime(audio.currentTime)
        setDuration(audio.duration)
      })

      audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration)) {
          setDuration(audio.duration)
        }
      })

      audioRef.current = audio
    }

    return audioRef.current
  }

  const playSongDirectly = useCallback((song: Song, shouldPlay?: boolean) => {
    const audio = getAudio()
    const wasPlaying = shouldPlay !== undefined ? shouldPlay : !audio.paused

    if (currentSongRef.current) {
      waveformsRef.current.get(currentSongRef.current.id)?.seekTo(0)
    }

    audio.src = song.audioUrl
    audio.currentTime = 0

    currentSongRef.current = song
    setCurrentSong(song)
    setCurrentTime(0)
    setDuration(song.duration || 0)

    if (wasPlaying) {
      audio.play().catch(console.error)
    }
  }, [])

  const togglePlayPause = useCallback(
    (song: Song) => {
      const audio = getAudio()

      if (currentSongRef.current?.id === song.id) {
        if (audio.paused) {
          audio.play().catch(console.error)
        } else {
          audio.pause()
        }
      } else {
        playSongDirectly(song, true)
      }
    },
    [playSongDirectly]
  )

  const seekTo = useCallback(
    (song: Song, progress: number, shouldPlay: boolean) => {
      const audio = getAudio()

      const safeProgress = Number.isFinite(progress)
        ? Math.max(0, Math.min(1, progress))
        : 0

      if (currentSongRef.current?.id !== song.id) {
        if (currentSongRef.current) {
          waveformsRef.current.get(currentSongRef.current.id)?.seekTo(0)
        }

        audio.src = song.audioUrl
        currentSongRef.current = song
        setCurrentSong(song)
        setDuration(song.duration || 0)
      }

      const applySeek = () => {
        if (!audio.duration || !isFinite(audio.duration)) return

        audio.currentTime = safeProgress * audio.duration
        setCurrentTime(audio.currentTime)

        if (shouldPlay) {
          audio.play().catch(console.error)
        }
      }

      if (audio.duration && isFinite(audio.duration)) {
        applySeek()
      } else {
        audio.addEventListener('loadedmetadata', applySeek, { once: true })
      }
    },
    []
  )

  const registerWaveform = useCallback(
    (songId: string, handle: WaveformHandle) => {
      waveformsRef.current.set(songId, handle)
    },
    []
  )

  const unregisterWaveform = useCallback((songId: string) => {
    waveformsRef.current.delete(songId)
  }, [])

  const setQueue = useCallback((songs: Song[]) => {
    queueRef.current = songs
  }, [])

  const navigateTrack = useCallback(
    (direction: 'prev' | 'next', forcePlay = false) => {
      const queue = queueRef.current
      const current = currentSongRef.current

      if (!queue.length || !current) return

      const idx = queue.findIndex((song) => song.id === current.id)
      if (idx === -1) return

      const nextIdx = direction === 'next' ? idx + 1 : idx - 1

      if (nextIdx < 0 || nextIdx >= queue.length) {
        setIsPlaying(false)
        return
      }

      const shouldPlay = forcePlay || !audioRef.current?.paused

      playSongDirectly(queue[nextIdx], shouldPlay)
    },
    [playSongDirectly]
  )

  navigateTrackRef.current = navigateTrack

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName

      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()

        const audio = getAudio()

        if (currentSongRef.current) {
          if (audio.paused) {
            audio.play().catch(console.error)
          } else {
            audio.pause()
          }
        }
      }

      if (e.code === 'ArrowDown') {
        e.preventDefault()
        navigateTrackRef.current('next')
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault()
        navigateTrackRef.current('prev')
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        togglePlayPause,
        seekTo,
        registerWaveform,
        unregisterWaveform,
        setQueue,
        navigateTrack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)

  if (!ctx) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }

  return ctx
}