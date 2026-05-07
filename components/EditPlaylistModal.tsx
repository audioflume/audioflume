'use client'

import { useRef } from 'react'
import ModalShell, {
  modalCancelButtonClass,
  modalCoverButtonClass,
  modalDeleteButtonClass,
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
} from '@/components/ModalShell'
import LoadingSpinner from '@/components/LoadingSpinner'

type Playlist = {
  id: number
  name: string
  cover_image_url: string | null
}

type EditPlaylistModalProps = {
  isOpen: boolean
  playlist: Playlist | null
  name: string
  coverPreview: string | null
  isSaving: boolean
  onNameChange: (value: string) => void
  onCoverPreviewChange: (value: string | null) => void
  onSave: () => void
  onDelete: () => void
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

export default function EditPlaylistModal({
  isOpen,
  playlist,
  name,
  coverPreview,
  isSaving,
  onNameChange,
  onCoverPreviewChange,
  onSave,
  onDelete,
  onClose,
}: EditPlaylistModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen || !playlist) return null

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeCoverImage() {
    if (isSaving) return

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
      title="Edit Playlist"
      onClose={isSaving ? () => {} : onClose}
      closeLabel="Close edit playlist modal"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!isSaving) onSave()
        }}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="playlist-name"
            className={modalFieldLabelClass}
          >
            Playlist Name
          </label>

          <input
            id="playlist-name"
            type="text"
            value={name}
            disabled={isSaving}
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
            disabled={isSaving}
            onClick={() => fileInputRef.current?.click()}
            className={modalCoverButtonClass}
          >
            {coverPreview ? 'Change Cover Image' : 'Add Cover Image'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={isSaving}
            className="hidden"
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
                disabled={isSaving}
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
                  if (!isSaving) fileInputRef.current?.click()
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
                if (!isSaving) fileInputRef.current?.click()
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (isSaving) return
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
            disabled={isSaving}
            onClick={onDelete}
            className={modalDeleteButtonClass}
          >
            Delete
          </button>

          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className={modalCancelButtonClass}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className={modalPrimaryButtonClass}
            >
              {isSaving ? (
                <LoadingSpinner
                  size={20}
                  stroke={9}
                  color="var(--bg-primary)"
                />
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}