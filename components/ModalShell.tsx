'use client'

import { ReactNode } from 'react'
import { usePlayer } from '@/context/PlayerContext'

export const modalTitleClass =
  'min-w-0 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]'

export const modalFieldLabelClass =
  'mb-2 block text-sm font-medium text-[var(--text-secondary)]'

export const modalInputClass =
  'h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] disabled:cursor-default disabled:opacity-70'

export const modalTextareaClass =
'w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] disabled:cursor-default disabled:opacity-70'

export const modalCoverButtonClass =
  'h-10 cursor-pointer rounded-full border border-[var(--border)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-70'

export const modalActionButtonClass =
  'flex h-10 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-medium transition disabled:cursor-default disabled:opacity-70'

export const modalCancelButtonClass =
  `${modalActionButtonClass} text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]`

export const modalPrimaryButtonClass =
  `${modalActionButtonClass} font-[family-name:var(--font-instrument-sans)] min-w-[128px] bg-[var(--text-primary)] font-semibold text-[var(--bg-primary)] hover:opacity-80`

export const modalDeleteButtonClass =
  'flex h-10 cursor-pointer items-center justify-center text-sm text-[var(--accent-2)] transition disabled:cursor-default disabled:opacity-70'
  
export const modalIconCloseButtonClass =
  'flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'

type ModalShellProps = {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
  closeLabel?: string
}

export default function ModalShell({
  isOpen,
  title,
  onClose,
  children,
  maxWidth = 'max-w-[420px]',
  closeLabel = 'Close modal',
}: ModalShellProps) {
  const { currentSong } = usePlayer()
  const playerVisible = !!currentSong

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4"
      style={{
        paddingTop: '32px',
        paddingBottom: playerVisible ? '96px' : '32px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
className={`my-auto w-full ${maxWidth} overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 shadow-2xl`}
        style={{
          maxHeight: playerVisible
            ? 'calc(100vh - 128px)'
            : 'calc(100vh - 64px)',
        }}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className={modalTitleClass}>
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className={modalIconCloseButtonClass}
            aria-label={closeLabel}
         >
             <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
            </button>
        </div>

        {children}
      </div>
    </div>
  )
}