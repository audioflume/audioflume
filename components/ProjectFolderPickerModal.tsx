"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ModalShell";
import { modalPrimaryButtonClass } from "@/components/uiClasses";
import { FolderGlyph } from "@/components/project-browser/ProjectBrowserGlyphs";
import type { ProjectFolder } from "@/lib/types";

type ProjectFolderPickerModalProps = {
  isOpen: boolean;
  folders: ProjectFolder[];
  initialFolderId: number | null;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (folderId: number | null) => void;
};

function sortFolders(folderA: ProjectFolder, folderB: ProjectFolder) {
  const positionA = folderA.position ?? 0;
  const positionB = folderB.position ?? 0;

  return positionA - positionB || folderA.name.localeCompare(folderB.name);
}

export default function ProjectFolderPickerModal({
  isOpen,
  folders,
  initialFolderId,
  title = "Choose Folder",
  confirmLabel = "Move Here",
  onClose,
  onConfirm,
}: ProjectFolderPickerModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(initialFolderId);

  const foldersById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  useEffect(() => {
    if (!isOpen) return;

    setSelectedFolderId(initialFolderId);
  }, [isOpen, initialFolderId]);

  const selectedChain = useMemo(() => {
    if (selectedFolderId == null) return [];

    const chain: ProjectFolder[] = [];
    const visited = new Set<number>();
    let current = foldersById.get(selectedFolderId) ?? null;

    while (current && !visited.has(current.id)) {
      chain.unshift(current);
      visited.add(current.id);
      current =
        current.parent_folder_id == null ? null : foldersById.get(current.parent_folder_id) ?? null;
    }

    return chain;
  }, [foldersById, selectedFolderId]);

  const columns = useMemo(() => {
    const parentIds = [null, ...selectedChain.map((folder) => folder.id)];
    const visibleParentIds = parentIds.length === 1 ? [null, "root-preview"] : parentIds;

    return visibleParentIds.map((parentId) => {
      if (parentId === "root-preview") {
        return {
          parentId,
          folders: [] as ProjectFolder[],
        };
      }

      return {
        parentId,
        folders: folders
          .filter((folder) => folder.parent_folder_id === parentId)
          .sort(sortFolders),
      };
    });
  }, [folders, selectedChain]);

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeLabel="Close folder picker"
      centerTitle
      maxWidth="max-w-[740px]"
      maxHeight="500px"
      bodyClassName="pb-0"
      footer={
        <button
          type="button"
          className={modalPrimaryButtonClass}
          onClick={() => onConfirm(selectedFolderId)}
        >
          {confirmLabel}
        </button>
      }
    >
      <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex min-h-[300px] max-h-[320px] overflow-x-auto">
          {columns.map((column, columnIndex) => {
            const isRootPreviewColumn = column.parentId === "root-preview";

            return (
              <div
                key={column.parentId ?? "root"}
                className="min-w-[190px] flex-1 border-r border-[var(--border)] last:border-r-0"
              >
                <div className="px-3 pb-1.5 pt-3 text-[11px] font-medium text-[var(--text-muted)]">
                  {isRootPreviewColumn
                    ? "Selected"
                    : column.parentId == null
                      ? "Root"
                      : foldersById.get(column.parentId)?.name || "Folder"}
                </div>

                <div className="grid h-[268px] gap-1 px-2 pb-2">
                  {columnIndex === 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId(null)}
                      className={`flex h-8 cursor-pointer items-center gap-2 rounded-full px-2.5 text-left text-xs transition ${
                        selectedFolderId == null
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <FolderGlyph small />
                      <span className="truncate font-medium">Root</span>
                    </button>
                  )}

                  {isRootPreviewColumn ? (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-4 text-center text-xs text-[var(--text-muted)]">
                      Root selected
                    </div>
                  ) : column.folders.length > 0 ? (
                    column.folders.map((folder) => {
                      const hasChildren = folders.some(
                        (child) => child.parent_folder_id === folder.id,
                      );
                      const isSelected = selectedFolderId === folder.id;

                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setSelectedFolderId(folder.id)}
                          className={`group flex h-8 cursor-pointer items-center justify-between gap-2 rounded-full px-2.5 text-left text-xs transition ${
                            isSelected
                              ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FolderGlyph small />
                            <span className="truncate font-medium">{folder.name}</span>
                          </span>
                          {hasChildren && <span className="text-sm opacity-60">›</span>}
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-4 text-center text-xs text-[var(--text-muted)]">
                      No folders
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
