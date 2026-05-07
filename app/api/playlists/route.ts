import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseServer
    .from('playlists')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Supabase playlists fetch error:', error)

    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Missing playlist name' }, { status: 400 })
  }

  const { data: existingPlaylists, error: positionError } = await supabaseServer
    .from('playlists')
    .select('position')
    .eq('clerk_user_id', userId)
    .order('position', { ascending: false })
    .limit(1)

  if (positionError) {
    console.error('Supabase playlist position fetch error:', positionError)

    return NextResponse.json(
      {
        error: positionError.message,
        details: positionError.details,
        hint: positionError.hint,
        code: positionError.code,
      },
      { status: 500 }
    )
  }

  const nextPosition =
    existingPlaylists?.[0]?.position != null
      ? existingPlaylists[0].position + 1
      : 0

  const { data, error } = await supabaseServer
    .from('playlists')
    .insert({
      clerk_user_id: userId,
      name: body.name.trim(),
      cover_image_url: body.cover_image_url ?? null,
      position: body.position ?? nextPosition,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase playlist create error:', error)

    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}