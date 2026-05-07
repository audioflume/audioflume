import { getSongs } from '@/lib/songs'
import { NextResponse } from 'next/server'

export async function GET() {
  const songs = await getSongs()
  return NextResponse.json(songs)
}