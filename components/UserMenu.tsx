'use client'

import Link from 'next/link'
import { useClerk, useUser } from '@clerk/nextjs'
import { useTheme } from '@/context/ThemeContext'

export default function UserMenu({ onClose }: { onClose?: () => void }) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark'
  const isLight = theme === 'light'

  return (
    <div className="w-72 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl p-6 flex flex-col gap-3">
      {/* User info 
      <div>
        <div className="text-sm font-bold text-[var(--text-primary)]">{user?.fullName}</div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">Lifetime Membership</div>
      </div>
      */}

      {/* Links */}
      <div className="flex flex-col gap-3">
        <div>
          <Link href="/account" onClick={onClose} className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors">
            Profile
          </Link>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">Profile, Settings</div>
        </div>

        <div>
          <Link href="/account" onClick={onClose} className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors">
            Account
          </Link>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">Membership, Payment, Security</div>
        </div>

        <div>
          <Link href="/support" onClick={onClose} className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors">
            Support
          </Link>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">Support, FAQs</div>
        </div>

        <button
          onClick={() => signOut()}
          className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors text-left"
        >
          Log Out
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Theme toggles */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => theme !== 'dark' && setTheme('dark')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            isDark
              ? 'bg-[var(--accent-2)] text-white'
              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--accent-2)] hover:text-white'
          }`}
          aria-label="Dark mode"
          aria-pressed={isDark}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278M4.858 1.311A7.27 7.27 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.32 7.32 0 0 0 5.205-2.162q-.506.063-1.029.063c-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => theme !== 'light' && setTheme('light')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            isLight
              ? 'bg-[var(--accent)] text-[#111111]'
              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-[#111111]'
          }`}
          aria-label="Light mode"
          aria-pressed={isLight}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708" />
          </svg>
        </button>
      </div>
    </div>
  )
}