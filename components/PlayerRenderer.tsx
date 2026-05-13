'use client'

import { usePathname } from 'next/navigation'
import MusicPlayer from '@/components/MusicPlayer'
import AdminMusicPlayer from '@/components/admin/AdminMusicPlayer'

export default function PlayerRenderer() {
  const pathname = usePathname()
  const isAdminPage = pathname.startsWith('/admin')

  return isAdminPage ? <AdminMusicPlayer /> : <MusicPlayer />
}