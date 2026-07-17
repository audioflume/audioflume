"use client";

import DropdownShell from "@/components/DropdownShell";
import GridViewIcon from "@/components/icons/GridViewIcon";
import ListViewIcon from "@/components/icons/ListViewIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import type { ProjectFileView } from "@/lib/project-detail/projectDetailUtils";
import type { Project } from "@/lib/types";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function FolderPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7.5C4 6.67157 4.67157 6 5.5 6H9.4L11.1 8H14.8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M19.9 11.7V17.5C19.9 18.3284 19.2284 19 18.4 19H5.5C4.67157 19 4 18.3284 4 17.5V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18.2 5.4V10.2" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M15.8 7.8H20.6" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
    </svg>
  );
}

type ProjectToolbarProps = {
  fileViewMode: ProjectFileView;
  project: Project;
  projectMoreOpen: boolean;
  onCreateFolder: () => void;
  onDeleteProject: (project: Project) => void;
  onOpenEdit: () => void;
  onProjectMoreOpenChange: (open: boolean) => void;
  onToggleFileViewMode: () => void;
  onToast: (message: string) => void;
};

export default function ProjectToolbar({
  fileViewMode,
  project,
  projectMoreOpen,
  onCreateFolder,
  onDeleteProject,
  onOpenEdit,
  onProjectMoreOpenChange,
  onToggleFileViewMode,
  onToast,
}: ProjectToolbarProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("project-detail-toolbar-slot"));
  }, []);

  function closeMenu() {
    onProjectMoreOpenChange(false);
  }

  function startRename() {
    const renameEvent = new CustomEvent("filmwave:project-rename-request", {
      cancelable: true,
      detail: { projectId: project.id },
    });

    const shouldUseLegacyEdit = window.dispatchEvent(renameEvent);
    if (shouldUseLegacyEdit) onOpenEdit();
  }

  const toolbar = (
    <div className="project-toolbar-actions">
      <button
        type="button"
        className="project-toolbar-icon-button"
        onClick={onCreateFolder}
        aria-label="New folder"
        title="New folder"
      >
        <FolderPlusIcon />
      </button>

      <button
        type="button"
        className="project-toolbar-icon-button"
        aria-label={
          fileViewMode === "grid" ? "Switch to list view" : "Switch to grid view"
        }
        title={
          fileViewMode === "grid" ? "Switch to list view" : "Switch to grid view"
        }
        onClick={onToggleFileViewMode}
      >
        {fileViewMode === "grid" ? <ListViewIcon /> : <GridViewIcon />}
      </button>

      <DropdownShell
        open={projectMoreOpen}
        onOpenChange={onProjectMoreOpenChange}
        placement="bottom-end"
        offsetAmount={8}
        collisionPadding={{
          top: 72,
          right: 16,
          bottom: 88,
          left: 16,
        }}
        trigger={({ open }) => (
          <button
            type="button"
            className={`project-toolbar-icon-button ${open ? "is-active" : ""}`}
            aria-label="More project actions"
            aria-expanded={open}
            title="More"
          >
            <MoreIcon />
          </button>
        )}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            startRename();
          }}
        >
          Rename
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            onToast("Version history coming soon");
          }}
        >
          Version history
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            onToast("Archive project coming soon");
          }}
        >
          Archive project
        </button>
        <button
          type="button"
          className="danger-hover"
          role="menuitem"
          onClick={() => {
            closeMenu();
            onDeleteProject(project);
          }}
        >
          Delete project
        </button>
      </DropdownShell>
    </div>
  );

  return portalTarget ? createPortal(toolbar, portalTarget) : null;
}
