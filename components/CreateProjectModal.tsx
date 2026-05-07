'use client'

import ModalShell, {
  modalCancelButtonClass,
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
  modalTextareaClass,
} from '@/components/ModalShell'

type CreateProjectModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  if (!isOpen) return null

  return (
    <ModalShell
      isOpen={isOpen}
      title="Create Project"
      onClose={onClose}
      closeLabel="Close create project modal"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onClose()
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="project-name" className={modalFieldLabelClass}>
            Project Name
          </label>

          <input
            id="project-name"
            type="text"
            placeholder="Example: Pacific Sunday"
            className={modalInputClass}
          />
        </div>

        <div>
          <label htmlFor="project-description" className={modalFieldLabelClass}>
            Description
          </label>

          <textarea
            id="project-description"
            placeholder="Optional project notes..."
            rows={4}
            className={modalTextareaClass}
          />
        </div>

        <div className="flex justify-end gap-1.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={modalCancelButtonClass}
          >
            Cancel
          </button>

          <button
            type="submit"
            className={modalPrimaryButtonClass}
          >
            Create Project
          </button>
        </div>
      </form>
    </ModalShell>
  )
}