"use client";

import { useState } from "react";
import ModalShell from "@/components/ModalShell";
import {
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
  modalTextareaClass,
} from "@/components/uiClasses";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Project } from "@/lib/types";

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
};

export default function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function resetForm() {
    setName("");
    setDescription("");
    setError("");
  }

  function clearAndClose() {
    if (isCreating) return;

    resetForm();
    onClose();
  }

  async function handleCreate() {
    const cleanName = name.trim();

    if (!cleanName || isCreating) return;

    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          description: description.trim() || null,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create project");
      }

      onProjectCreated?.(data as Project);

      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
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

        {error && (
          <p className="text-xs font-medium text-[var(--danger)]">{error}</p>
        )}
      </form>
    </ModalShell>
  );
}
