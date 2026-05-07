import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type PlaylistPositionUpdate = {
  id: number
  position: number
}

export async function PATCH(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const playlists = body.playlists as PlaylistPositionUpdate[]

  if (!Array.isArray(playlists)) {
    return NextResponse.json({ error: 'Invalid playlists payload' }, { status: 400 })
  }

  const results = await Promise.all(
    playlists.map((playlist) =>
      supabaseServer
        .from('playlists')
        .update({ position: playlist.position })
        .eq('id', playlist.id)
        .eq('clerk_user_id', userId)
    )
  )

  const firstError = results.find((result) => result.error)?.error

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}