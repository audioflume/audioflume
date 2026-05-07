'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Logo from '@/components/Logo'
import UserMenu from '@/components/UserMenu'

export default function Header() {
  const { user } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : ''

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--bg-primary)] border-b border-[var(--border)] flex items-center px-6 justify-between">
      <Link href="/music" className="flex items-center">
        <Logo className="h-[22px] w-auto text-[var(--text-primary)]" />
      </Link>

      <div className="flex items-center gap-4 relative" ref={menuRef}>
        <Link href="/dashboard" className="text-[12px] font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors leading-none">
          Dashboard
        </Link>

        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="flex items-center gap-2 group"
        >
          <span className="text-[12px] font-medium text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors leading-none">{user?.fullName}</span>
          <div className="w-7 h-7 rounded-full bg-[var(--accent-2)] flex items-center justify-center text-white text-[10px] font-semibold">            {initials}
          </div>
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 mt-2">
            <UserMenu onClose={() => setMenuOpen(false)} />
          </div>
        )}
      </div>
    </header>
  )
}