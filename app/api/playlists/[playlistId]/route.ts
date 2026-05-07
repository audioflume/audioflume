import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type RouteContext = {
  params: Promise<{ playlistId: string }> | { playlistId: string }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playlistId } = await context.params
  const body = await req.json()

  const { data, error } = await supabaseServer
    .from('playlists')
    .update({
     name: body.name,
    cover_image_url: body.cover_image_url ?? null,
    })
    .eq('id', playlistId)
    .eq('clerk_user_id', userId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playlistId } = await context.params

  const { error } = await supabaseServer
    .from('playlists')
    .delete()
    .eq('id', playlistId)
    .eq('clerk_user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}