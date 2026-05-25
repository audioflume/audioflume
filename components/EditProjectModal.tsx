"use client";

import { useEffect, useState } from "react";
import ModalShell from "@/components/ModalShell";
import {
  modalDeleteButtonClass,
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
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
  isSaving,
  onNameChange,
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
      maxHeight="320px"
      bodyClassName="px-5 py-5"
      footerClassName="justify-between"
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
      >
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

        {error && (
          <p className="mt-3 text-xs font-medium text-[var(--danger)]">{error}</p>
        )}
      </form>
    </ModalShell>
  );
}
