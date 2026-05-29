import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string }
}

type SongPositionUpdate = {
  song_id: string
  position: number
}

async function verifyPlaylistOwner(playlistId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from('playlists')
    .select('id')
    .eq('id', playlistId)
    .eq('clerk_user_id', userId)
    .single()

  if (error || !data) return false
  return true
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playlistId } = await context.params
  const body = await req.json()

  const songs = body.songs as SongPositionUpdate[]

  if (!Array.isArray(songs)) {
    return NextResponse.json({ error: 'Invalid songs payload' }, { status: 400 })
  }

  const isOwner = await verifyPlaylistOwner(playlistId, userId)

  if (!isOwner) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  const results = await Promise.all(
    songs.map((song) =>
      supabaseServer
        .from('playlist_songs')
        .update({ position: song.position })
        .eq('playlist_id', playlistId)
        .eq('song_id', song.song_id)
    )
  )

  const firstError = results.find((result) => result.error)?.error

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}