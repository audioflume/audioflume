import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string }
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

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playlistId } = await context.params

  const isOwner = await verifyPlaylistOwner(playlistId, userId)

  if (!isOwner) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  const { data, error } = await supabaseServer
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request, context: RouteContext) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playlistId } = await context.params
  const body = await req.json()

  const songId = body.song_id

  if (!songId) {
    return NextResponse.json({ error: 'Missing song_id' }, { status: 400 })
  }

  const isOwner = await verifyPlaylistOwner(playlistId, userId)

  if (!isOwner) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  const { data: existingSong } = await supabaseServer
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)
    .maybeSingle()

  if (existingSong) {
    return NextResponse.json(existingSong)
  }

  const { data: lastSong, error: positionError } = await supabaseServer
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)

  if (positionError) {
    return NextResponse.json({ error: positionError.message }, { status: 500 })
  }

  const nextPosition = lastSong?.[0]?.position != null
    ? lastSong[0].position + 1
    : 0

  const { data, error } = await supabaseServer
    .from('playlist_songs')
    .insert({
      playlist_id: Number(playlistId),
      song_id: songId,
      position: body.position ?? nextPosition,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}