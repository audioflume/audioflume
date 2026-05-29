'use client'

import { usePlaylistsContext } from '@/context/PlaylistsContext'

export function usePlaylists() {
  return usePlaylistsContext()
}