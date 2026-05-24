"use client";

import { useEffect, useState } from "react";
import ModalShell from "@/components/ModalShell";
import {
  modalDeleteButtonClass,
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
  modalTextareaClass,
} from "@/components/uiClasses";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Project } from "@/lib/types";

type EditProjectModalProps = {
  isOpen: boolean;
  project: Project | null;
  name: string;
  description: string;
  isSaving: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function EditProjectModal({
  isOpen,
  project,
  name,
  description,
  isSaving,
  onNameChange,
  onDescriptionChange,
  onSave,
  onDelete,
  onClose,
}: EditProjectModalProps) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !project) return null;

  function handleSave() {
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    setError("");
    onSave();
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title="Edit Project"
      onClose={onClose}
      closeLabel="Close edit project modal"
      maxWidth="max-w-[430px]"
      maxHeight="440px"
      bodyClassName="bg-[var(--bg-tertiary)] px-5 py-5"
      footerClassName="justify-between bg-[var(--bg-tertiary)]"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving}
            className={modalDeleteButtonClass}
          >
            Delete
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className={modalPrimaryButtonClass}
          >
            {isSaving ? (
              <LoadingSpinner size={18} stroke={9} color="var(--bg-primary)" />
            ) : (
              "Save"
            )}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="edit-project-name" className={modalFieldLabelClass}>
            Project Name
          </label>

          <input
            id="edit-project-name"
            type="text"
            value={name}
            disabled={isSaving}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Example: Pacific Sunday"
            className={modalInputClass}
          />
        </div>

        <div>
          <label
            htmlFor="edit-project-description"
            className={modalFieldLabelClass}
          >
            Notes
          </label>

          <textarea
            id="edit-project-description"
            value={description}
            disabled={isSaving}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Optional project notes..."
            rows={4}
            className={modalTextareaClass}
          />
        </div>

        {error && (
          <p className="text-xs font-medium text-[var(--danger)]">{error}</p>
        )}
      </form>
    </ModalShell>
  );
}
