'use client'

import Logo from '@/components/Logo'
import { usePlayer } from '@/context/PlayerContext'

export default function Footer() {
  const { currentSong } = usePlayer()
  const playerVisible = !!currentSong

  return (
    <footer
      className="text-[11px] font-medium leading-none text-[var(--text-muted)]"
      style={{
        paddingBottom: playerVisible ? '80px' : '8px',
      }}
    >
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-start gap-10">
        {/* Logo */}
        <div className="flex items-start">
          <div className="w-[100px] text-[var(--text-muted)]">
            <Logo />
          </div>
        </div>

        {/* Column 1 */}
        <div className="flex min-w-[56px] translate-y-[11px] flex-col space-y-3">
          <span className="transition hover:text-[var(--text-secondary)]">Music</span>
          <span className="transition hover:text-[var(--text-secondary)]">SFX</span>
          <span className="transition hover:text-[var(--text-secondary)]">VFX</span>
          <span className="transition hover:text-[var(--text-secondary)]">Colour</span>
          <span className="transition hover:text-[var(--text-secondary)]">Curated</span>
        </div>

        {/* Column 2 */}
        <div className="flex min-w-[82px] translate-y-[11px] flex-col space-y-3">
          <span className="transition hover:text-[var(--text-secondary)]">Home</span>
          <span className="transition hover:text-[var(--text-secondary)]">Support</span>
          <span className="transition hover:text-[var(--text-secondary)]">About</span>
          <span className="transition hover:text-[var(--text-secondary)]">Partnerships</span>
          <span className="transition hover:text-[var(--text-secondary)]">Contact</span>
        </div>

        {/* Contact */}
        <div className="flex min-w-[130px] translate-y-[11px] flex-col space-y-3">
          <span>Get in Touch:</span>

          <div className="flex flex-col space-y-3">
            <span>+1 (250) 667-0766</span>
            <span>hello@filmwave.io</span>
            <span>Made in Canada</span>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center text-[10px] font-medium leading-none text-[var(--text-muted)]">
        © Copyright 2026 Filmwave. All rights reserved.
      </div>
    </footer>
  )
}