"use client";

import { useState } from "react";
import ModalShell, {
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
  modalTextareaClass,
} from "@/components/ModalShell";
import LoadingSpinner from "@/components/LoadingSpinner";

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateProjectModal({
  isOpen,
  onClose,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  function clearAndClose() {
    if (isCreating) return;

    setName("");
    setDescription("");
    onClose();
  }

  function handleCreate() {
    if (!name.trim() || isCreating) return;

    setIsCreating(true);

    window.setTimeout(() => {
      setIsCreating(false);
      setName("");
      setDescription("");
      onClose();
    }, 400);
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title="New Project"
      onClose={clearAndClose}
      closeLabel="Close create project modal"
      maxHeight="520px"
      footer={
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !name.trim()}
          className={modalPrimaryButtonClass}
        >
          {isCreating ? (
            <LoadingSpinner size={18} stroke={9} color="var(--bg-primary)" />
          ) : (
            "Create"
          )}
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="project-name" className={modalFieldLabelClass}>
            Project Name
          </label>

          <input
            id="project-name"
            type="text"
            value={name}
            disabled={isCreating}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: Pacific Sunday"
            className={modalInputClass}
          />
        </div>

        <div>
          <label htmlFor="project-description" className={modalFieldLabelClass}>
            Notes
          </label>

          <textarea
            id="project-description"
            value={description}
            disabled={isCreating}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional project notes..."
            rows={4}
            className={modalTextareaClass}
          />
        </div>
      </form>
    </ModalShell>
  );
}
