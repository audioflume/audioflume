"use client";

import { useState } from "react";
import ModalShell from "@/components/ModalShell";
import {
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
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
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function resetForm() {
    setName("");
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
            "Create Project"
          )}
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        <label htmlFor="project-name" className={modalFieldLabelClass}>
          Project name
        </label>

        <input
          id="project-name"
          type="text"
          value={name}
          disabled={isCreating}
          onChange={(e) => setName(e.target.value)}
          placeholder="Example: Pacific Sunday"
          autoFocus
          className={modalInputClass}
        />

        {error && (
          <p className="mt-3 text-xs font-medium text-[var(--danger)]">{error}</p>
        )}
      </form>
    </ModalShell>
  );
}
