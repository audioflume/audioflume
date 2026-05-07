import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type RouteContext = {
  params:
    | Promise<{ playlistId: string; songId: string }>
    | { playlistId: string; songId: string }
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

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playlistId, songId } = await context.params

  const isOwner = await verifyPlaylistOwner(playlistId, userId)

  if (!isOwner) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  const { error } = await supabaseServer
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}