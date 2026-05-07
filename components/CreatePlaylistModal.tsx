'use client'

import { useRef } from 'react'
import ModalShell, {
  modalCancelButtonClass,
  modalCoverButtonClass,
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
} from '@/components/ModalShell'
import LoadingSpinner from '@/components/LoadingSpinner'

type CreatePlaylistModalProps = {
  isOpen: boolean
  name: string
  coverPreview: string | null
  isCreating: boolean
  onNameChange: (value: string) => void
  onCoverPreviewChange: (value: string | null) => void
  onCreate: () => void
  onClose: () => void
}

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export default function CreatePlaylistModal({
  isOpen,
  name,
  coverPreview,
  isCreating,
  onNameChange,
  onCoverPreviewChange,
  onCreate,
  onClose,
}: CreatePlaylistModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function clearFormAndClose() {
    if (isCreating) return

    onNameChange('')
    onCoverPreviewChange(null)
    clearFileInput()
    onClose()
  }

  function removeCoverImage() {
    if (isCreating) return

    onCoverPreviewChange(null)
    clearFileInput()
  }

  function handleCoverChange(file: File) {
    const reader = new FileReader()

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        onCoverPreviewChange(reader.result)
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title="New Playlist"
      onClose={clearFormAndClose}
      closeLabel="Close new playlist modal"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!isCreating) onCreate()
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="playlist-name" className={modalFieldLabelClass}>
            Playlist Name
          </label>

          <input
            id="playlist-name"
            type="text"
            value={name}
            disabled={isCreating}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Example: Cinematic Favorites"
            className={modalInputClass}
          />
        </div>

        <div>
          <div className={modalFieldLabelClass}>
            Cover Image
          </div>

          <button
            type="button"
            disabled={isCreating}
            onClick={() => fileInputRef.current?.click()}
            className={modalCoverButtonClass}
          >
            Add cover image
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isCreating}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              handleCoverChange(file)
            }}
          />

          {coverPreview ? (
            <div className="relative mt-4 aspect-square w-24 overflow-visible">
              <button
                type="button"
                disabled={isCreating}
                onClick={(e) => {
                  e.stopPropagation()
                  removeCoverImage()
                }}
                className="absolute right-1 top-1 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-[14px] font-medium leading-none text-white transition hover:bg-black/90 disabled:cursor-default disabled:opacity-70"
                aria-label="Remove cover image"
              >
                ×
              </button>

              <div
                onClick={() => {
                  if (!isCreating) fileInputRef.current?.click()
                }}
                className="h-full w-full cursor-pointer overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]"
              >
                <img
                  src={coverPreview}
                  alt="Playlist cover preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                if (!isCreating) fileInputRef.current?.click()
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (isCreating) return
                const file = e.dataTransfer.files?.[0]
                if (!file) return
                handleCoverChange(file)
              }}
              onDragOver={(e) => e.preventDefault()}
              className="relative mt-4 flex h-24 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)]"
            >
              <span className="text-[var(--text-muted)]">
                <UploadIcon />
              </span>

              <span className="text-[13px] text-[var(--text-muted)]">
                Drop image here
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={isCreating}
            className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-70"
          >
            Unsplash
            <SearchIcon />
          </button>

          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={isCreating}
              onClick={clearFormAndClose}
              className={modalCancelButtonClass}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCreating}
              className={modalPrimaryButtonClass}
            >
              {isCreating ? (
                <LoadingSpinner
                  size={20}
                  stroke={9}
                  color="var(--bg-primary)"
                />
              ) : (
                'Create'
              )}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}