import { currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_EMAILS } from '@/lib/adminEmails'

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser()
    const email = user?.primaryEmailAddress?.emailAddress

    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json(
        { error: 'Unauthorized audio proxy request.' },
        { status: 401 }
      )
    }

    const url = req.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'Missing audio URL.' },
        { status: 400 }
      )
    }

    let parsedUrl: URL

    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid audio URL.' },
        { status: 400 }
      )
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Invalid audio URL protocol.' },
        { status: 400 }
      )
    }

    const audioRes = await fetch(parsedUrl.toString(), {
      cache: 'no-store',
    })

    if (!audioRes.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch source audio. Status ${audioRes.status}.`,
        },
        { status: audioRes.status }
      )
    }

    const arrayBuffer = await audioRes.arrayBuffer()
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg'

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Audio proxy failed: ${err.message}`
            : 'Audio proxy failed.',
      },
      { status: 500 }
    )
  }
}